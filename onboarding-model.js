/**
 * ISS company onboarding contract.
 * Product-state model only; persistence/authentication are intentionally deferred.
 */

export const ISSCompanyOnboarding = Object.freeze({
  steps: [
    "account",
    "company",
    "workspace",
    "site",
    "team",
    "operations",
    "review"
  ],

  companyCreatorRoles: ["company_owner", "operations_manager"],

  inviteOnlyRoles: [
    "controller",
    "supervisor",
    "team_leader",
    "officer",
    "client"
  ],

  states: [
    "account_created",
    "email_verified",
    "company_created",
    "workspace_reserved",
    "site_setup",
    "team_setup",
    "operations_setup",
    "active"
  ],

  workspace: {
    slugPattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
    reservedSlugs: [
      "www",
      "admin",
      "api",
      "app",
      "support",
      "mail",
      "status",
      "login",
      "signin",
      "signup"
    ],
    routing: "*.ISS-DOMAIN",
    tenantKey: "companyId"
  },

  firstDashboardChecklist: [
    "complete_company_profile",
    "add_first_site",
    "invite_staff",
    "configure_site_procedures",
    "create_first_shift",
    "configure_patrols"
  ]
});
