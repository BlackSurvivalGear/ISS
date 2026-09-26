// ISS data backend: Firestore tenant persistence.
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { app, auth } from "./firebase-core.js";

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

export async function updateUserProfile(uid,{firstName,lastName}){
  await updateDoc(doc(db,"users",uid),{firstName:String(firstName||"").trim(),lastName:String(lastName||"").trim(),updatedAt:serverTimestamp()});
}

export async function getDashboardData(uid){
  const userSnap=await getDoc(doc(db,"users",uid));
  if(!userSnap.exists()) return null;
  const companyId=userSnap.data().companyId;
  const [companySnap,sitesSnap,invitesSnap]=await Promise.all([
    getDoc(doc(db,"companies",companyId)),
    getDocs(collection(db,"companies",companyId,"sites")),
    getDocs(collection(db,"companies",companyId,"invitations"))
  ]);
  if(!companySnap.exists()) return null;
  const company=companySnap.data();
  const user=userSnap.data();
  return {companyId,companyName:company.name||"Company Dashboard",workspaceSlug:company.workspaceSlug||"",siteCount:sitesSnap.size,teamCount:invitesSnap.size,role:user.role||"Officer",siteId:user.siteId||"company-wide",siteName:user.siteName||"Company-wide",firstName:user.firstName||"",lastName:user.lastName||"",email:user.email||""};
}

export async function getPlatformOverview(){
  const [companiesSnap,usersSnap]=await Promise.all([
    getDocs(collection(db,"companies")),
    getDocs(collection(db,"users"))
  ]);
  const users=usersSnap.docs.map(item=>({id:item.id,...item.data()}));
  const companies=await Promise.all(companiesSnap.docs.map(async item=>{
    const company=item.data();
    const [sitesSnap,invitesSnap]=await Promise.all([
      getDocs(collection(db,"companies",item.id,"sites")),
      getDocs(collection(db,"companies",item.id,"invitations"))
    ]);
    const members=users.filter(user=>user.companyId===item.id);
    const invites=invitesSnap.docs.map(invite=>invite.data());
    return {
      id:item.id,
      name:company.name||"Unnamed company",
      tradingName:company.tradingName||"",
      workspaceSlug:company.workspaceSlug||"",
      country:company.country||"",
      email:company.email||"",
      phone:company.phone||"",
      website:company.website||"",
      registrationNumber:company.registrationNumber||"",
      status:company.status||"active",
      createdAt:company.createdAt?.toDate?.()?.toISOString?.()||"",
      siteCount:sitesSnap.size,
      employeeCount:members.length,
      activeUsers:members.filter(user=>user.status==="active").length,
      suspendedUsers:members.filter(user=>user.status==="suspended").length,
      pendingInvites:invites.filter(invite=>invite.status==="pending").length,
      suspendedInvites:invites.filter(invite=>invite.status==="suspended").length
    };
  }));
  const now=Date.now(),week=7*24*60*60*1000;
  const alerts=[];
  companies.forEach(company=>{
    if(company.createdAt&&now-new Date(company.createdAt).getTime()<=week) alerts.push({type:"New Company",company:company.name,detail:"Registered within the last 7 days"});
    if(company.siteCount===0||company.activeUsers===0) alerts.push({type:"Incomplete Setup",company:company.name,detail:company.siteCount===0?"No sites configured":"No active team accounts"});
    if(company.pendingInvites>0) alerts.push({type:"Pending Invitations",company:company.name,detail:company.pendingInvites+" pending"});
    const suspended=company.suspendedUsers+company.suspendedInvites;
    if(suspended>0) alerts.push({type:"Suspended Accounts",company:company.name,detail:suspended+" suspended"});
  });
  return {
    companies,
    users:users.map(user=>{
      const company=companies.find(item=>item.id===user.companyId);
      return {
        id:user.id,
        name:[user.firstName,user.lastName].filter(Boolean).join(" ")||user.email||"User",
        email:user.email||"",
        role:user.role||"Officer",
        status:user.status||"active",
        siteName:user.siteName||"Company-wide",
        companyId:user.companyId||"",
        companyName:company?.name||"Unknown company"
      };
    }),
    alerts,
    totals:{
      companies:companies.length,
      sites:companies.reduce((sum,item)=>sum+item.siteCount,0),
      employees:companies.reduce((sum,item)=>sum+item.employeeCount,0),
      alerts:alerts.length
    }
  };
}

export async function listShifts(companyId){
  const snap=await getDocs(collection(db,"companies",companyId,"shifts"));
  return snap.docs.map(item=>({id:item.id,...item.data()}));
}
export async function createShift(companyId,shift){
  return (await addDoc(collection(db,"companies",companyId,"shifts"),{siteId:shift.siteId,siteName:shift.siteName||"",date:shift.date,startTime:shift.startTime,endTime:shift.endTime,positions:Number(shift.positions)||1,requiredRole:shift.requiredRole||"Officer",notes:shift.notes||"",assignments:[],status:"open",createdBy:auth.currentUser.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()})).id;
}
export async function deleteShift(companyId,shiftId){
  await deleteDoc(doc(db,"companies",companyId,"shifts",shiftId));
}
export async function updateShift(companyId,shiftId,changes){
  const ref=doc(db,"companies",companyId,"shifts",shiftId),snap=await getDoc(ref);
  if(!snap.exists()) throw new Error("Shift not found.");
  const current=snap.data(),assignments=Array.isArray(changes.assignments)?changes.assignments:(current.assignments||[]);
  const positions=Number(changes.positions)||1;
  if(assignments.length>positions) throw new Error("Positions cannot be lower than the number of assigned officers.");
  await updateDoc(ref,{siteId:changes.siteId,siteName:changes.siteName||"",date:changes.date,startTime:changes.startTime,endTime:changes.endTime,positions,requiredRole:changes.requiredRole||"Officer",notes:changes.notes||"",assignments,status:assignments.length>=positions?"filled":"open",updatedAt:serverTimestamp()});
}
export async function listCompanyMembers(companyId){
  const snap=await getDocs(query(collection(db,"users"),where("companyId","==",companyId)));
  return snap.docs.map(item=>({uid:item.id,...item.data()}));
}
export async function claimShift(companyId,shiftId,user){
  const membership=await getDoc(doc(db,"users",user.uid));
  const role=String(membership.data()?.role||"").trim().toLowerCase().replace(/[_-]+/g," ").replace(/\s+/g," ");
  if(["company owner","operations manager","controller","supervisor"].includes(role)) throw new Error("Management accounts cannot self-book shifts.");
  const ref=doc(db,"companies",companyId,"shifts",shiftId),snap=await getDoc(ref);
  if(!snap.exists())throw new Error("Shift not found.");
  const shift=snap.data(),assignments=Array.isArray(shift.assignments)?shift.assignments:[];
  if(assignments.some(item=>item.uid===user.uid))throw new Error("You are already booked on this shift.");
  if(assignments.length>=Number(shift.positions||1))throw new Error("This shift is already full.");
  const all=await listShifts(companyId);
  const clash=all.some(item=>item.id!==shiftId&&(item.assignments||[]).some(a=>a.uid===user.uid)&&item.date===shift.date&&item.startTime<shift.endTime&&item.endTime>shift.startTime);
  if(clash)throw new Error("This shift overlaps another shift you are booked on.");
  assignments.push({uid:user.uid,name:user.name||user.email||"Officer",email:user.email||"",bookedAt:new Date().toISOString()});
  await updateDoc(ref,{assignments,status:assignments.length>=Number(shift.positions||1)?"filled":"open",updatedAt:serverTimestamp()});
}
export async function listSites(companyId){
  const snap=await getDocs(collection(db,"companies",companyId,"sites"));
  return snap.docs.map(item=>({id:item.id,...item.data()}));
}
export async function saveSite(companyId,site){
  const payload={name:site.name,clientName:site.clientName||"",address:site.address||"",timezone:site.timezone||"Europe/London",contact:site.contact||"",status:site.status||"setup",updatedAt:serverTimestamp()};
  if(site.id){await setDoc(doc(db,"companies",companyId,"sites",site.id),payload,{merge:true});return site.id}
  const ref=await addDoc(collection(db,"companies",companyId,"sites"),{...payload,createdAt:serverTimestamp()});return ref.id;
}

export async function deleteSite(companyId,id){
  const siteRef=doc(db,"companies",companyId,"sites",id);
  const siteSnap=await getDoc(siteRef);
  if(!siteSnap.exists()) throw new Error("Site not found.");
  if(siteSnap.data().status!=="suspended") throw new Error("Suspend the site before deleting.");

  const invitations=await getDocs(collection(db,"companies",companyId,"invitations"));
  const assignedInvites=invitations.docs.filter(item=>item.data().siteId===id);
  const batch=writeBatch(db);

  // Remove site-linked team membership records. Firebase Auth identities remain,
  // but without a /users membership they cannot regain company access.
  assignedInvites.forEach(item=>{
    const invite=item.data();
    batch.delete(item.ref);
    if(invite.acceptedUid) batch.delete(doc(db,"users",invite.acceptedUid));
  });

  // Current ISS site data is stored in the site document plus team assignments.
  // Future site subcollections must be explicitly added here before site deletion.
  batch.delete(siteRef);
  await batch.commit();
}

export async function listInvitations(companyId){
  const snap=await getDocs(collection(db,"companies",companyId,"invitations"));
  return snap.docs.map(item=>({id:item.id,...item.data()}));
}
export async function saveInvitation(companyId,invite){
  const payload={name:invite.name||"",email:String(invite.email||"").trim().toLowerCase(),role:invite.role||"Officer",siteId:invite.siteId||"company-wide",siteName:invite.siteName||"Company-wide",status:invite.status||"pending",updatedAt:serverTimestamp()};
  if(invite.id){await setDoc(doc(db,"companies",companyId,"invitations",invite.id),payload,{merge:true});return invite.id}
  const ref=await addDoc(collection(db,"companies",companyId,"invitations"),{...payload,createdAt:serverTimestamp()});return ref.id;
}
export async function acceptInvitation({companyId,invitationId,email,password}){
  const credential=await createUserWithEmailAndPassword(auth,email,password);
  const uid=credential.user.uid;
  const inviteRef=doc(db,"companies",companyId,"invitations",invitationId);
  const inviteSnap=await getDoc(inviteRef);
  if(!inviteSnap.exists()) throw new Error("Invitation not found.");
  const invite=inviteSnap.data();
  if(String(invite.email||"").toLowerCase()!==String(email||"").toLowerCase()) throw new Error("Use the email address that was invited.");
  if(invite.status==="suspended") throw new Error("This invitation has been suspended.");
  const batch=writeBatch(db);
  batch.set(doc(db,"users",uid),{companyId,email:String(email).toLowerCase(),firstName:invite.name||"",lastName:"",role:invite.role||"Officer",siteId:invite.siteId||"company-wide",siteName:invite.siteName||"Company-wide",status:"active",invitationId,createdAt:serverTimestamp()});
  batch.update(inviteRef,{status:"active",acceptedUid:uid,acceptedAt:serverTimestamp(),updatedAt:serverTimestamp()});
  await batch.commit();
  return {uid,companyId};
}

export async function setInvitationStatus(companyId,id,status){
  const inviteRef=doc(db,"companies",companyId,"invitations",id);
  const inviteSnap=await getDoc(inviteRef);
  if(!inviteSnap.exists()) throw new Error("Team member not found.");
  const invite=inviteSnap.data();
  const acceptedUid=invite.acceptedUid||"";
  const batch=writeBatch(db);
  batch.update(inviteRef,{status,updatedAt:serverTimestamp()});
  if(acceptedUid) batch.update(doc(db,"users",acceptedUid),{status,updatedAt:serverTimestamp()});
  await batch.commit();
}

export async function deleteTeamMember(companyId,id){
  const inviteRef=doc(db,"companies",companyId,"invitations",id);
  const inviteSnap=await getDoc(inviteRef);
  if(!inviteSnap.exists()) throw new Error("Team member not found.");
  const invite=inviteSnap.data();
  if(invite.status!=="suspended") throw new Error("Suspend the team member before deleting.");
  const batch=writeBatch(db);
  batch.delete(inviteRef);
  if(invite.acceptedUid) batch.delete(doc(db,"users",invite.acceptedUid));
  await batch.commit();
}

export const signIn=(email,password)=>signInWithEmailAndPassword(auth,email,password);
export const signOutUser=()=>signOut(auth);
export const observeAuth=callback=>onAuthStateChanged(auth,callback);
