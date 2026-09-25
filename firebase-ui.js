import { auth, registerCompany, signIn, signOutUser, observeAuth, getDashboardData, listSites, saveSite, listInvitations, saveInvitation, setInvitationStatus, acceptInvitation } from "./backend.js";

const byId=id=>document.getElementById(id);
const formData=form=>Object.fromEntries(new FormData(form).entries());
const message=(el,text,error=false)=>{el.textContent=text;el.classList.toggle("error",error)};

const ROLE_ACCESS={
  "Company Owner":{sites:true,team:true},
  "company_owner":{sites:true,team:true},
  "Operations Manager":{sites:true,team:true},
  "operations_manager":{sites:true,team:true},
  "Controller":{sites:true,team:false},
  "Supervisor":{sites:true,team:false},
  "Team Leader":{sites:true,team:false},
  "Officer":{sites:true,team:false},
  "Client":{sites:true,team:false}
};
const roleAccess=role=>ROLE_ACCESS[role]||{sites:false,team:false};
const applyRoleAccess=({role="Officer",siteName="Company-wide"}={})=>{
  const access=roleAccess(role);
  const teamCard=byId("openTeam"),sitesCard=byId("openSites");
  teamCard.hidden=!access.team;
  sitesCard.hidden=!access.sites;
  byId("addTeamInvite").hidden=!access.team;
  byId("addSite").hidden=!access.team;
  document.querySelectorAll(".edit-site").forEach(button=>button.hidden=!access.team);
  document.querySelectorAll(".team-actions").forEach(actions=>actions.hidden=!access.team);
  const label=byId("dashboardAccess");
  if(label) label.textContent=role+(siteName&&siteName!=="Company-wide"?" · "+siteName:"");
};
const openCompanyDashboard=({companyName="Company Dashboard",workspaceSlug="",siteCount=0,teamCount=0,role="Officer",siteName="Company-wide"}={})=>{
  byId("publicHome").hidden=true;
  byId("companyDashboard").hidden=false;
  byId("dashboardCompanyName").textContent=companyName||"Company Dashboard";
  byId("dashboardWorkspace").textContent=workspaceSlug||"—";
  byId("dashboardSites").textContent=String(siteCount);
  byId("dashboardTeam").textContent=String(teamCount);\n  applyRoleAccess({role,siteName});
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
  renderSites(sites);byId("dashboardSites").textContent=String(sites.length);applyRoleAccess(currentDashboard);
  return sites;
};
const openSitesView=async()=>{if(!roleAccess(currentDashboard?.role).sites)return;byId("companyDashboard").hidden=true;sitesView.hidden=false;window.scrollTo({top:0});await refreshSites()};
byId("openSites").addEventListener("click",openSitesView);
byId("openSites").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")openSitesView()});
byId("backDashboard").addEventListener("click",()=>{sitesView.hidden=true;byId("companyDashboard").hidden=false;window.scrollTo({top:0})});
const showSiteEditor=site=>{siteFormEditor.reset();siteFormEditor.elements.id.value=site?.id||"";siteFormEditor.elements.name.value=site?.name||"";siteFormEditor.elements.clientName.value=site?.clientName||"";siteFormEditor.elements.address.value=site?.address||"";siteFormEditor.elements.timezone.value=site?.timezone||"Europe/London";siteFormEditor.elements.contact.value=site?.contact||"";siteFormEditor.elements.status.value=site?.status||"setup";byId("siteEditorTitle").textContent=site?"Edit Site":"Add Site";siteEditor.hidden=false};
byId("addSite").addEventListener("click",()=>showSiteEditor(null));
byId("closeSiteEditor").addEventListener("click",()=>siteEditor.hidden=true);
byId("sitesList").addEventListener("click",async e=>{const button=e.target.closest(".edit-site");if(!button)return;const id=button.closest("[data-site-id]").dataset.siteId;const sites=await listSites(currentDashboard.companyId);showSiteEditor(sites.find(site=>site.id===id))});
siteFormEditor.addEventListener("submit",async e=>{e.preventDefault();const status=byId("siteEditorMessage"),button=siteFormEditor.querySelector('button[type="submit"]');button.disabled=true;message(status,"Saving site…");try{const data=formData(siteFormEditor);await saveSite(currentDashboard.companyId,data);await refreshSites();siteEditor.hidden=true;message(status,"")}catch(error){console.error(error);message(status,"Could not save site.",true)}finally{button.disabled=false}});

const teamView=byId("teamView"),teamEditor=byId("teamEditor"),teamEditorForm=byId("teamEditorForm");
const renderTeam=invites=>{
  byId("teamList").innerHTML=invites.length?invites.map(invite=>'<article class="site-card team-card" data-invite-id="'+escapeHtml(invite.id)+'"><div><span class="site-status">'+escapeHtml(invite.status||"pending")+'</span><h3>'+escapeHtml(invite.name||invite.email||"Team member")+'</h3><p>'+escapeHtml(invite.email||"")+'</p></div><div class="site-meta"><small>ROLE</small><strong>'+escapeHtml(invite.role||"Officer")+'</strong><small>SITE · '+escapeHtml(invite.siteName||"Company-wide")+'</small></div><div class="site-meta"><small>ACCESS</small><span>'+escapeHtml(invite.status==="active"?"Enabled":invite.status==="suspended"?"Suspended":"Invitation pending")+'</span></div><div class="team-actions"><button class="secondary edit-invite" type="button">Edit</button>'+(invite.status==="suspended"?'<button class="secondary team-status" data-status="active" type="button">Reactivate</button>':'<button class="secondary team-status" data-status="suspended" type="button">Suspend</button>')+(invite.status==="pending"?'<button class="secondary copy-invite" type="button">Copy Invite Link</button>':'')+'</div></article>').join(""):'<div class="empty-sites">No team invitations configured.</div>';
};
const refreshTeam=async()=>{
  if(!currentDashboard)return;
  const invites=await listInvitations(currentDashboard.companyId);renderTeam(invites);byId("dashboardTeam").textContent=String(invites.length);applyRoleAccess(currentDashboard);return invites;
};
const openTeamView=async()=>{if(!roleAccess(currentDashboard?.role).team)return;byId("companyDashboard").hidden=true;sitesView.hidden=true;teamView.hidden=false;window.scrollTo({top:0});await refreshTeam()};
byId("openTeam").addEventListener("click",openTeamView);
byId("openTeam").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")openTeamView()});
byId("backTeamDashboard").addEventListener("click",()=>{teamView.hidden=true;byId("companyDashboard").hidden=false;window.scrollTo({top:0})});
const showTeamEditor=async invite=>{teamEditorForm.reset();const sites=await listSites(currentDashboard.companyId);const siteSelect=teamEditorForm.elements.siteId;siteSelect.innerHTML='<option value="company-wide">Company-wide</option>'+sites.map(site=>'<option value="'+escapeHtml(site.id)+'">'+escapeHtml(site.name)+'</option>').join("");teamEditorForm.elements.id.value=invite?.id||"";teamEditorForm.elements.name.value=invite?.name||"";teamEditorForm.elements.email.value=invite?.email||"";teamEditorForm.elements.role.value=invite?.role||"Officer";siteSelect.value=invite?.siteId||"company-wide";teamEditorForm.elements.status.value=invite?.status||"pending";byId("teamEditorTitle").textContent=invite?"Edit Team Access":"Invite Team Member";teamEditor.hidden=false};
byId("addTeamInvite").addEventListener("click",()=>showTeamEditor(null));
byId("closeTeamEditor").addEventListener("click",()=>teamEditor.hidden=true);
byId("teamList").addEventListener("click",async e=>{const card=e.target.closest("[data-invite-id]");if(!card)return;const id=card.dataset.inviteId;if(e.target.closest(".edit-invite")){const invites=await listInvitations(currentDashboard.companyId);showTeamEditor(invites.find(item=>item.id===id));return}const statusButton=e.target.closest(".team-status");if(statusButton){await setInvitationStatus(currentDashboard.companyId,id,statusButton.dataset.status);await refreshTeam();return}if(e.target.closest(".copy-invite")){const invites=await listInvitations(currentDashboard.companyId);const invite=invites.find(item=>item.id===id);const url=new URL(window.location.href);url.search="";url.searchParams.set("invite",currentDashboard.companyId+"."+id);url.searchParams.set("email",invite.email||"");await navigator.clipboard.writeText(url.toString());e.target.textContent="Copied"}});
teamEditorForm.addEventListener("submit",async e=>{e.preventDefault();const status=byId("teamEditorMessage"),button=teamEditorForm.querySelector('button[type="submit"]');button.disabled=true;message(status,"Saving invitation…");try{const data=formData(teamEditorForm);const siteOption=teamEditorForm.elements.siteId.selectedOptions[0];data.siteName=siteOption?.textContent||"Company-wide";await saveInvitation(currentDashboard.companyId,data);await refreshTeam();teamEditor.hidden=true;message(status,"")}catch(error){console.error(error);message(status,"Could not save invitation.",true)}finally{button.disabled=false}});

const inviteParams=new URLSearchParams(window.location.search),inviteCode=inviteParams.get("invite");
if(inviteCode){
  const split=inviteCode.split("."),companyId=split.shift(),invitationId=split.join(".");
  if(companyId&&invitationId){
    byId("publicHome").hidden=true;byId("acceptInvite").hidden=false;
    const form=byId("acceptInviteForm");form.elements.companyId.value=companyId;form.elements.invitationId.value=invitationId;form.elements.email.value=inviteParams.get("email")||"";
    form.addEventListener("submit",async e=>{e.preventDefault();const data=formData(form),status=byId("acceptInviteMessage"),button=form.querySelector('button[type="submit"]');if(data.password!==data.confirmPassword){message(status,"Passwords do not match.",true);return}button.disabled=true;message(status,"Activating account…");try{await acceptInvitation(data);byId("acceptInvite").hidden=true;history.replaceState({},document.title,location.pathname);await loadDashboard(auth.currentUser)}catch(error){console.error(error);message(status,error?.message||"Could not activate invitation.",true)}finally{button.disabled=false}});
  }
}
