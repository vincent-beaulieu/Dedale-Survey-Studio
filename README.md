# Dedale Survey Studio

Development pilot connected to Supabase. The original V6 remains at `/demo.html`; `/` is the authenticated workspace using its fonts, logo and UI tokens.

## Run

Node 24, `npm ci --ignore-scripts`. Set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (publishable key only). Run `npm run build`, then serve `public/` over HTTP. Build output is generated, not committed. `npm test` runs prototype regression tests. `scripts/live-check.mjs` is an explicit integration test requiring a disposable development account outside the repository; never use customer credentials.

## Implemented

Email/password sign-in, account creation request, workspace creation/list, projects, draft editor (single/multiple choice, short/long text, number and scale), debounced save, explicit save, revision conflict protection, reload and sign-out. All data is scoped by Supabase row-level security; no service-role key is used. Supabase SDK manages session persistence and refresh.

The existing vanilla frontend is retained for this increment. Supabase provides authentication, API and database; a Next.js migration is not needed for these operations and is deferred until server-specific features justify it.

## Pilot limitations

Email/password signup requires confirmed email. Configure Supabase Authentication URL Configuration with the preview URL and custom SMTP before inviting a team. Default Supabase email delivery is restricted; self-service signup delivery is not validated by the automated fixture test. A project owner can provision a confirmed pilot account through Supabase Authentication for initial testing. Do not disable confirmation for production.

No invitations, per-project roles, production deployment, public respondent collection, full branching, validated exports or AI integration yet. The demo remains simulated and is separate from stored projects. Development data only until launch gates pass. See docs/CONNECTED-PILOT.md.
