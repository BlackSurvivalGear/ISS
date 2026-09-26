import { registerCompany, getDashboardData, listSites, saveSite, deleteSite, listInvitations, saveInvitation, setInvitationStatus, deleteTeamMember, acceptInvitation, getPlatformOverview, updateUserProfile, listShifts, createShift, claimShift, updateShift, deleteShift, updateRecurringSeries, listCompanyMembers } from "./backend.js";
import { auth, signIn, signOutUser, observeAuth, isSuperAdmin } from "./auth-service.js";

const byId=id=>document.getElementById(id);
let currentDashboard=window.ISS_CURRENT_DASHBOARD||null;
const formData=form=>Object.fromEntries(new FormData(form).entries());
const message=(el,text,error=false)=>{el.textContent=text;el.classList.toggle("error",error)};
const setHeaderUser=(user,data={})=>{
  const account=byId("userAccount"),publicActions=byId("publicHeaderActions");
  if(!user){account.hidden=true;if(publicActions)publicActions.hidden=false;return}
  if(publicActions)publicActions.hidden=true;
  const email=data.email||user.email||"";
  const fullName=[data.firstName,data.lastName].filter(Boolean).join(" ").trim();
  const displayName=fullName||user.displayName||email.split("@")[0]||"User";
  byId("userName").textContent=displayName;
  byId("userRole").textContent=data.role|| (isSuperAdmin(user)?"Platform Admin":"");
  byId("profileName").textContent=displayName;
  byId("profileEmail").textContent=email;
  byId("profileRole").textContent=data.role|| (isSuperAdmin(user)?"Platform Admin":"");
  byId("profileCompany").textContent=data.companyName|| (isSuperAdmin(user)?"ImoTech Security Solutions":"");
  account.dataset.firstName=data.firstName||"";
  account.dataset.lastName=data.lastName||"";
  account.hidden=false;
};

const profileMenu=byId("profileMenu"),userTrigger=byId("userTrigger"),profileEditor=byId("profileEditor"),profileForm=byId("profileForm");
const setProfileMenu=open=>{profileMenu.hidden=!open;userTrigger.setAttribute("aria-expanded",String(open))};
userTrigger.addEventListener("click",e=>{e.stopPropagation();setProfileMenu(profileMenu.hidden)});
byId("userAccount").addEventListener("mouseenter",()=>{if(matchMedia("(hover:hover)").matches)setProfileMenu(true)});
byId("userAccount").addEventListener("mouseleave",()=>{if(matchMedia("(hover:hover)").matches)setProfileMenu(false)});
document.addEventListener("click",e=>{if(!byId("userAccount").contains(e.target))setProfileMenu(false)});
byId("profileSignOut").addEventListener("click",async()=>{setProfileMenu(false);await signOutUser();localStorage.removeItem("iss-company-id");localStorage.removeItem("iss-workspace-slug");openPublicHome()});
byId("editProfile").addEventListener("click",()=>{setProfileMenu(false);profileForm.elements.firstName.value=byId("userAccount").dataset.firstName||"";profileForm.elements.lastName.value=byId("userAccount").dataset.lastName||"";profileForm.elements.email.value=auth.currentUser?.email||"";profileEditor.hidden=false});
byId("closeProfileEditor").addEventListener("click",()=>profileEditor.hidden=true);
profileForm.addEventListener("submit",async e=>{e.preventDefault();const status=byId("profileMessage"),button=profileForm.querySelector('button[type="submit"]');button.disabled=true;message(status,"Saving…");try{const data=formData(profileForm);await updateUserProfile(auth.currentUser.uid,data);const dashboard=await getDashboardData(auth.currentUser.uid);currentDashboard=dashboard;setHeaderUser(auth.currentUser,dashboard);profileEditor.hidden=true;message(status,"")}catch(error){console.error(error);message(status,"Could not update profile.",true)}finally{button.disabled=false}});

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
  byId("signin").hidden=true;
  byId("onboarding").hidden=true;
  byId("companyDashboard").hidden=false;
  byId("dashboardCompanyName").textContent=companyName||"Company Dashboard";
  byId("dashboardWorkspace").textContent=workspaceSlug||"—";
  byId("dashboardSites").textContent=String(siteCount);
  byId("dashboardTeam").textContent=String(teamCount);
  applyRoleAccess({role,siteName});
  window.scrollTo({top:0,behavior:"smooth"});
};

const openPublicHome=()=>{
  byId("companyDashboard").hidden=true;
  byId("superadminDashboard").hidden=true;
  byId("publicHome").hidden=false;
  window.scrollTo({top:0,behavior:"smooth"});
};

const loadDashboard=async user=>{
  if(!user) return null;
  if(isSuperAdmin(user)){
    setHeaderUser(user,{firstName:"Platform",lastName:"Admin",email:user.email});
    byId("superadminLaunch").hidden=false;
    openPublicHome();
    return {superadmin:true};
  }
  byId("superadminLaunch").hidden=true;
  const data=await getDashboardData(user.uid);
  if(!data) return null;
  localStorage.setItem("iss-company-id",data.companyId);
  localStorage.setItem("iss-workspace-slug",data.workspaceSlug);
  openCompanyDashboard(data);
  currentDashboard=data;
  setHeaderUser(user,data);
  return data;
};

const issConfirm=(title,text,destructive=false)=>new Promise(resolve=>{const modal=byId("issConfirm"),ok=byId("issConfirmOk"),cancel=byId("issConfirmCancel");byId("issConfirmTitle").textContent=title;byId("issConfirmText").textContent=text;ok.textContent=destructive?"Delete":"Confirm";ok.className=destructive?"danger":"primary";modal.hidden=false;const done=value=>{modal.hidden=true;ok.onclick=null;cancel.onclick=null;resolve(value)};ok.onclick=()=>done(true);cancel.onclick=()=>done(false)});
let shiftData=[];
const normalizedRole=role=>String(role||"").trim().toLowerCase().replace(/[_-]+/g," ").replace(/\s+/g," ");
const shiftManagers=new Set(["company owner","operations manager","controller","supervisor"]);
const canManageShifts=role=>shiftManagers.has(normalizedRole(role));
const selfBookRoles=new Set(["officer","team leader","supervisor"]);
const canSelfBookShift=role=>selfBookRoles.has(normalizedRole(role));
const assignableShiftRoles=new Set(["officer","team leader","supervisor"]);
const canBeAssignedShift=role=>assignableShiftRoles.has(normalizedRole(role));
const renderShifts=()=>{
  const uid=auth.currentUser?.uid,month=byId("shiftMonth").value;
  const visible=shiftData.filter(s=>!month||String(s.date||"").startsWith(month)).sort((a,b)=>String(a.date+a.startTime).localeCompare(String(b.date+b.startTime)));
  byId("shiftUpcoming").textContent=visible.length;
  byId("shiftOpen").textContent=visible.reduce((n,s)=>n+Math.max(0,Number(s.positions||1)-(s.assignments||[]).length),0);
  byId("shiftMine").textContent=visible.filter(s=>(s.assignments||[]).some(a=>a.uid===uid)).length;
  const manager=canManageShifts(currentDashboard?.role),selfBook=canSelfBookShift(currentDashboard?.role);
  const roleRank=role=>({"supervisor":0,"team leader":1,"officer":2}[normalizedRole(role)]??3);
  const assignmentRole=a=>normalizedRole(a.role||shiftMembers.find(m=>m.uid===a.uid)?.role||"officer");
  const sortedAssignments=s=>(s.assignments||[]).slice().sort((a,b)=>roleRank(assignmentRole(a))-roleRank(assignmentRole(b))||String(a.name||"").localeCompare(String(b.name||""),undefined,{sensitivity:"base"}));
  byId("shiftList").innerHTML=visible.length?visible.map(s=>{
    const mine=(s.assignments||[]).some(a=>a.uid===uid),open=Math.max(0,Number(s.positions||1)-(s.assignments||[]).length),full=open===0;
    const action=manager&&normalizedRole(currentDashboard?.role)!=="supervisor"?'<button class="secondary manage-shift" data-shift="'+s.id+'">Manage</button>':mine?'<span class="admin-status">BOOKED</span>':selfBook&&open>0?'<button class="secondary claim-shift" data-shift="'+s.id+'">Book Shift</button>':manager?'<button class="secondary manage-shift" data-shift="'+s.id+'">Manage</button>':'<span class="admin-status">FULL</span>';
    const assigned=sortedAssignments(s);
    return '<article class="shift-card '+(full?'shift-card-staffed':'shift-card-vacant')+'"><div><small>'+escapeHtml(s.date||"")+'</small><h3>'+escapeHtml(s.siteName||"Site")+'</h3><span>'+escapeHtml(s.startTime||"")+'–'+escapeHtml(s.endTime||"")+' · '+escapeHtml(s.requiredRole||"Officer")+'</span></div><div><strong>'+open+'</strong><small>'+(full?'FULLY STAFFED':'OPEN')+'</small></div><details class="shift-assignees shift-assignees-expand" '+(assigned.length?'':'open')+'><summary>'+assigned.length+' assigned</summary><div>'+ (assigned.length?assigned.map(a=>'<span><b>'+escapeHtml(assignmentRole(a).replace(/\b\w/g,c=>c.toUpperCase()))+'</b> · '+escapeHtml(a.name||a.email||"Team member")+'</span>').join(""):'<span>No staff assigned</span>')+'</div></details>'+action+'</article>'
  }).join(""):'<div class="empty-sites">No shifts scheduled for this month.</div>';
  renderWeeklyCalendar();
  document.querySelectorAll(".manage-shift").forEach(btn=>btn.onclick=()=>openShiftManager(btn.dataset.shift));
  document.querySelectorAll(".claim-shift").forEach(btn=>btn.onclick=async()=>{try{await claimShift(currentDashboard.companyId,btn.dataset.shift,{uid,email:currentDashboard.email,name:[currentDashboard.firstName,currentDashboard.lastName].filter(Boolean).join(" "),role:currentDashboard.role});shiftData=await listShifts(currentDashboard.companyId);renderShifts()}catch(e){alert(e.message)}});
};
let calendarWeekStart=null;
const localIso=date=>{const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,"0"),d=String(date.getDate()).padStart(2,"0");return y+"-"+m+"-"+d};
const mondayFor=value=>{const date=new Date(value);date.setHours(12,0,0,0);const day=date.getDay();date.setDate(date.getDate()-(day===0?6:day-1));return date};
const shiftPeriod=shift=>{const hour=Number(String(shift.startTime||"00:00").split(":")[0]);return hour>=17||hour<5?"night":"day"};
const renderWeeklyCalendar=()=>{
 if(!calendarWeekStart)calendarWeekStart=mondayFor(new Date());
 const week=Array.from({length:7},(_,i)=>{const d=new Date(calendarWeekStart);d.setDate(d.getDate()+i);return d});
 const start=week[0],end=week[6],fmt=new Intl.DateTimeFormat(undefined,{day:"numeric",month:"short"});
 byId("weekRange").textContent=fmt.format(start)+" – "+fmt.format(end)+" "+end.getFullYear();
 const uid=auth.currentUser?.uid,manager=canManageShifts(currentDashboard?.role),selfBook=canSelfBookShift(currentDashboard?.role);
 const roleRank=role=>({"supervisor":0,"team leader":1,"officer":2}[normalizedRole(role)]??3);
 const assignmentRole=a=>normalizedRole(a.role||shiftMembers.find(m=>m.uid===a.uid)?.role||"officer");
 const ordered=s=>(s.assignments||[]).slice().sort((a,b)=>roleRank(assignmentRole(a))-roleRank(assignmentRole(b))||String(a.name||"").localeCompare(String(b.name||""),undefined,{sensitivity:"base"}));
 const card=s=>{const assignments=ordered(s),open=Math.max(0,Number(s.positions||1)-assignments.length),full=open===0,mine=assignments.some(a=>a.uid===uid);const action=manager?'<button class="week-shift-open" type="button" data-shift="'+escapeHtml(s.id)+'" aria-label="Open shift"></button>':selfBook&&!mine&&open>0?'<button class="week-shift-book" type="button" data-shift="'+escapeHtml(s.id)+'">Book</button>':mine?'<small class="week-booked">BOOKED</small>':"";return '<article class="week-shift '+(full?"week-shift-staffed":"week-shift-vacant")+'"><div class="week-shift-head"><strong>'+escapeHtml(s.siteName||"Site")+'</strong><small>'+escapeHtml(s.startTime||"")+'–'+escapeHtml(s.endTime||"")+'</small></div><span class="week-staffing">'+(full?"FULLY STAFFED":open+" OPEN")+'</span><details><summary>'+assignments.length+'/'+Number(s.positions||1)+' assigned</summary><div class="week-assignees">'+(assignments.length?assignments.map(a=>'<span><b>'+escapeHtml(assignmentRole(a).replace(/\\b\\w/g,c=>c.toUpperCase()))+'</b> · '+escapeHtml(a.name||a.email||"Team member")+'</span>').join(""):'<span>No staff assigned</span>')+'</div></details>'+action+'</article>'};
 const headers=week.map(d=>'<div class="week-day-head"><strong>'+d.toLocaleDateString(undefined,{weekday:"short"})+'</strong><span>'+d.getDate()+'</span></div>').join("");
 const row=period=>'<div class="week-row-label"><strong>'+(period==="day"?"DAY":"NIGHT")+'</strong><small>'+(period==="day"?"Day shifts":"Night shifts")+'</small></div>'+week.map(d=>{const iso=localIso(d),items=shiftData.filter(s=>s.date===iso&&shiftPeriod(s)===period).sort((a,b)=>String(a.startTime).localeCompare(String(b.startTime)));return '<div class="week-cell" data-date="'+iso+'">'+(items.length?items.map(card).join(""):'<span class="week-empty">No shift</span>')+'</div>'}).join("");
 byId("shiftCalendar").innerHTML='<div class="week-grid"><div class="week-corner">SHIFT</div>'+headers+row("day")+row("night")+'</div>';
 document.querySelectorAll(".week-shift-open").forEach(btn=>btn.onclick=()=>openShiftManager(btn.dataset.shift));
 document.querySelectorAll(".week-shift-book").forEach(btn=>btn.onclick=async()=>{try{await claimShift(currentDashboard.companyId,btn.dataset.shift,{uid,email:currentDashboard.email,name:[currentDashboard.firstName,currentDashboard.lastName].filter(Boolean).join(" "),role:currentDashboard.role});shiftData=await listShifts(currentDashboard.companyId);renderShifts()}catch(e){alert(e.message)}});
};
let shiftMembers=[];
const openShiftManager=async id=>{
  const shift=shiftData.find(s=>s.id===id);if(!shift)return;
  if(!shiftMembers.length)shiftMembers=await listCompanyMembers(currentDashboard.companyId);
  const form=byId("shiftManageForm");form.elements.id.value=id;form.elements.date.value=shift.date||"";form.elements.startTime.value=shift.startTime||"";form.elements.endTime.value=shift.endTime||"";form.elements.positions.value=shift.positions||1;form.elements.requiredRole.value=shift.requiredRole||"Officer";form.elements.notes.value=shift.notes||"";
  const recurring=Boolean(shift.seriesId);byId("manageShiftRecurrenceWrap").hidden=!recurring;byId("manageShiftRepeatUntilWrap").hidden=!recurring;byId("manageShiftScopeWrap").hidden=!recurring;
  if(recurring){byId("manageShiftRecurrence").value=shift.recurrence||"weekly";const series=shiftData.filter(s=>s.seriesId===shift.seriesId).sort((a,b)=>a.date.localeCompare(b.date));byId("manageShiftRepeatUntil").value=series.at(-1)?.date||shift.date;byId("manageShiftScope").value="one";}
  const sites=await listSites(currentDashboard.companyId);byId("manageShiftSite").innerHTML=sites.map(s=>'<option value="'+escapeHtml(s.id)+'">'+escapeHtml(s.name)+'</option>').join("");byId("manageShiftSite").value=shift.siteId||"";
  const assigned=new Set((shift.assignments||[]).map(a=>a.uid));
  const toMinutes=t=>{const [h,m]=String(t||"00:00").split(":").map(Number);return h*60+m};
  const span=s=>{const start=new Date(s.date+"T00:00:00").getTime()/60000+toMinutes(s.startTime),endBase=new Date(s.date+"T00:00:00").getTime()/60000+toMinutes(s.endTime);return [start,endBase<=start?endBase+1440:endBase]};
  const [targetStart,targetEnd]=span(shift);
  const conflictFor=uid=>shiftData.find(other=>other.id!==shift.id&&(other.assignments||[]).some(a=>a.uid===uid)&&(()=>{const [a,b]=span(other);return targetStart<b&&a<targetEnd})());
  const candidates=shiftMembers.filter(m=>m.status==="active"&&canBeAssignedShift(m.role)&&!assigned.has(m.uid));
  const available=candidates.filter(m=>!conflictFor(m.uid)),unavailable=candidates.map(m=>({m,conflict:conflictFor(m.uid)})).filter(x=>x.conflict);
  const officerName=m=>[m.firstName,m.lastName].filter(Boolean).join(" ")||m.email;
  const contact=m=>m.phone?(" · "+m.phone):"";
  byId("manageShiftOfficer").innerHTML='<option value="">Select available officer</option>'+available.map(m=>'<option value="'+m.uid+'">'+escapeHtml(officerName(m)+contact(m))+'</option>').join("");
  const unavailableHtml=unavailable.map(({m,conflict})=>{const phone=String(m.phone||""),tel=phone.replace(/[^+\\d]/g,"");return '<div class="officer-unavailable"><span>'+escapeHtml(officerName(m))+(phone?' · <a href="tel:'+escapeHtml(tel)+'">'+escapeHtml(phone)+'</a>':'')+'</span><small>UNAVAILABLE · Already assigned '+escapeHtml(conflict.siteName||"Shift")+' '+escapeHtml(conflict.startTime||"")+'–'+escapeHtml(conflict.endTime||"")+'</small></div>'}).join("");
  byId("manageShiftAvailability").innerHTML='<small class="available-count">'+available.length+' available · '+unavailable.length+' unavailable</small>'+(unavailable.length?unavailableHtml:'<small class="availability-clear">No unavailable duty staff for this shift.</small>');
  const draw=()=>{byId("manageShiftAssignments").innerHTML=(shift.assignments||[]).length?(shift.assignments||[]).map(a=>{const phone=String(a.phone||""),tel=phone.replace(/[^+\\d]/g,"");return '<span>'+escapeHtml(a.name)+(phone?' · <a href="tel:'+escapeHtml(tel)+'">'+escapeHtml(phone)+'</a>':'')+' <button type="button" class="remove-assignment" data-uid="'+a.uid+'">Remove</button></span>'}).join(""):'<small>No officers assigned.</small>';document.querySelectorAll(".remove-assignment").forEach(x=>x.onclick=()=>{shift.assignments=(shift.assignments||[]).filter(a=>a.uid!==x.dataset.uid);draw()})};draw();
  byId("manageShiftOfficer").onchange=e=>{const m=shiftMembers.find(x=>x.uid===e.target.value);if(!m)return;shift.assignments=shift.assignments||[];if(shift.assignments.length>=Number(form.elements.positions.value||1)){alert("This shift is full.");e.target.value="";return}shift.assignments.push({uid:m.uid,name:[m.firstName,m.lastName].filter(Boolean).join(" ")||m.email,email:m.email||"",phone:m.phone||"",role:m.role||"Officer",bookedAt:new Date().toISOString(),assignedBy:auth.currentUser.uid});e.target.value="";draw()};
  byId("shiftManage").hidden=false;
};
const openShiftsView=async()=>{
  if(!currentDashboard)return;
  byId("companyDashboard").hidden=true;byId("shiftsView").hidden=false;window.scrollTo({top:0});
  const canManage=canManageShifts(currentDashboard.role);byId("addShift").hidden=!canManage;byId("shiftAccessLabel").textContent=canManage?"Schedule coverage and fill vacancies":"View your rota and book available shifts";
  const sites=await listSites(currentDashboard.companyId);byId("shiftSite").innerHTML=sites.map(s=>'<option value="'+escapeHtml(s.id)+'">'+escapeHtml(s.name)+'</option>').join("");
  shiftData=await listShifts(currentDashboard.companyId);renderShifts();
};
byId("openShifts").addEventListener("click",openShiftsView);byId("backShiftDashboard").addEventListener("click",()=>{byId("shiftsView").hidden=true;byId("companyDashboard").hidden=false});
byId("addShift").addEventListener("click",()=>{byId("shiftEditorMessage").textContent="";byId("shiftRecurrence").value="none";byId("shiftRepeatUntilWrap").hidden=true;byId("shiftEditor").hidden=false});
byId("shiftRecurrence").addEventListener("change",e=>{const repeating=e.target.value!=="none";byId("shiftRepeatUntilWrap").hidden=!repeating;byId("shiftRepeatUntil").required=repeating});
byId("closeShiftManage").addEventListener("click",()=>byId("shiftManage").hidden=true);byId("closeShiftEditor").addEventListener("click",()=>byId("shiftEditor").hidden=true);
byId("shiftMonth").value=new Date().toISOString().slice(0,7);byId("shiftMonth").addEventListener("change",renderShifts);\nconst setShiftView=mode=>{const calendar=mode==="calendar";byId("shiftList").hidden=calendar;byId("shiftCalendar").hidden=!calendar;byId("shiftMonth").hidden=calendar;byId("weekControls").hidden=!calendar;byId("shiftListMode").classList.toggle("active",!calendar);byId("shiftCalendarMode").classList.toggle("active",calendar);if(calendar)renderWeeklyCalendar()};\nbyId("shiftListMode").addEventListener("click",()=>setShiftView("list"));byId("shiftCalendarMode").addEventListener("click",()=>setShiftView("calendar"));\nbyId("previousWeek").addEventListener("click",()=>{calendarWeekStart=mondayFor(calendarWeekStart||new Date());calendarWeekStart.setDate(calendarWeekStart.getDate()-7);renderWeeklyCalendar()});\nbyId("nextWeek").addEventListener("click",()=>{calendarWeekStart=mondayFor(calendarWeekStart||new Date());calendarWeekStart.setDate(calendarWeekStart.getDate()+7);renderWeeklyCalendar()});\nbyId("thisWeek").addEventListener("click",()=>{calendarWeekStart=mondayFor(new Date());renderWeeklyCalendar()});
byId("shiftEditorForm").addEventListener("submit",async e=>{e.preventDefault();const d=formData(e.currentTarget),site=byId("shiftSite").selectedOptions[0],button=e.currentTarget.querySelector('[type="submit"]');const repeatLabel=d.recurrence&&d.recurrence!=="none"?" · "+d.recurrence+" until "+d.repeatUntil:"";if(!await issConfirm(d.recurrence&&d.recurrence!=="none"?"Create recurring shifts":"Create shift",(site?.textContent||"Site")+" · "+d.date+" · "+d.startTime+"–"+d.endTime+" · "+d.positions+" position(s)"+repeatLabel))return;byId("issConfirm").hidden=true;button.disabled=true;try{const result=await createShift(currentDashboard.companyId,{...d,siteName:site?.textContent||""});shiftData=await listShifts(currentDashboard.companyId);renderShifts();e.currentTarget.reset();byId("shiftRepeatUntilWrap").hidden=true;byId("shiftEditor").hidden=true;window.scrollTo({top:0});}catch(err){message(byId("shiftEditorMessage"),err.message,true)}finally{button.disabled=false}});
byId("deleteShift").addEventListener("click",async()=>{const id=byId("shiftManageForm").elements.id.value,shift=shiftData.find(s=>s.id===id);if(!shift)return;if(!await issConfirm("Delete shift",(shift.siteName||"Site")+" · "+(shift.date||"")+" · "+(shift.startTime||"")+"–"+(shift.endTime||"")+" — This cannot be undone.",true))return;try{await deleteShift(currentDashboard.companyId,id);shiftData=await listShifts(currentDashboard.companyId);renderShifts();byId("shiftManage").hidden=true;window.scrollTo({top:0})}catch(err){message(byId("shiftManageMessage"),err.message,true)}});
byId("shiftManageForm").addEventListener("submit",async e=>{e.preventDefault();const d=formData(e.currentTarget),shift=shiftData.find(s=>s.id===d.id),site=byId("manageShiftSite").selectedOptions[0];if(!shift)return;if(!await issConfirm("Save shift changes","Confirm the updated shift details and assignments."))return;try{const changes={...d,siteName:site?.textContent||"",assignments:shift.assignments||[]};if(shift.seriesId&&d.seriesScope!=="one")await updateRecurringSeries(currentDashboard.companyId,d.id,changes,d.seriesScope);else await updateShift(currentDashboard.companyId,d.id,changes);message(byId("shiftManageMessage"),"Shift updated successfully.");shiftData=await listShifts(currentDashboard.companyId);renderShifts();byId("shiftManage").hidden=true;window.scrollTo({top:0})}catch(err){message(byId("shiftManageMessage"),err.message,true)}});

let platformData=null;
const renderPlatformUsers=()=>{
  if(!platformData)return;
  const company=byId("platformCompanyFilter").value,role=byId("platformRoleFilter").value,status=byId("platformStatusFilter").value,name=byId("platformNameFilter").value.trim().toLowerCase();
  const users=platformData.users.filter(user=>(!company||user.companyId===company)&&(!role||user.role===role)&&(!status||user.status===status)&&(!name||String(user.name||"").toLowerCase().includes(name)));
  byId("platformUserCount").textContent=users.length+" user"+(users.length===1?"":"s")+" shown";
  byId("platformUserList").innerHTML=users.length?users.map(user=>'<article class="admin-user"><span class="user-avatar">'+escapeHtml((user.name||user.email||"U").split(/\\s+/).map(part=>part[0]).join("").slice(0,2).toUpperCase())+'</span><div><strong>'+escapeHtml(user.name)+'</strong><small>'+escapeHtml(user.email)+'</small></div><div><small>COMPANY</small><span>'+escapeHtml(user.companyName)+'</span></div><div><small>ROLE</small><span>'+escapeHtml(user.role)+'</span></div><div><small>SITE</small><span>'+escapeHtml(user.siteName)+'</span></div><span class="admin-status">'+escapeHtml(user.status)+'</span></article>').join(""):'<div class="empty-sites">No users match these filters.</div>';
};
const renderPlatform=async()=>{
  const data=await getPlatformOverview();
  platformData=data;
  byId("platformCompanies").textContent=String(data.totals.companies);
  byId("platformSites").textContent=String(data.totals.sites);
  byId("platformEmployees").textContent=String(data.totals.employees);
  byId("platformAlerts").textContent=String(data.totals.alerts);
  const companyFilter=byId("platformCompanyFilter"),roleFilter=byId("platformRoleFilter");
  companyFilter.innerHTML='<option value="">All companies</option>'+data.companies.map(company=>'<option value="'+escapeHtml(company.id)+'">'+escapeHtml(company.name)+'</option>').join("");
  const roles=[...new Set(data.users.map(user=>user.role))].sort();
  roleFilter.innerHTML='<option value="">All roles</option>'+roles.map(role=>'<option value="'+escapeHtml(role)+'">'+escapeHtml(role)+'</option>').join("");
  const statuses=[...new Set(data.users.map(user=>user.status).filter(Boolean))].sort();
  byId("platformStatusFilter").innerHTML='<option value="">All statuses</option>'+statuses.map(status=>'<option value="'+escapeHtml(status)+'">'+escapeHtml(status)+'</option>').join("");
  renderPlatformUsers();
  byId("platformAlertList").innerHTML=data.alerts.length?data.alerts.map(alert=>'<article class="admin-alert"><strong>'+escapeHtml(alert.type)+'</strong><span>'+escapeHtml(alert.company)+'</span><small>'+escapeHtml(alert.detail)+'</small></article>').join(""):'<div class="empty-sites">No platform alerts.</div>';
  byId("platformCompanyList").innerHTML=data.companies.length?data.companies.map(company=>'<article class="admin-company"><div><span class="admin-status">'+escapeHtml(company.status)+'</span><h3>'+escapeHtml(company.name)+'</h3><p>'+escapeHtml(company.workspaceSlug?company.workspaceSlug+".imotech.solutions":"No workspace")+'</p></div><div><small>CONTACT</small><span>'+escapeHtml(company.email||"Not set")+'</span><small>'+escapeHtml(company.country||"Country not set")+'</small></div><div class="company-metrics"><div><strong>'+company.siteCount+'</strong><span>Sites</span></div><div><strong>'+company.employeeCount+'</strong><span>Employees</span></div><div><strong>'+company.pendingInvites+'</strong><span>Pending</span></div></div><div><small>REGISTRATION</small><span>'+escapeHtml(company.registrationNumber||"Not set")+'</span><small>'+escapeHtml(company.phone||"No phone")+'</small></div></article>').join(""):'<div class="empty-sites">No companies registered.</div>';
};
byId("platformCompanyFilter").addEventListener("change",renderPlatformUsers);
byId("platformRoleFilter").addEventListener("change",renderPlatformUsers);
byId("platformStatusFilter").addEventListener("change",renderPlatformUsers);
byId("platformNameFilter").addEventListener("input",renderPlatformUsers);
const openSuperadminDashboard=async()=>{
  if(!isSuperAdmin(auth.currentUser))return;
  byId("publicHome").hidden=true;
  byId("companyDashboard").hidden=true;
  byId("teamView").hidden=true;
  byId("sitesView").hidden=true;
  byId("shiftsView").hidden=true;
  byId("platformUsersView").hidden=true;
  byId("superadminDashboard").hidden=false;
  window.scrollTo({top:0});
  await renderPlatform();
};
byId("superadminLaunch").addEventListener("click",openSuperadminDashboard);
byId("openPlatformUsers").addEventListener("click",async()=>{if(!isSuperAdmin(auth.currentUser))return;byId("superadminDashboard").hidden=true;byId("platformUsersView").hidden=false;window.scrollTo({top:0});if(!platformData)await renderPlatform();renderPlatformUsers()});
byId("backPlatformDashboard").addEventListener("click",()=>{byId("platformUsersView").hidden=true;byId("superadminDashboard").hidden=false;window.scrollTo({top:0})});
const legacySuperadminSignOut=byId("superadminSignOut");
if(legacySuperadminSignOut) legacySuperadminSignOut.addEventListener("click",async()=>{await signOutUser();setHeaderUser(null);byId("superadminLaunch").hidden=true;openPublicHome()});

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

const applyAuthenticatedDashboard=(user,data)=>{
  currentDashboard=data||null;
  if(!currentDashboard||!user)return;
  setHeaderUser(user,currentDashboard);
  applyRoleAccess(currentDashboard);
};
window.ISS_APPLY_DASHBOARD=applyAuthenticatedDashboard;
window.addEventListener("iss-dashboard-ready",event=>applyAuthenticatedDashboard(auth.currentUser,event.detail));
if(window.ISS_CURRENT_DASHBOARD&&auth.currentUser)applyAuthenticatedDashboard(auth.currentUser,window.ISS_CURRENT_DASHBOARD);
const sitesView=byId("sitesView"),siteEditor=byId("siteEditor"),siteFormEditor=byId("siteEditorForm");
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const renderSites=sites=>{
  byId("sitesList").innerHTML=sites.length?sites.map(site=>'<article class="site-card" data-site-id="'+escapeHtml(site.id)+'"><div><span class="site-status">'+escapeHtml(site.status||"setup")+'</span><h3>'+escapeHtml(site.name||"Unnamed site")+'</h3><p>'+escapeHtml(site.clientName||"No client")+'</p></div><div class="site-meta"><small>ADDRESS</small><span>'+escapeHtml(site.address||"Not set")+'</span></div><div class="site-meta"><small>CONTACT</small><span>'+escapeHtml(site.contact||"Not set")+'</span><small>'+escapeHtml(site.timezone||"")+'</small></div><div class="site-actions"><button class="secondary edit-site" type="button">Edit</button>'+(site.status==="suspended"?'<button class="secondary delete-site" type="button">Delete</button>':'')+'</div></article>').join(""):'<div class="empty-sites">No sites configured. Add your first security site.</div>';
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
byId("sitesList").addEventListener("click",async e=>{const card=e.target.closest("[data-site-id]");if(!card)return;const id=card.dataset.siteId;if(e.target.closest(".delete-site")){if(currentDashboard?.role!=="Company Owner"&&currentDashboard?.role!=="company_owner")return;if(!confirm("Permanently delete this suspended site?"))return;try{await deleteSite(currentDashboard.companyId,id);await refreshSites()}catch(error){alert(error?.message||"Could not delete site.")}return}if(e.target.closest(".edit-site")){const sites=await listSites(currentDashboard.companyId);showSiteEditor(sites.find(site=>site.id===id))}});
siteFormEditor.addEventListener("submit",async e=>{e.preventDefault();const status=byId("siteEditorMessage"),button=siteFormEditor.querySelector('button[type="submit"]');button.disabled=true;message(status,"Saving site…");try{const data=formData(siteFormEditor);await saveSite(currentDashboard.companyId,data);await refreshSites();siteEditor.hidden=true;message(status,"")}catch(error){console.error(error);message(status,"Could not save site.",true)}finally{button.disabled=false}});

const teamView=byId("teamView"),teamEditor=byId("teamEditor"),teamEditorForm=byId("teamEditorForm");
const renderTeam=invites=>{
  byId("teamList").innerHTML=invites.length?invites.map(invite=>'<article class="site-card team-card" data-invite-id="'+escapeHtml(invite.id)+'"><div><span class="site-status">'+escapeHtml(invite.status||"pending")+'</span><h3>'+escapeHtml(invite.name||invite.email||"Team member")+'</h3><p>'+escapeHtml(invite.email||"")+'</p></div><div class="site-meta"><small>ROLE</small><strong>'+escapeHtml(invite.role||"Officer")+'</strong><small>SITE · '+escapeHtml(invite.siteName||"Company-wide")+'</small></div><div class="site-meta"><small>ACCESS</small><span>'+escapeHtml(invite.status==="active"?"Enabled":invite.status==="suspended"?"Suspended":"Invitation pending")+'</span></div><div class="team-actions"><button class="secondary edit-invite" type="button">Edit</button>'+(invite.status==="suspended"?'<button class="secondary delete-member" type="button">Delete</button>':'<button class="secondary team-status" data-status="suspended" type="button">Suspend</button>')+(invite.status==="pending"?'<button class="secondary copy-invite" type="button">Copy Invite Link</button>':'')+'</div></article>').join(""):'<div class="empty-sites">No team invitations configured.</div>';
};
const refreshTeam=async()=>{
  if(!currentDashboard)return;
  const invites=await listInvitations(currentDashboard.companyId);renderTeam(invites);byId("dashboardTeam").textContent=String(invites.length);applyRoleAccess(currentDashboard);return invites;
};
const openTeamView=async()=>{if(!roleAccess(currentDashboard?.role).team)return;byId("companyDashboard").hidden=true;sitesView.hidden=true;teamView.hidden=false;window.scrollTo({top:0});await refreshTeam()};
byId("openTeam").addEventListener("click",openTeamView);
byId("openTeam").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")openTeamView()});
byId("backTeamDashboard").addEventListener("click",()=>{teamView.hidden=true;byId("companyDashboard").hidden=false;window.scrollTo({top:0})});
const showTeamEditor=async invite=>{teamEditorForm.reset();const sites=await listSites(currentDashboard.companyId);const siteSelect=teamEditorForm.elements.siteId;siteSelect.innerHTML='<option value="company-wide">Company-wide</option>'+sites.map(site=>'<option value="'+escapeHtml(site.id)+'">'+escapeHtml(site.name)+'</option>').join("");teamEditorForm.elements.id.value=invite?.id||"";teamEditorForm.elements.name.value=invite?.name||"";teamEditorForm.elements.email.value=invite?.email||"";teamEditorForm.elements.phone.value=invite?.phone||"";teamEditorForm.elements.role.value=invite?.role||"Officer";siteSelect.value=invite?.siteId||"company-wide";teamEditorForm.elements.status.value=invite?.status||"pending";byId("teamEditorTitle").textContent=invite?"Edit Team Access":"Invite Team Member";teamEditor.hidden=false};
byId("addTeamInvite").addEventListener("click",()=>showTeamEditor(null));
byId("closeTeamEditor").addEventListener("click",()=>teamEditor.hidden=true);
byId("teamList").addEventListener("click",async e=>{const card=e.target.closest("[data-invite-id]");if(!card)return;const id=card.dataset.inviteId;if(e.target.closest(".edit-invite")){const invites=await listInvitations(currentDashboard.companyId);showTeamEditor(invites.find(item=>item.id===id));return}const statusButton=e.target.closest(".team-status");if(statusButton){await setInvitationStatus(currentDashboard.companyId,id,statusButton.dataset.status);await refreshTeam();return}const deleteButton=e.target.closest(".delete-member");if(deleteButton){if(!confirm("Permanently delete this suspended team member?"))return;await deleteTeamMember(currentDashboard.companyId,id);await refreshTeam();return}if(e.target.closest(".copy-invite")){const invites=await listInvitations(currentDashboard.companyId);const invite=invites.find(item=>item.id===id);const url=new URL(window.location.href);url.search="";url.searchParams.set("invite",currentDashboard.companyId+"."+id);url.searchParams.set("email",invite.email||"");await navigator.clipboard.writeText(url.toString());e.target.textContent="Copied"}});
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
