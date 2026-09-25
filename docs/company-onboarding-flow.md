# ISS Company Onboarding Flow

ISS is a multi-tenant security operations platform for small and medium security companies. The first account created for a company is the **Company Owner**. An Operations Manager may also create a company when authorised to do so.

## Entry points

The public ISS landing page should use:

- **Create Company Account** — new security company/workspace.
- **Sign In** — existing company users.

Officer, supervisor and controller role selection should not appear on the public landing page. Those users are invited into an existing company workspace.

## Onboarding sequence

### Step 1 — Account
Collect:
- First name
- Last name
- Work email
- Password
- Account type: Company Owner or Operations Manager
- Accept terms/privacy

Email verification is required before workspace activation.

### Step 2 — Company
Collect:
- Legal/company name
- Trading name (optional)
- Country
- Company phone
- Company email
- Website (optional)
- Company registration number (optional initially)
- Company logo (optional; can skip)

The creator becomes the initial **Company Owner**. If the creator selected Operations Manager, the workspace records that role but requires an Owner to be assigned/invited before ownership-sensitive actions can be transferred.

### Step 3 — Workspace
Generate a URL-safe workspace slug from the trading/company name.

Example:

```
Company: Alpha Security Ltd
Suggested slug: alpha-security
Workspace: alpha-security.<ISS-DOMAIN>
```

Rules:
- lowercase
- letters, numbers and hyphens only
- unique across ISS
- reserved words blocked
- show availability before continuing
- allow user to edit the suggested slug before creation
- once operational, slug changes should be an admin-controlled action

The production domain remains configurable until the ISS domain is selected.

### Step 4 — First site
Collect:
- Site name
- Client name
- Site address
- Site timezone
- Site contact (optional)
- Operational status defaults to setup

Offer **Skip for now** so company creation is never blocked by site setup.

### Step 5 — Team
Invite by email:
- Operations Manager
- Controller
- Supervisor
- Team Leader
- Officer

Invitations belong to the company and optionally a site. Users never choose another company's workspace themselves.

Offer **Skip for now**.

### Step 6 — Operations setup
Configure:
- Shift pattern or first shift
- Patrol requirement
- Opening procedure
- Closing procedure
- Emergency/site instructions

Use sensible defaults and allow skipping advanced setup.

### Step 7 — Review and launch
Show:
- Company
- Workspace URL
- First site
- Invited team count
- Operations setup status

Primary action: **Launch Company Dashboard**

## First dashboard experience

On first launch, use a setup checklist rather than an empty dashboard:

1. Complete company profile
2. Add first site
3. Invite staff
4. Configure site procedures
5. Create first shift
6. Configure patrols

Completed items disappear/collapse while operational data gradually replaces setup guidance.

## Roles and account creation

| Role | Can create company? | How account is obtained |
| --- | --- | --- |
| Company Owner | Yes | Public registration |
| Operations Manager | Yes, when authorised | Public registration or invite |
| Controller | No | Company invite |
| Supervisor | No | Company invite |
| Team Leader | No | Company invite |
| Officer | No | Company invite |
| Client | No | Company invite/client access |

## Tenant boundaries

Every company receives a unique `companyId` and `workspaceSlug`.

All operational entities must resolve to a company tenant:

```
Company
  ├── Users / Invitations
  ├── Clients
  └── Sites
       ├── Shifts
       ├── Patrols
       ├── Incidents
       ├── Procedures
       └── Activity
```

A user may only access company data through an active company membership and assigned role. Client users are restricted to their client/site scope.

## Onboarding states

Suggested company onboarding state:

```
account_created
email_verified
company_created
workspace_reserved
site_setup
team_setup
operations_setup
active
```

Store completion per step so onboarding can resume after sign-out or interruption.

## Subdomain architecture

The application should eventually support wildcard tenant routing:

```
*.ISS-DOMAIN → ISS application
```

The application reads the hostname, resolves `workspaceSlug`, then loads the corresponding company tenant.

Do not provision separate application deployments per customer.

Later premium/enterprise plans may map custom domains to the same tenant.

## Security requirements for implementation

- Never trust the hostname alone for authorisation.
- Authenticate the user and verify active company membership.
- Enforce `companyId` isolation in backend/database security rules.
- Reserve system slugs such as `www`, `admin`, `api`, `app`, `support`, `mail` and `status`.
- Rate-limit workspace availability checks and company creation.
- Keep owner-only actions distinct from operational-manager permissions.
- Log ownership, role and workspace changes in the audit trail.

## MVP boundary

This flow defines product behaviour only. It does not yet implement:
- authentication provider
- database collections
- DNS/wildcard routing
- email invitations
- billing/subscriptions
- custom domains

Those should be connected after the onboarding UI and tenant contract are agreed.
