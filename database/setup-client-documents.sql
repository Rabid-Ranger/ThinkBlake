-- Apply once in the Accelerator Supabase SQL editor before enabling uploads.
-- Does not modify workspace_states or existing creator data.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-documents', 'client-documents', false, 20971520, array['application/pdf'])
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
