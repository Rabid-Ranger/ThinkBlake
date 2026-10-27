-- Dedicated connector storage. OAuth tokens are opaque, hashed, and cannot be
-- used as Supabase sessions. No grants to anon/authenticated, even with RLS.
create table if not exists public.accelerator_ai_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  creator_id text not null,
  resource_ids jsonb not null default '[]'::jsonb,
  client_id text not null,
  access_hash text unique,
  refresh_hash text unique,
  access_expires_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.accelerator_ai_codes (
  code_hash text primary key,
  connection_id uuid not null references public.accelerator_ai_connections(id) on delete cascade,
  client_id text not null,
  redirect_uri text not null,
  code_challenge text not null,
  resource text not null,
  expires_at timestamptz not null default (now() + interval '5 minutes')
);
create table if not exists public.accelerator_ai_drafts (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.accelerator_ai_connections(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  creator_id text not null,
  request_id text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(connection_id,request_id)
);
create index if not exists accelerator_ai_drafts_client on public.accelerator_ai_drafts(workspace_id,creator_id,created_at desc);
create index if not exists accelerator_ai_connections_owner on public.accelerator_ai_connections(user_id,workspace_id,creator_id);
alter table public.accelerator_ai_connections enable row level security;
alter table public.accelerator_ai_codes enable row level security;
alter table public.accelerator_ai_drafts enable row level security;
revoke all on public.accelerator_ai_connections, public.accelerator_ai_codes, public.accelerator_ai_drafts from public, anon, authenticated;
grant select, insert, update, delete on public.accelerator_ai_connections, public.accelerator_ai_codes, public.accelerator_ai_drafts to service_role;

-- Deliberately no workspace_states writes, OAuth login changes, or new grants
-- on existing client data. The connector checks membership on every request.
