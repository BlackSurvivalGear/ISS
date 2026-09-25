// ISS backend foundation: Firebase Authentication + Firestore tenant persistence.
// Supply the project's public Firebase web configuration in firebase-config.js.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, doc, getDoc, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app=initializeApp(firebaseConfig);
export const auth=getAuth(app);
export const db=getFirestore(app);

const cleanSlug=value=>String(value||"").toLowerCase().trim().replace(/[^a-z0-9-]/g,"").replace(/^-+|-+$/g,"");
const reserved=new Set(["www","admin","api","app","support","mail","status","login","signin","signup"]);

export async function registerCompany({account,company,workspace,site,invites,operations}){
  const slug=cleanSlug(workspace.slug);
  if(!slug||reserved.has(slug)) throw new Error("Choose an available workspace address.");
  const slugRef=doc(db,"workspaceSlugs",slug);
  if((await getDoc(slugRef)).exists()) throw new Error("That workspace address is already in use.");
  const credential=await createUserWithEmailAndPassword(auth,account.email,account.password);
  const uid=credential.user.uid;
  const companyRef=doc(db,"companies",uid);
  const batch=writeBatch(db);
  batch.set(companyRef,{name:company.name,tradingName:company.tradingName||"",country:company.country||"",phone:company.phone||"",email:company.email||account.email,website:company.website||"",registrationNumber:company.registrationNumber||"",workspaceSlug:slug,ownerUid:uid,createdAt:serverTimestamp()});
  batch.set(slugRef,{companyId:uid,createdAt:serverTimestamp()});
  batch.set(doc(db,"users",uid),{companyId:uid,firstName:account.firstName,lastName:account.lastName,email:account.email,role:account.role||"Company Owner",status:"active",createdAt:serverTimestamp()});
  if(site?.name) batch.set(doc(db,"companies",uid,"sites","first-site"),{name:site.name,clientName:site.clientName||"",address:site.address||"",timezone:site.timezone||"",contact:site.contact||"",status:"setup",createdAt:serverTimestamp()});
  (invites||[]).forEach((invite,index)=>batch.set(doc(db,"companies",uid,"invitations",String(index+1)),{...invite,status:"pending",createdAt:serverTimestamp()}));
  batch.set(doc(db,"companies",uid,"settings","operations"),{...operations,updatedAt:serverTimestamp()});
  await batch.commit();
  return {uid,companyId:uid,workspaceSlug:slug};
}
export const signIn=(email,password)=>signInWithEmailAndPassword(auth,email,password);
export const signOutUser=()=>signOut(auth);
export const observeAuth=callback=>onAuthStateChanged(auth,callback);
