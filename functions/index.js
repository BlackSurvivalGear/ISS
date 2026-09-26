const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const PROTECTED_EMAIL = "admin@lawal.org";

async function removeCollection(db, query) {
  let count = 0;
  while (true) {
    const snap = await query.limit(400).get();
    if (snap.empty) return count;
    const batch = db.batch();
    snap.docs.forEach((item) => batch.delete(item.ref));
    await batch.commit();
    count += snap.size;
  }
}

async function removeCompany(db, companyRef) {
  let count = 0;
  const children = await companyRef.listCollections();
  for (const child of children) count += await removeCollection(db, child);
  await companyRef.delete();
  return count + 1;
}

exports.purgeAllTestData = onCall(
  { region: "europe-west2", timeoutSeconds: 540, memory: "512MiB" },
  async (request) => {
    const callerEmail = String(request.auth?.token?.email || "").toLowerCase();
    if (!request.auth || callerEmail !== PROTECTED_EMAIL) {
      throw new HttpsError("permission-denied", "Superadmin only.");
    }
    if (request.data?.confirmation !== "PURGE ALL") {
      throw new HttpsError("failed-precondition", "Exact PURGE ALL confirmation required.");
    }

    const db = getFirestore();
    const auth = getAuth();
    let companiesDeleted = 0;
    let firestoreDocumentsDeleted = 0;
    let authUsersDeleted = 0;

    const companies = await db.collection("companies").get();
    for (const company of companies.docs) {
      firestoreDocumentsDeleted += await removeCompany(db, company.ref);
      companiesDeleted += 1;
    }

    for (const collectionName of ["users", "workspaceSlugs"]) {
      const snap = await db.collection(collectionName).get();
      for (let offset = 0; offset < snap.docs.length; offset += 400) {
        const batch = db.batch();
        let batchCount = 0;
        snap.docs.slice(offset, offset + 400).forEach((item) => {
          const itemEmail = String(item.data().email || "").toLowerCase();
          if (collectionName === "users" && itemEmail === PROTECTED_EMAIL) return;
          batch.delete(item.ref);
          batchCount += 1;
        });
        if (batchCount) {
          await batch.commit();
          firestoreDocumentsDeleted += batchCount;
        }
      }
    }

    let pageToken;
    do {
      const page = await auth.listUsers(1000, pageToken);
      const ids = page.users
        .filter((user) => String(user.email || "").toLowerCase() !== PROTECTED_EMAIL)
        .map((user) => user.uid);
      if (ids.length) {
        const result = await auth.deleteUsers(ids);
        authUsersDeleted += result.successCount;
        if (result.failureCount) {
          throw new HttpsError("internal", "Some Authentication accounts could not be deleted.");
        }
      }
      pageToken = page.pageToken;
    } while (pageToken);

    return {
      protectedEmail: PROTECTED_EMAIL,
      companiesDeleted,
      firestoreDocumentsDeleted,
      authUsersDeleted
    };
  }
);
