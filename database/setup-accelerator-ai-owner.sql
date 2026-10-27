-- Pin the already verified, connected account and its existing private ChatGPT
-- client. Fail rather than guessing if multiple owners/clients are present.
create table if not exists public.accelerator_ai_settings (
  id integer primary key check (id=1),
  owner_user_id uuid not null references auth.users(id),
  oauth_client_id text not null,
  created_at timestamptz not null default now()
);
alter table public.accelerator_ai_settings enable row level security;
revoke all on public.accelerator_ai_settings from public, anon, authenticated;
grant select, insert, update on public.accelerator_ai_settings to service_role;
do $block$
declare pinned_owner_id uuid; pinned_client_id text;
begin
  select x.user_id,x.client_id into strict pinned_owner_id,pinned_client_id
  from (select distinct c.user_id,c.client_id from public.accelerator_ai_connections c
    where access_hash is not null and revoked_at is null and expires_at>now()) x;
  insert into public.accelerator_ai_settings(id,owner_user_id,oauth_client_id)
  values(1,pinned_owner_id,pinned_client_id) on conflict(id) do nothing;
end;
$block$;
