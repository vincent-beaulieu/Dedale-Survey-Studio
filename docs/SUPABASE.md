# Supabase development foundation

Project: dedale-survey-studio-dev / pjcaqjcmkubeyryfxlkl
Organization: VB_org. Region: eu-west-3 (Paris).
Status verified ACTIVE_HEALTHY. No production database was created.

Applied migration: workspace_foundation (source under supabase/migrations).
Tables: workspaces, workspace_members, projects, survey_drafts.
All four tables enforce row-level security. Authenticated members can read; writes go through explicit RPCs with authentication and membership checks. No direct authenticated table writes are granted. Roles: owner, editor, viewer. Workspace membership is the current access boundary; per-project membership and invitations are not yet implemented.

Saving a draft uses a revision comparison in the same UPDATE. Stale saves fail with SQLSTATE 40001. Drafts have an envelope check and a 1 MiB size bound; full question/branch validation is still to implement.

Executed supabase/tests/workspace_access.sql successfully in the development database. Test auth users and fixtures were rolled back. Tests cover owner create/read/save, stale-save conflict, invalid envelope, viewer read/write denial, role-escalation denial, outsider read/create denial and anonymous RPC denial.

Security advisory: three authenticated SECURITY DEFINER RPC warnings remain intentional for create_workspace, create_project and save_survey_draft. Each fixes search_path, authenticates/authorizes explicitly and revokes anonymous execution. No claim of a complete production security audit. Details: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

Next: configure project URL/publishable key in Vercel preview, implement authenticated UI and sessions, connect V6 to the RPCs, test sign-in/save/reload/logout end-to-end. No keys are committed; no real user has been registered by this work. No end-to-end browser persistence test has passed yet. The existing static preview remains unchanged.
