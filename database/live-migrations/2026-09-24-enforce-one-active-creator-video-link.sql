create unique index if not exists creator_portal_one_active_video_link
  on public.creator_portal_links(workspace_id, creator_id, video_id)
  where revoked_at is null and scope = 'video' and video_id is not null;
