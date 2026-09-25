import { registerCompany, signIn } from "./backend.js";

const byId=id=>document.getElementById(id);
const formData=form=>Object.fromEntries(new FormData(form).entries());
const message=(el,text,error=false)=>{el.textContent=text;el.classList.toggle("error",error)};

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
    byId("operations").scrollIntoView({behavior:"smooth",block:"start"});
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
    await signIn(data.email,data.password);
    byId("signin").hidden=true;
    byId("operations").scrollIntoView({behavior:"smooth",block:"start"});
    message(status,"Signed in.");
  }catch(error){
    console.error(error);
    message(status,"Sign-in failed. Check your email and password.",true);
  }finally{button.disabled=false}
});
