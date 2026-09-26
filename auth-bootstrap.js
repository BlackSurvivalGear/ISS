import { auth, signIn, observeAuth, isSuperAdmin } from "./auth-service.js";
import { getDashboardData } from "./backend.js";

const byId=id=>document.getElementById(id);
let routeVersion=0;

const showPublic=()=>{
  byId("companyDashboard").hidden=true;
  byId("superadminDashboard").hidden=true;
  byId("publicHome").hidden=false;
};
const showCompany=data=>{
  byId("publicHome").hidden=true;
  byId("signin").hidden=true;
  byId("onboarding").hidden=true;
  byId("companyDashboard").hidden=false;
  byId("dashboardCompanyName").textContent=data.companyName||"Company Dashboard";
  byId("dashboardWorkspace").textContent=data.workspaceSlug||"—";
  byId("dashboardSites").textContent=String(data.siteCount||0);
  byId("dashboardTeam").textContent=String(data.teamCount||0);
  const access=byId("dashboardAccess");if(access)access.textContent=(data.role||"Officer")+(data.siteName&&data.siteName!=="Company-wide"?" · "+data.siteName:"");
};
const publish=(user,data)=>{
  window.ISS_CURRENT_DASHBOARD=data||null;
  if(typeof window.ISS_APPLY_DASHBOARD==="function")window.ISS_APPLY_DASHBOARD(user,data||null);
  else window.dispatchEvent(new CustomEvent("iss-dashboard-ready",{detail:data||null}));
  const actions=byId("publicHeaderActions"),account=byId("userAccount");
  if(actions)actions.hidden=Boolean(user);
  if(account)account.hidden=!user;
};
const routeUser=async user=>{
  const version=++routeVersion;
  if(!user){publish(null,null);showPublic();return null}
  if(isSuperAdmin(user)){publish(user,{superadmin:true,email:user.email,role:"Platform Admin"});byId("superadminLaunch").hidden=false;showPublic();return {superadmin:true}}
  byId("superadminLaunch").hidden=true;
  const data=await getDashboardData(user.uid);
  if(version!==routeVersion)return null;
  if(!data)throw new Error("Company workspace not found.");
  localStorage.setItem("iss-company-id",data.companyId);
  localStorage.setItem("iss-workspace-slug",data.workspaceSlug||"");
  publish(user,data);
  showCompany(data);
  return data;
};

const form=byId("signinForm");
form.addEventListener("submit",async event=>{
  event.preventDefault();
  const status=byId("signinMessage"),button=form.querySelector('button[type="submit"]'),data=Object.fromEntries(new FormData(form).entries());
  button.disabled=true;status.textContent="Signing in…";status.classList.remove("error");
  try{
    const credential=await signIn(data.email,data.password);
    await routeUser(credential.user);
    status.textContent="Signed in.";
  }catch(error){
    console.error("ISS sign-in failed",error);
    status.textContent=error?.message||"Sign-in failed.";
    status.classList.add("error");
  }finally{button.disabled=false}
});

observeAuth(user=>routeUser(user).catch(error=>{
  console.error("ISS auth restore failed",error);
  const status=byId("signinMessage");if(status){status.textContent="Signed in, but the company workspace could not be loaded.";status.classList.add("error")}
}));
