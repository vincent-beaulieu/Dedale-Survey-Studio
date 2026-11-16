# Connected pilot

Supabase: pjcaqjcmkubeyryfxlkl, development only. Vercel PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY configured for preview/development, not production. The only browser credential is a publishable key; table policies and RPC authorization enforce access.

Original V6 HTML is unchanged at /demo.html. Real-data workspace shares its stylesheet, embedded typefaces and logo. Simulated fieldwork and exports are not exposed as real actions in the connected workspace.

Draft payloads: schemaVersion=1, sections with id/title/qs; each question has stable id, type, text, opts, req. There is currently one editable section. Routing, sections UI and advanced question types remain later increments.

Conflict RPC now raises PT409 (HTTP 409), instead of a transaction serialization failure (HTTP 500). This is an expected application conflict and must not be retried blindly. The user retains their edits and explicitly reloads the newer version. Edits during a successful save are saved again; edits during failed saves remain dirty. Leaving with unsaved changes triggers a browser warning.

Account setup: add the final pilot origin under Supabase Authentication URL Configuration and configure an email provider for general team signup. Existing confirmed accounts can sign in immediately. Email delivery is outside the fixture tests; password reset and invitations remain pending. Do not use a service-role key in browser code.

Verification results are reported in the PR. No claim of production readiness or end-user email confirmation delivery.
