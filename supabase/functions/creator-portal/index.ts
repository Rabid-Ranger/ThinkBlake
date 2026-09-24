
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const legacyAnon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const legacyService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const publishable = (() => {
  try { return JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}").default || legacyAnon; }
  catch { return legacyAnon; }
})();
const secret = (() => {
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default || legacyService; }
  catch { return legacyService; }
})();
if (!SUPABASE_URL || !secret) throw new Error("Supabase function secrets are not configured.");

const admin = createClient(SUPABASE_URL, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const encoder = new TextEncoder();
const allowedOrigins = (origin: string | null) =>
  !origin ||
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin) ||
  /^https:\/\/accelerator-os-rho\.vercel\.app$/i.test(origin) ||
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

function cors(req: Request) {
  const origin = req.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": allowedOrigins(origin) ? (origin || "*") : "null",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function text(value: unknown, max = 20000) {
  if (value == null) return "";
  return String(value).replace(/\u0000/g, "").slice(0, max);
}
function bool(value: unknown) { return value === true; }
function tokenValue() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function validId(value: unknown, max = 160) {
  const v = text(value, max).trim();
  if (!v || !/^[A-Za-z0-9_.:\/-]+$/.test(v)) throw new Error("Invalid identifier.");
  return v;
}
function sanitizeTasks(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 20).map((t: any, i: number) => ({
    id: text(t?.id || "task-" + i, 120),
    text: text(t?.text, 1000),
  })).filter((t: any) => t.text);
}
function sanitizeCompleted(input: unknown, allowed: Set<string>) {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map(x => text(x, 120)).filter(x => allowed.has(x)))].slice(0, 20);
}
function sanitizeCoachVideo(v: any) {
  const tasks = sanitizeTasks(v?.coach?.tasks);
  return {
    id: validId(v?.id),
    coach: {
      title: text(v?.coach?.title, 500),
      thumbnailText: text(v?.coach?.thumbnailText, 500),
      thumbnailConcept: text(v?.coach?.thumbnailConcept, 4000),
      hookDraft: text(v?.coach?.hookDraft, 12000),
      viewer: text(v?.coach?.viewer, 4000),
      promiseResult: text(v?.coach?.promiseResult, 4000),
      outlineNotes: text(v?.coach?.outlineNotes, 20000),
      direction: text(v?.coach?.direction, 12000),
      stage: text(v?.coach?.stage, 120),
      publishDate: text(v?.coach?.publishDate, 120),
      tasks,
    },
    creator: {
      titleDraft: text(v?.creator?.titleDraft, 500),
      thumbnailTextDraft: text(v?.creator?.thumbnailTextDraft, 500),
      thumbnailConceptDraft: text(v?.creator?.thumbnailConceptDraft, 4000),
      hookDraft: text(v?.creator?.hookDraft, 12000),
      viewerDraft: text(v?.creator?.viewerDraft, 4000),
      promiseResultDraft: text(v?.creator?.promiseResultDraft, 4000),
      outlineNotesDraft: text(v?.creator?.outlineNotesDraft, 20000),
      notes: text(v?.creator?.notes, 12000),
      status: text(v?.creator?.status, 120),
      readyForReview: bool(v?.creator?.readyForReview),
      completedTaskIds: sanitizeCompleted(v?.creator?.completedTaskIds, new Set(tasks.map((t:any)=>t.id))),
    }
  };
}
function sanitizeCoachPayload(input: any, prior: any = null) {
  const creator = input?.creator || {};
  const priorVideos = new Map((prior?.videos || []).map((v: any) => [String(v.id), v]));
  const incoming = Array.isArray(input?.videos) ? input.videos.slice(0, 50) : [];
  const videos = incoming.map((raw: any) => {
    const clean = sanitizeCoachVideo(raw);
    const old = priorVideos.get(clean.id);
    if (old?.creator) {
      const tasks = new Set(clean.coach.tasks.map((t:any)=>t.id));
      clean.creator = {
        titleDraft: text(old.creator.titleDraft, 500),
        thumbnailTextDraft: text(old.creator.thumbnailTextDraft, 500),
        thumbnailConceptDraft: text(old.creator.thumbnailConceptDraft, 4000),
        hookDraft: text(old.creator.hookDraft, 12000),
        viewerDraft: text(old.creator.viewerDraft, 4000),
        promiseResultDraft: text(old.creator.promiseResultDraft, 4000),
        outlineNotesDraft: text(old.creator.outlineNotesDraft, 20000),
        notes: text(old.creator.notes, 12000),
        status: text(old.creator.status, 120),
        readyForReview: bool(old.creator.readyForReview),
        completedTaskIds: sanitizeCompleted(old.creator.completedTaskIds, tasks),
      };
    }
    return clean;
  });
  return {
    schemaVersion: 1,
    creator: {
      id: validId(creator.id),
      name: text(creator.name, 500),
      channelName: text(creator.channelName, 500),
      instructions: text(creator.instructions, 12000),
    },
    videos,
  };
}
function mergeCreatorPayload(prior: any, incoming: any) {
  const byId = new Map((Array.isArray(incoming?.videos) ? incoming.videos : []).map((v: any) => [String(v?.id || ""), v]));
  const videos = (prior?.videos || []).map((base: any) => {
    const inc: any = byId.get(String(base.id)) || {};
    const allowedTasks = new Set((base.coach?.tasks || []).map((t:any)=>String(t.id)));
    return {
      ...base,
      creator: {
        titleDraft: text(inc?.creator?.titleDraft, 500),
        thumbnailTextDraft: text(inc?.creator?.thumbnailTextDraft, 500),
        thumbnailConceptDraft: text(inc?.creator?.thumbnailConceptDraft, 4000),
        hookDraft: text(inc?.creator?.hookDraft, 12000),
        viewerDraft: text(inc?.creator?.viewerDraft, 4000),
        promiseResultDraft: text(inc?.creator?.promiseResultDraft, 4000),
        outlineNotesDraft: text(inc?.creator?.outlineNotesDraft, 20000),
        notes: text(inc?.creator?.notes, 12000),
        status: text(inc?.creator?.status, 120),
        readyForReview: bool(inc?.creator?.readyForReview),
        completedTaskIds: sanitizeCompleted(inc?.creator?.completedTaskIds, allowedTasks),
      }
    };
  });
  return { ...prior, videos };
}
async function authenticatedUser(req: Request) {
  const header = req.headers.get("Authorization") || "";
  const jwt = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!jwt || !publishable) return null;
  const client = createClient(SUPABASE_URL, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: "Bearer " + jwt } },
  });
  const { data, error } = await client.auth.getUser(jwt);
  if (error || !data?.user) return null;
  return data.user;
}
async function assertWorkspace(userId: string, workspaceId: string) {
  const { data, error } = await admin.from("workspace_members")
    .select("role").eq("workspace_id", workspaceId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data || !["owner","admin","editor"].includes(data.role)) throw new Error("WORKSPACE_FORBIDDEN");
}
async function activeLinkForToken(token: string) {
  if (!token || token.length < 24 || token.length > 200) return null;
  const hash = await hashToken(token);
  const { data, error } = await admin.from("creator_portal_links")
    .select("id, workspace_id, creator_id, creator_name, scope, video_id, expires_at, revoked_at")
    .eq("token_hash", hash).maybeSingle();
  if (error) throw error;
  if (!data || data.revoked_at) return null;
  if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) return null;
  return data;
}
async function readDocument(linkId: string) {
  const { data, error } = await admin.from("creator_portal_documents")
    .select("payload,version,last_actor,creator_revision,coach_seen_creator_revision,creator_updated_at,coach_updated_at,updated_at")
    .eq("link_id", linkId).maybeSingle();
  if (error) throw error;
  return data;
}
async function activity(linkId: string, actor: string, action: string, details: any = {}) {
  await admin.from("creator_portal_activity").insert({ link_id: linkId, actor, action, details });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "METHOD_NOT_ALLOWED" }, 405);
  if (!allowedOrigins(req.headers.get("Origin"))) return json(req, { error: "ORIGIN_NOT_ALLOWED" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json(req, { error: "INVALID_JSON" }, 400); }
  const actionName = text(body?.action, 80);

  try {
    if (actionName === "portal-get") {
      const link = await activeLinkForToken(text(body?.token, 220));
      if (!link) return json(req, { error: "LINK_NOT_FOUND_OR_REVOKED" }, 404);
      const doc = await readDocument(link.id);
      if (!doc) return json(req, { error: "WORKSPACE_NOT_PUBLISHED" }, 404);
      return json(req, {
        link: { id: link.id, creatorName: link.creator_name, scope: link.scope },
        document: {
          payload: doc.payload,
          version: Number(doc.version),
          creatorRevision: Number(doc.creator_revision || 0),
          updatedAt: doc.updated_at,
        }
      });
    }

    if (actionName === "portal-save") {
      const token = text(body?.token, 220);
      const link = await activeLinkForToken(token);
      if (!link) return json(req, { error: "LINK_NOT_FOUND_OR_REVOKED" }, 404);
      const doc = await readDocument(link.id);
      if (!doc) return json(req, { error: "WORKSPACE_NOT_PUBLISHED" }, 404);
      const expected = Number(body?.version);
      if (!Number.isInteger(expected) || expected !== Number(doc.version)) {
        return json(req, {
          error: "VERSION_CONFLICT",
          document: { payload: doc.payload, version: Number(doc.version), creatorRevision: Number(doc.creator_revision || 0), updatedAt: doc.updated_at }
        }, 409);
      }
      const merged = mergeCreatorPayload(doc.payload, body?.payload || {});
      const nextVersion = Number(doc.version) + 1;
      const nextCreatorRevision = Number(doc.creator_revision || 0) + 1;
      const { data, error } = await admin.from("creator_portal_documents")
        .update({
          payload: merged,
          version: nextVersion,
          creator_revision: nextCreatorRevision,
          last_actor: "creator",
          creator_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("link_id", link.id).eq("version", doc.version)
        .select("version,creator_revision,updated_at").maybeSingle();
      if (error) throw error;
      if (!data) return json(req, { error: "VERSION_CONFLICT" }, 409);
      const readyIds = merged.videos.filter((v:any)=>v.creator?.readyForReview).map((v:any)=>v.id);
      await activity(link.id, "creator", readyIds.length ? "saved_ready_for_review" : "saved_changes", { readyVideoIds: readyIds });
      return json(req, { ok: true, version: Number(data.version), creatorRevision: Number(data.creator_revision), updatedAt: data.updated_at });
    }

    const user = await authenticatedUser(req);
    if (!user) return json(req, { error: "AUTH_REQUIRED" }, 401);
    const workspaceId = validId(body?.workspaceId, 80);
    await assertWorkspace(user.id, workspaceId);
    const creatorId = validId(body?.creatorId, 160);

    if (actionName === "owner-get") {
      const requestedVideoId = body?.videoId ? validId(body.videoId, 160) : null;
      let query = admin.from("creator_portal_links")
        .select("id,creator_id,creator_name,scope,video_id,token_secret,expires_at,revoked_at,created_at,updated_at")
        .eq("workspace_id", workspaceId).eq("creator_id", creatorId).is("revoked_at", null)
        .eq("scope", requestedVideoId ? "video" : "creator");
      query = requestedVideoId ? query.eq("video_id", requestedVideoId) : query.is("video_id", null);
      const { data: links, error } = await query.order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      const link = links?.[0] || null;
      if (!link) return json(req, { link: null, document: null });
      const doc = await readDocument(link.id);
      return json(req, {
        link: { id: link.id, creatorName: link.creator_name, scope: link.scope, videoId: link.video_id, token: link.token_secret, expiresAt: link.expires_at, createdAt: link.created_at, updatedAt: link.updated_at },
        document: doc ? {
          payload: doc.payload,
          version: Number(doc.version),
          creatorRevision: Number(doc.creator_revision || 0),
          coachSeenCreatorRevision: Number(doc.coach_seen_creator_revision || 0),
          needsReview: Number(doc.creator_revision || 0) > Number(doc.coach_seen_creator_revision || 0),
          creatorUpdatedAt: doc.creator_updated_at,
          coachUpdatedAt: doc.coach_updated_at,
          updatedAt: doc.updated_at,
        } : null
      });
    }

    if (actionName === "publish") {
      const rawPayload = body?.payload || {};
      const requestedVideoId = body?.videoId ? validId(body.videoId, 160) : null;
      const linkScope = requestedVideoId ? "video" : "creator";
      let query = admin.from("creator_portal_links")
        .select("id,token_secret,creator_name,scope,video_id")
        .eq("workspace_id", workspaceId).eq("creator_id", creatorId)
        .eq("scope", linkScope).is("revoked_at", null);
      query = requestedVideoId ? query.eq("video_id", requestedVideoId) : query.is("video_id", null);
      const { data: links, error: findError } = await query.order("created_at",{ascending:false}).limit(1);
      if (findError) throw findError;
      let link = links?.[0] || null;
      let created = false;
      if (!link) {
        const token = tokenValue();
        const hash = await hashToken(token);
        const { data: inserted, error } = await admin.from("creator_portal_links").insert({
          workspace_id: workspaceId,
          creator_id: creatorId,
          creator_name: text(rawPayload?.creator?.name, 500),
          scope: linkScope,
          video_id: requestedVideoId,
          token_hash: hash,
          token_secret: token,
          created_by: user.id,
        }).select("id,token_secret,creator_name,scope,video_id").single();
        if (error) throw error;
        link = inserted; created = true;
      } else {
        const { error } = await admin.from("creator_portal_links").update({
          creator_name: text(rawPayload?.creator?.name, 500),
          updated_at: new Date().toISOString(),
        }).eq("id", link.id);
        if (error) throw error;
      }

      const prior = await readDocument(link.id);
      const sanitized = sanitizeCoachPayload(rawPayload, prior?.payload || null);
      if (sanitized.creator.id !== creatorId) return json(req, { error: "CREATOR_ID_MISMATCH" }, 400);
      if (requestedVideoId && (sanitized.videos.length !== 1 || sanitized.videos[0]?.id !== requestedVideoId)) {
        return json(req, { error: "VIDEO_SCOPE_MISMATCH" }, 400);
      }
      const now = new Date().toISOString();
      if (!prior) {
        const { error } = await admin.from("creator_portal_documents").insert({
          link_id: link.id,
          payload: sanitized,
          version: 1,
          last_actor: "coach",
          creator_revision: 0,
          coach_seen_creator_revision: 0,
          coach_updated_at: now,
          updated_at: now,
        });
        if (error) throw error;
      } else {
        const { error } = await admin.from("creator_portal_documents").update({
          payload: sanitized,
          version: Number(prior.version) + 1,
          last_actor: "coach",
          coach_updated_at: now,
          updated_at: now,
        }).eq("link_id", link.id);
        if (error) throw error;
      }
      await activity(link.id, "coach", created ? "created_share_link" : "published_workspace", { scope: linkScope, videoId: requestedVideoId, videoCount: sanitized.videos.length });
      const doc = await readDocument(link.id);
      return json(req, {
        ok: true,
        link: { id: link.id, token: link.token_secret, creatorName: sanitized.creator.name, scope: linkScope, videoId: requestedVideoId },
        document: doc ? {
          payload: doc.payload,
          version: Number(doc.version),
          creatorRevision: Number(doc.creator_revision || 0),
          coachSeenCreatorRevision: Number(doc.coach_seen_creator_revision || 0),
          needsReview: Number(doc.creator_revision || 0) > Number(doc.coach_seen_creator_revision || 0),
          updatedAt: doc.updated_at
        } : null
      });
    }

    if (actionName === "ack") {
      const linkId = validId(body?.linkId, 80);
      const { data: link, error } = await admin.from("creator_portal_links")
        .select("id").eq("id",linkId).eq("workspace_id",workspaceId).eq("creator_id",creatorId).is("revoked_at",null).maybeSingle();
      if (error) throw error;
      if (!link) return json(req, { error: "LINK_NOT_FOUND" }, 404);
      const doc = await readDocument(linkId);
      if (!doc) return json(req, { error: "WORKSPACE_NOT_PUBLISHED" }, 404);
      const { error: updateError } = await admin.from("creator_portal_documents").update({
        coach_seen_creator_revision: Number(doc.creator_revision || 0),
        updated_at: new Date().toISOString(),
      }).eq("link_id", linkId);
      if (updateError) throw updateError;
      await activity(linkId, "coach", "reviewed_creator_changes", { creatorRevision: Number(doc.creator_revision || 0) });
      return json(req, { ok: true, coachSeenCreatorRevision: Number(doc.creator_revision || 0) });
    }

    if (actionName === "rotate") {
      const requestedVideoId = body?.videoId ? validId(body.videoId, 160) : null;
      const linkScope = requestedVideoId ? "video" : "creator";
      let oldQuery = admin.from("creator_portal_links")
        .select("id").eq("workspace_id",workspaceId).eq("creator_id",creatorId)
        .eq("scope",linkScope).is("revoked_at",null);
      oldQuery = requestedVideoId ? oldQuery.eq("video_id",requestedVideoId) : oldQuery.is("video_id",null);
      const { data: oldLinks, error } = await oldQuery.limit(1);
      if (error) throw error;
      const old = oldLinks?.[0];
      let priorPayload: any = null;
      if (old) {
        priorPayload = (await readDocument(old.id))?.payload || null;
        await admin.from("creator_portal_links").update({ revoked_at:new Date().toISOString(), updated_at:new Date().toISOString() }).eq("id",old.id);
        await activity(old.id,"coach","rotated_link",{ scope:linkScope, videoId:requestedVideoId });
      }
      const token = tokenValue(), hash = await hashToken(token);
      const payload = sanitizeCoachPayload(body?.payload || priorPayload || {creator:{id:creatorId,name:""},videos:[]}, priorPayload);
      if (requestedVideoId && (payload.videos.length !== 1 || payload.videos[0]?.id !== requestedVideoId)) {
        return json(req, { error:"VIDEO_SCOPE_MISMATCH" }, 400);
      }
      const { data: newLink, error: insertError } = await admin.from("creator_portal_links").insert({
        workspace_id:workspaceId, creator_id:creatorId, creator_name:payload.creator.name,
        scope:linkScope, video_id:requestedVideoId, token_hash:hash, token_secret:token, created_by:user.id
      }).select("id,token_secret,scope,video_id").single();
      if (insertError) throw insertError;
      await admin.from("creator_portal_documents").insert({
        link_id:newLink.id,payload,version:1,last_actor:"coach",creator_revision:0,coach_seen_creator_revision:0,
        coach_updated_at:new Date().toISOString(),updated_at:new Date().toISOString()
      });
      await activity(newLink.id,"coach","created_rotated_link",{ scope:linkScope, videoId:requestedVideoId });
      return json(req,{ok:true,link:{id:newLink.id,token:newLink.token_secret,creatorName:payload.creator.name,scope:linkScope,videoId:requestedVideoId}});
    }

    if (actionName === "revoke") {
      const linkId = validId(body?.linkId, 80);
      const { data: link, error } = await admin.from("creator_portal_links")
        .select("id").eq("id",linkId).eq("workspace_id",workspaceId).eq("creator_id",creatorId).is("revoked_at",null).maybeSingle();
      if (error) throw error;
      if (!link) return json(req,{error:"LINK_NOT_FOUND"},404);
      await admin.from("creator_portal_links").update({revoked_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",linkId);
      await activity(linkId,"coach","revoked_link",{});
      return json(req,{ok:true});
    }

    return json(req, { error: "UNKNOWN_ACTION" }, 400);
  } catch (error) {
    const message = String(error?.message || error || "SERVER_ERROR");
    if (message === "WORKSPACE_FORBIDDEN") return json(req, { error: message }, 403);
    console.error("creator-portal error", message);
    return json(req, { error: "SERVER_ERROR" }, 500);
  }
});
