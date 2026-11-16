# Update: Supabase development foundation created and tested

See [SUPABASE.md](SUPABASE.md) for the current database state. The provisioning blockers below describe the earlier checkpoint and are now resolved. UI integration remains pending.

# Delivery checkpoint — 2026-11-13

## Verified state

- GitHub installation corrected. README creation succeeded: 7435628d8dd5d239cc7d653b91da9e23f7d5b800. The baseline files are being committed in this session.
- Existing Vercel project: prj_4zaVjM9yL6Qf7tx4SNnqfEXwTN3h, team team_CvoDSE3VTWAr3d54377dR7P5.
- Vercel integration and environment variable lists are empty.
- Supabase is connected. Organization VB_org (nvsrfyqskhdvltkhsvuc) has no projects. User confirmation of the organization for creation remains pending. No database, auth or storage service was provisioned.
- No deployment, migration, invitation email or scheduled task was changed.

## Prepared locally

- Exact V6 frontend under public/, isolated from documentation and tests.
- Reproducible npm dependency lock, DOM regression tests and CI workflow.
- Static Vercel configuration. CI configuration is included in the baseline; its first remote run must be checked.

## Unblock and first working increment

1. GitHub write access is now verified by a successful commit.
2. Obtain confirmation to create the Supabase development project in VB_org, then provision with cost confirmation if required. Connect it to the existing Vercel preview environment.
3. Commit this baseline; create a backend branch and PR. Link the repository to Vercel only after inspecting project/root/output/build settings. Keep preview and production databases separate.
4. Introduce Next.js/TypeScript around the approved V6 interface, preserving the source baseline. Provision auth and database before implementing provider-specific integration.
5. Implement sign-in, an authenticated workspace, project create/list, and a persisted questionnaire draft. Add explicit saving/saved/error states. No simulated fallback when the database is unavailable.
6. Validate with two sessions: create, edit, refresh, sign out/in, recover the same draft. Test denial for a nonmember. Present a real preview after these pass.

## Data model to implement

- workspaces, memberships (owner/editor/viewer); projects linked to workspaces.
- project_memberships if a workspace member must be restricted to particular projects.
- surveys linked to projects; survey_drafts with version counter for optimistic concurrency.
- immutable survey_versions storing a validated questionnaire snapshot at publication.
- submissions referencing a published version; answers referencing stable question/option IDs.
- private documents linked to project and uploader; invitations with expiry and one-time tokens; audit events.

Enforce access in API and database policies. Never trust client-supplied user IDs or roles. Use atomic updates with an expected revision; return a conflict instead of overwriting another analyst. Validate published routing, reject unknown question IDs, and enforce uniqueness for submission idempotency keys.

## Subsequent delivery gates

1. Editor: sections, question types, required fields, branching, preview and conflict recovery.
2. Collection: published immutable version, respondent mobile URL, server validation, resume, closure, atomic quotas and duplicate-submission handling. Respondents must not require Vercel login; retain analyst authentication.
3. Results: real aggregates, partial/complete/excluded distinctions, valid CSV/XLSX, golden dataset parity tests, spreadsheet formula-injection protection.
4. Launch: cross-project access tests, load target agreed with user, error monitoring, rate limits, backup restoration rehearsal, rollback and retention/deletion procedures, small analyst pilot.
5. AI: parse actual Word content, show proposed questions for approval, bounded asynchronous jobs, deterministic calculations, evidence-linked analysis, actual Word/PPTX artifacts.

## Prototype behaviors requiring replacement

`importModal`: checks filename extension then opens predefined GovTech questions. `startLive`: increments counts on a timer. `exportWord`, `dlPptx`, and `data-exp` handlers: animate then show a toast without creating files. Project invitation toast does not send mail. These features must be clearly marked or disabled in a real-data pilot until implemented.

## Definition of ready to ship

A real analyst can sign in, create a questionnaire, publish it, receive an external expert response and export consistent results; permissions, recovery, observability and rollback are verified. Passing frontend regression tests alone does not meet this gate.
