select c.relname, c.relrowsecurity as rls_enabled,
  has_table_privilege('anon',c.oid,'SELECT') as anonymous_read,
  has_table_privilege('authenticated',c.oid,'SELECT') as user_read,
  has_table_privilege('authenticated',c.oid,'INSERT') as user_write,
  has_table_privilege('service_role',c.oid,'SELECT') as server_read
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in
  ('accelerator_ai_connections','accelerator_ai_codes','accelerator_ai_drafts')
order by c.relname;
-- Expected all three rows: true, false, false, false, true.
