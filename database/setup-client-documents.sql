-- Apply once in the Accelerator Supabase SQL editor before enabling uploads.
-- Does not modify workspace_states or existing creator data.
begin;
-- Storage executes as authenticated, unlike owner-run workspace RPCs.
-- Repair the existing helper used by workspace_members RLS. Restrict its
-- user argument before granting access; anonymous callers remain blocked.
create or replace function public.is_workspace_member(
  p_workspace_id uuid, p_user_id uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public
as $function$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace_id and wm.user_id = p_user_id
      and (p_user_id = auth.uid() or coalesce(auth.jwt()->>'role','') = 'service_role')
  );
$function$;
revoke all on function public.is_workspace_member(uuid,uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid,uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-documents', 'client-documents', false, 20971520, null)
on conflict (id) do nothing;

create policy "Workspace editors upload client PDFs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'client-documents'
  and exists (
    select 1 from public.workspace_members m
    where m.workspace_id::text = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'editor')
  )
);
create policy "Workspace members read client PDFs"
on storage.objects for select to authenticated
using (
  bucket_id = 'client-documents'
  and exists (
    select 1 from public.workspace_members m
    where m.workspace_id::text = (storage.foldername(name))[1]
      and m.user_id = (select auth.uid())
  )
);
commit;

-- Applied October 27, 2026: accept all file formats in the existing private bucket.
update storage.buckets set allowed_mime_types = null where id = 'client-documents';
