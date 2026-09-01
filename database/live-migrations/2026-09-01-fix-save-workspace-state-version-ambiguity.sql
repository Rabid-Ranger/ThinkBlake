-- Applied to Supabase project pqggobwpazihraeqvspc on 2026-09-01.
-- Audit copy only: this records the exact live repair for future deployments.
-- The workspace_states archive trigger remains responsible for history rows.

create or replace function public.save_workspace_state(
  p_workspace_id uuid,
  p_expected_version bigint,
  p_state jsonb
)
returns table(version bigint, updated_at timestamptz, conflict boolean)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_version bigint;
  v_updated_at timestamptz;
begin
  if not public.has_workspace_role(p_workspace_id, array['owner', 'admin', 'editor']) then
    raise exception 'Workspace is read-only for this user';
  end if;

  update public.workspace_states as ws
  set state = p_state,
      version = ws.version + 1,
      updated_by = auth.uid(),
      updated_at = now()
  where ws.workspace_id = p_workspace_id
    and ws.version = p_expected_version
  returning ws.version, ws.updated_at
  into v_version, v_updated_at;

  if found then
    return query select v_version, v_updated_at, false;
    return;
  end if;

  select ws.version, ws.updated_at
    into v_version, v_updated_at
  from public.workspace_states as ws
  where ws.workspace_id = p_workspace_id;

  return query
  select coalesce(v_version, 0), coalesce(v_updated_at, now()), true;
end;
$function$;

revoke all on function public.save_workspace_state(uuid, bigint, jsonb) from public;
revoke all on function public.save_workspace_state(uuid, bigint, jsonb) from anon;
grant execute on function public.save_workspace_state(uuid, bigint, jsonb) to authenticated;
