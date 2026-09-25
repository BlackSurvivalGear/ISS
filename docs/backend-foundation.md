# Backend foundation

ISS uses Firebase Authentication and Cloud Firestore as the first persistent backend.

## Collections
- `users/{uid}` — identity, company membership and role
- `companies/{companyId}` — tenant/company record
- `companies/{companyId}/sites/*` — company sites
- `companies/{companyId}/invitations/*` — pending role invitations
- `companies/{companyId}/settings/operations` — initial operations configuration
- `workspaceSlugs/{slug}` — global workspace → tenant lookup

The hostname is only a tenant selector. Authorization is always checked against the authenticated user's company membership.

## Setup
1. Create/select the ISS Firebase project and register a Web App.
2. Enable Email/Password Authentication.
3. Create Cloud Firestore.
4. Put the public Web App configuration into `firebase-config.js`.
5. Deploy `firestore.rules`.
6. Wire the existing onboarding forms to `registerCompany()` in `backend.js`.

Company-logo persistence is intentionally deferred to Storage/Cloudinary; the current UI preview remains session-local.
