import { auth, registerCompany, signIn, signOutUser, observeAuth, getDashboardData, listSites, saveSite } from "./backend.js";

const byId=id=>document.getElementById(id);
const formData=form=>Object.fromEntries(new FormData(form).entries());
const message=(el,text,error=false)=>{el.textContent=text;el.classList.toggle("error",error)};

const openCompanyDashboard=({companyName="Company Dashboard",workspaceSlug="",siteCount=0,teamCount=0}={})=>{
  byId("publicHome").hidden=true;
  byId("companyDashboard").hidden=false;
  byId("dashboardCompanyName").textContent=companyName||"Company Dashboard";
  byId("dashboardWorkspace").textContent=workspaceSlug||"—";
  byId("dashboardSites").textContent=String(siteCount);
  byId("dashboardTeam").textContent=String(teamCount);
  window.scrollTo({top:0,behavior:"smooth"});
};

const openPublicHome=()=>{
  byId("companyDashboard").hidden=true;
  byId("publicHome").hidden=false;
  window.scrollTo({top:0,behavior:"smooth"});
};

const loadDashboard=async user=>{
  if(!user) return null;
  const data=await getDashboardData(user.uid);
  if(!data) return null;
  localStorage.setItem("iss-company-id",data.companyId);
  localStorage.setItem("iss-workspace-slug",data.workspaceSlug);
  openCompanyDashboard(data);
  currentDashboard=data;
  return data;
};

const launch=byId("launchWorkspace");
launch.addEventListener("click",async event=>{
  event.stopImmediatePropagation();
  const status=byId("onboardingMessage");
  const account=formData(byId("accountForm"));
  const company=formData(byId("companyForm"));
  const site=formData(byId("siteForm"));
  const operationsRaw=formData(byId("operationsForm"));
  launch.disabled=true;
  message(status,"Creating secure company workspace…");
  try{
    const result=await registerCompany({
      account:{firstName:account.firstName,lastName:account.lastName,email:account.email,password:account.password,role:account.creatorRole},
      company:{name:company.companyName,tradingName:company.tradingName,country:company.country,phone:company.companyPhone,email:company.companyEmail,website:company.website,registrationNumber:company.registrationNumber},
      workspace:{name:byId("workspaceName").value,slug:byId("workspaceSlug").value},
      site:{name:site.siteName,clientName:site.clientName,address:site.siteAddress,timezone:site.timezone,contact:site.siteContact},
      invites:window.ISSInvites||[],
      operations:{shiftPattern:operationsRaw.shiftPattern,firstShiftStart:operationsRaw.firstShiftStart,patrols:Boolean(operationsRaw.patrols),openingProcedure:Boolean(operationsRaw.openingProcedure),closingProcedure:Boolean(operationsRaw.closingProcedure),emergencyInstructions:Boolean(operationsRaw.emergencyInstructions)}
    });
    localStorage.setItem("iss-company-id",result.companyId);
    localStorage.setItem("iss-workspace-slug",result.workspaceSlug);
    byId("onboarding").hidden=true;
    await loadDashboard(auth.currentUser);
  }catch(error){
    console.error(error);
    message(status,error?.message||"Could not create the company workspace.",true);
  }finally{launch.disabled=false}
});

const signinForm=byId("signinForm");
signinForm.addEventListener("submit",async event=>{
  event.preventDefault();
  const status=byId("signinMessage");
  const data=formData(signinForm);
  const button=signinForm.querySelector('button[type="submit"]');
  button.disabled=true;
  message(status,"Signing in…");
  try{
    const credential=await signIn(data.email,data.password);
    const dashboard=await loadDashboard(credential.user);
    if(!dashboard) throw new Error("Company workspace not found.");
    byId("signin").hidden=true;
    message(status,"Signed in.");
  }catch(error){
    console.error(error);
    message(status,"Sign-in failed. Check your account details.",true);
  }finally{button.disabled=false}
});

byId("dashboardSignOut").addEventListener("click",async()=>{
  await signOutUser();
  localStorage.removeItem("iss-company-id");
  localStorage.removeItem("iss-workspace-slug");
  openPublicHome();
});

observeAuth(async user=>{
  if(!user){openPublicHome();return}
  try{await loadDashboard(user)}catch(error){console.error("Could not restore company workspace.",error)}
});

let currentDashboard=null;
const sitesView=byId("sitesView"),siteEditor=byId("siteEditor"),siteFormEditor=byId("siteEditorForm");
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const renderSites=sites=>{
  byId("sitesList").innerHTML=sites.length?sites.map(site=>'<article class="site-card" data-site-id="'+escapeHtml(site.id)+'"><div><span class="site-status">'+escapeHtml(site.status||"setup")+'</span><h3>'+escapeHtml(site.name||"Unnamed site")+'</h3><p>'+escapeHtml(site.clientName||"No client")+'</p></div><div class="site-meta"><small>ADDRESS</small><span>'+escapeHtml(site.address||"Not set")+'</span></div><div class="site-meta"><small>CONTACT</small><span>'+escapeHtml(site.contact||"Not set")+'</span><small>'+escapeHtml(site.timezone||"")+'</small></div><button class="secondary edit-site" type="button">Edit</button></article>').join(""):'<div class="empty-sites">No sites configured. Add your first security site.</div>';
};
const refreshSites=async()=>{
  if(!currentDashboard)return;
  const sites=await listSites(currentDashboard.companyId);
  renderSites(sites);byId("dashboardSites").textContent=String(sites.length);
  return sites;
};
const openSitesView=async()=>{byId("companyDashboard").hidden=true;sitesView.hidden=false;window.scrollTo({top:0});await refreshSites()};
byId("openSites").addEventListener("click",openSitesView);
byId("openSites").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")openSitesView()});
byId("backDashboard").addEventListener("click",()=>{sitesView.hidden=true;byId("companyDashboard").hidden=false;window.scrollTo({top:0})});
const showSiteEditor=site=>{siteFormEditor.reset();siteFormEditor.elements.id.value=site?.id||"";siteFormEditor.elements.name.value=site?.name||"";siteFormEditor.elements.clientName.value=site?.clientName||"";siteFormEditor.elements.address.value=site?.address||"";siteFormEditor.elements.timezone.value=site?.timezone||"Europe/London";siteFormEditor.elements.contact.value=site?.contact||"";siteFormEditor.elements.status.value=site?.status||"setup";byId("siteEditorTitle").textContent=site?"Edit Site":"Add Site";siteEditor.hidden=false};
byId("addSite").addEventListener("click",()=>showSiteEditor(null));
byId("closeSiteEditor").addEventListener("click",()=>siteEditor.hidden=true);
byId("sitesList").addEventListener("click",async e=>{const button=e.target.closest(".edit-site");if(!button)return;const id=button.closest("[data-site-id]").dataset.siteId;const sites=await listSites(currentDashboard.companyId);showSiteEditor(sites.find(site=>site.id===id))});
siteFormEditor.addEventListener("submit",async e=>{e.preventDefault();const status=byId("siteEditorMessage"),button=siteFormEditor.querySelector('button[type="submit"]');button.disabled=true;message(status,"Saving site…");try{const data=formData(siteFormEditor);await saveSite(currentDashboard.companyId,data);await refreshSites();siteEditor.hidden=true;message(status,"")}catch(error){console.error(error);message(status,"Could not save site.",true)}finally{button.disabled=false}});
