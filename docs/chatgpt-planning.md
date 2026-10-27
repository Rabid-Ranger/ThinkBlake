# ChatGPT planning connection

ChatGPT runs inference under the user's ChatGPT product limits. Accelerator
exposes data and a draft-submission tool; it makes **no model API calls** and
requires no OpenAI API key. Existing Vercel/Supabase hosting and storage usage
still apply. Custom-plugin eligibility is determined by ChatGPT account and
workspace settings, not by this server.

## User workflow

1. In Accelerator, choose a client and click **ChatGPT**.
2. In ChatGPT Plugins → Add → Add custom MCP server, name it Accelerator and use
   `https://accelerator-os-rho.vercel.app/api/accelerator-ai`.
3. Choose OAuth and Client ID Metadata Documents (CIMD). The server supports
   public-client authorization-code exchange with mandatory PKCE S256.
4. On Accelerator's approval screen, choose all clients/resources in the current
   workspace, or one client with selected resources. Approve access. It expires
   after 30 days. Workspace access includes future clients and resources.
5. In a research chat, select Accelerator and ask it to read the selected context
   and resources. Existing research chats remain in ChatGPT; the dashboard does
   not import chat history.
6. Refine the proposed Reach/Trust/Convert plan in chat. Ask ChatGPT to send a
   draft for coach review when ready.
7. Open ChatGPT → Refresh drafts in Accelerator. Edit and select candidate
   videos, then add them to the plan. Only matching **empty** slots are filled;
   excess candidates become new pipeline videos. Existing videos are preserved.
8. Disconnect a connection from the same screen to revoke it immediately.

## Tools

Current release: V16.3.9 / MCP 1.1.0. Six tools, with five reads and one draft submission.

- `get_client_analytics`: paged read-only saved evidence. Start with `overview`,
  then choose `observations`, `baselines`, `channel`, `audience` or
  `manual_video_results`. Use `windowHours` only for video/baseline sections;
  `videoId` only for observation/native-video sections. Follow `nextOffset`.
  Engine rates stay ratios; native/manual percentages stay percentage values.
  Exact-age checkpoints, source definitions, revisions, cohort IDs and missing
  values remain intact. Stored data is not automatically certified as verified.
  This tool does not collect Studio data, calculate a diagnosis, or write data.

`get_client_context` now includes saved capacity, roadmap, foundation fields,
notes, commitments and assignments. Video summaries default to 20 per page,
maximum 40; follow `videoPage.nextOffset` using `videoOffset`. Supply `videoId`
to get that video's actual package/packaging, hook, structure, script, CTA and
handoff fields plus saved learning notes. No embedded image bytes, storage paths
or credential-named fields are included. Nested strings/arrays are bounded and
limits are disclosed in each response. Files still require `read_resource`.

The existing ChatGPT panel now has **Start with a task**: video plan, call prep,
focused video review, saved-analytics learning, or strategy clarification. The
chosen request is copied for use in ChatGPT. It does not start a model call in
the hosted dashboard. Only plan candidates can be sent back through the existing
draft/review flow; other suggestions are reviewed and edited by the coach.

The historical descriptions below document the original connection; the
owner-only update and current release details take precedence where expanded.

- `list_clients`: lists clients available through the connection. Workspace-wide
  grants include all clients in the authorized workspace. Each following tool
  requires a `creatorId` so different clients are never silently mixed.

- `get_client_context`: chosen authorized client's strategy, current plan, up to 100
  existing videos, 12 most recent coaching summaries, and selected resource
  metadata. Embedded images and credential-like fields are omitted.
- `read_resource`: selected resource only. Reads uploaded PDF text, text, CSV,
  TSV, Markdown and JSON, paginated in 24,000-character segments. PDF extraction
  uses `unpdf@1.9.1`, caps input at 20 MB and 200 pages, and does not run embedded
  JavaScript. Scans require direct attachment/visual review in ChatGPT. External
  links return their URL; they are not fetched by this server. Use the matching
  connected app or authorized browser for Google Sheets and other linked docs.
- `submit_plan_draft`: saves 1–12 candidate ideas, with stable retry request ID,
  sources, rationale, title provenance and uncertainty. No tool applies plans or
  writes `workspace_states`. The coach applies approved ideas in authenticated UI.

## Security and deployment

- Vercel `/api/accelerator-ai` is a transport proxy. The Supabase function
  `accelerator-ai` implements scoped OAuth and validates every protected action.
  Function-level legacy JWT verification is disabled because MCP tokens are
  opaque connector tokens, not Supabase JWTs. The function enforces its own auth.
- Built-in Supabase Auth/OAuth settings and existing user permissions are unchanged.
- The consent action verifies the user's existing Supabase session, checks
  owner/admin/editor membership, and validates client/resource IDs from cloud data.
- Client metadata is fetched only from ChatGPT's known HTTPS OAuth metadata paths,
  with redirects disabled. Return addresses must match the published metadata.
- Codes are single-use, expire in five minutes, and bind client, return address,
  resource, and S256 challenge. Only hashes of codes and tokens are stored.
- Access tokens expire after one hour. Refresh tokens rotate atomically and grant
  expiry is fixed at 30 days. Membership and revocation are checked on every call.
- Tokens cannot be used as database, storage, or dashboard sessions. They only
  work through this server's four narrow tools.
- Connector tables have RLS enabled and no privileges for PUBLIC, anon, or
  authenticated. Only the server role can use them. Its secret remains in the
  Supabase function environment, never in Vercel, browser code, or plugin config.
- SQL source: `database/setup-accelerator-ai.sql`. Applied to project
  `pqggobwpazihraeqvspc` on 2026-10-27. No client state was seeded or rewritten.
- `.well-known` discovery routes are in `vercel.json`. They expose metadata only.
- No arbitrary URL fetch, code execution, deletion tool, automatic model call,
  is exposed to ChatGPT. Client listing is restricted to the authorized workspace.

## Validation

`node --test tests/accelerator-ai.test.js tests/creator-save-queue.test.js tests/creator-portal.test.js tests/client-documents.test.js`

The local browser fixture verifies editing and selectively approving candidates,
filling an empty slot, preserving an existing video, and cloud-save confirmation.
The real account connection is active. ChatGPT lists the installed read and draft
tools, and Accelerator shows workspace-wide access.

Official references:

- https://developers.openai.com/api/docs/guides/custom-mcp-server
- https://developers.openai.com/plugins/build/auth

## Workspace-wide consent update (2026-10-27)

The user explicitly requested access to all Accelerator clients and resources.
New workspace-wide grants use the reserved pair `creator_id = "*"` and
`resource_ids = ["*"]`. Both values must match; older client grants never expand
automatically. No database schema or existing RLS permissions changed. Every
tool still checks current workspace membership, and every file read validates
the chosen client and storage prefix. Drafts retain the actual chosen creator ID.

## Owner-only privacy and shared library (2026-10-27)

The personal development plugin was not publicly published. In addition, the
backend now pins the verified existing owner and the existing private ChatGPT
OAuth client in `accelerator_ai_settings`. All dashboard management, token
issuance/refresh and protected tool calls check this pin. Another workspace
member cannot authorize or use this plugin. Missing settings fail closed.
Settings have RLS and no PUBLIC/anon/authenticated privileges. The live settings
were checked against the existing issued connection without exposing tokens.
SQL: `database/setup-accelerator-ai-owner.sql`.

The ChatGPT panel contains a shared research library in
`state.workspaceResources`. Files use the private Storage folder
`<workspace>/_shared/…`; metadata and links save through the existing versioned
workspace-saving path. `list_workspace_resources` discovers shared references.
Use `read_resource` with `resourceScope="workspace"` to read one. Client-specific
grants do not inherit shared library access. Linked private documents still need
the corresponding authorized browser/app; URLs are not fetched by this server.

Text reading additionally supports `.docx` and `.xlsx` using `fflate@0.8.2` to
unpack only relevant XML, with an 8 MB extracted XML limit. Macros and formulas
are never executed. Word extraction omits images/layout and caps paragraphs/text.
Excel extraction uses cached cell values, caps sheets/rows/cells, and discloses
those limits. Other formats and scanned PDFs may need direct ChatGPT attachment.

The standalone Packaging Lab tab and its injected implementation were removed.
Video-planner title/thumbnail steps remain part of the guided video workflow.
Primary navigation never wraps individual tabs; narrower layouts give the whole
navigation its own row. Weekly analytics uses the existing browser connection
and import UI; see `weekly-analytics-workflow.md`.
