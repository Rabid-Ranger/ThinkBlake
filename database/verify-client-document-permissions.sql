-- Read-only regression check. Impersonates an existing workspace owner
-- inside a transaction; role and JWT settings are rolled back.
begin;
do $$ declare m record; begin
  select workspace_id,user_id into m from public.workspace_members
  where role='owner' limit 1;
  if m.user_id is null then raise exception 'No workspace owner to test'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',m.user_id,'role','authenticated')::text,true);
  perform set_config('qa.workspace',m.workspace_id::text,true);
end $$;
set local role authenticated;
select
  public.is_workspace_member(current_setting('qa.workspace')::uuid) as own_workspace_allowed,
  public.is_workspace_member('00000000-0000-0000-0000-000000000000'::uuid) as unrelated_workspace_allowed,
  public.is_workspace_member(current_setting('qa.workspace')::uuid,'00000000-0000-0000-0000-000000000000'::uuid) as other_user_allowed,
  exists (
    select 1 from public.workspace_members m
    where m.workspace_id::text=(storage.foldername(current_setting('qa.workspace')||'/creator/file.txt'))[1]
      and m.user_id=auth.uid() and m.role in ('owner','admin','editor')
  ) as upload_policy_passes;
-- Expected: true, false, false, true. Before repair: permission denied.
rollback;
