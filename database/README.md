# Accelerator OS database changes

`live-migrations/` is the audit trail for database changes already applied to the live Supabase project. It exists so application deployments and database behavior cannot drift apart.

The workspace state remains independent from the website bundle. A normal software deployment must not seed, replace, or rewrite `public.workspace_states`; only authenticated user edits may call `public.save_workspace_state`.
