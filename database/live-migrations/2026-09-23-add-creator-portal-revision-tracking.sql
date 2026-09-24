alter table public.creator_portal_documents
  add column if not exists creator_revision bigint not null default 0,
  add column if not exists coach_seen_creator_revision bigint not null default 0;
alter table public.creator_portal_documents
  add constraint creator_portal_seen_not_negative check (coach_seen_creator_revision >= 0),
  add constraint creator_portal_revision_not_negative check (creator_revision >= 0);
