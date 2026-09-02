# Accelerator AI V2

This branch is an isolated test copy of Accelerator OS V16.3.6.

- Cloud state is pinned to workspace `e9953426-0a8d-4890-9cf0-4f4ac4e71c46`.
- Production workspace fallback is disabled.
- Browser backups, recovery copies, unsynced drafts, demo markers, native app state, and AI proposal drafts use V2-only storage keys.
- A local Accelerator AI Companion connects the dashboard to Codex App Server using Blake's existing ChatGPT-managed Codex sign-in. It does not require an OpenAI API key.
- Six WebMCP site tools remain available as a secondary Codex-browser route.
- The only write-capable site tool stages a browser-local proposal. It cannot mutate dashboard or cloud state.
- AI now drafts inside the work instead of answering in a page-level bar. Supported fields show `Draft with AI` when blank and `Refine with AI` when completed.
- Audience, Message, Business, Viewer, Research, Promise, Package, Hook and Learning also offer a whole-section draft. When blank fields exist, the request is restricted to those blanks.
- Coaching Review, Decide, Coach and Commit can be prefilled directly inside the call flow from the active creator record.
- Applying a suggestion creates a normal dashboard edit only after Blake chooses `Use`. It then travels through the existing save path rather than an AI-specific cloud write.
- Upstream edits create a review queue for the downstream decisions they may affect. The queue is deduplicated by creator, video and affected surface.
- Every action uses a narrow server-owned context profile. For example, a hook request receives the creator's audience, message, active month, exact viewer, promise, saved title/thumbnail, proof assets and relevant same-job examples—not the entire dashboard and not old AI drafts.
- Field actions return only structured values for server-approved dashboard bindings. The browser validates the binding again before showing or applying it.
- The Learn page drafts directly into Observe, Interpret, Decide and Next move, keeping facts separate from causal interpretation.
- Readiness gates run before AI. If a result, promise, title, research source or other required input is missing, the dashboard names that input immediately and makes no model call. AI is never asked to fabricate the missing evidence.
- `AI settings & review` reports the active route/model, shows the downstream review queue and explains the active workflow automations. Custom chat remains available but is no longer the primary interaction.
- A fresh browser with no cloud session opens directly in safe demo mode. Codex can read the clearly labelled sample record and stage drafts, but demo mode cannot save to cloud.
- The dashboard receives only non-secret connection metadata (`chatgpt`, plan type, and configured model). OAuth tokens and credentials remain inside Codex.
- `AI settings & review` can test, save, select and forget Codex models, LM Studio, MLX and custom OpenAI-compatible model servers. The active route is persistent on this Mac and is always visible.
- `Automatic` routing is the default. Fast evidence/timing checks use the quickest available Codex model, normal creator decisions use the selected model, and diagnosis, packaging, results and reporting use the strongest available reasoning model. The actual provider, model, task depth and confidence are shown on every answer.
- `Fixed` routing remains available in `AI settings & review` when Blake wants every task to use the model selected below.
- Custom server API keys are stored in macOS Keychain. They are never put in dashboard state, browser storage, Supabase, or the Vercel deployment.
- Automatic fallback is enabled: the selected route is tried first, followed by connected configured routes. The response reports when a fallback route answered.

## First test

1. Open the V2 deployment on the Mac where the companion is installed. A fresh browser starts in demo mode without a cloud-login interruption.
2. Work normally. Use `Draft with AI` or `Refine with AI` beside a field, or use the one section-level drafting action.
3. Review the suggested value directly below the field. Choose `Use suggestion`, `Try another`, or `Dismiss`.
4. For a section draft, use one field at a time or choose `Use all drafts`.
5. Open a coaching call to test phase-specific prefill, or open Learn to draft Observe → Interpret → Decide → Next move.
6. Open `AI settings & review` to see the active route, model, automations and any downstream decisions flagged by your edits.

`AI settings & review` remains the connection, routing and review hub. Use it to see the active route, choose automatic or fixed routing, switch among the Codex models available to the signed-in ChatGPT account, or connect a fallback server:

1. Start the LM Studio or MLX OpenAI-compatible server first.
2. Open `AI settings & review` and enter its local server address. The defaults are `http://127.0.0.1:1234/v1` for LM Studio and `http://127.0.0.1:8080/v1` for MLX.
3. Choose `Test & save`. The companion verifies the server and reads the models it actually reports.
4. Choose `Use this route`. The active provider and model update throughout the dashboard.
5. Choose `Forget` to remove a saved route. If it used a key, the companion also removes that key from macOS Keychain.

For the simplest Mac test, open `http://127.0.0.1:4873/dashboard`. It serves the same V2 dashboard and connects to the same isolated Supabase cloud workspace, while avoiding Chrome's public-site-to-local-service permission boundary. The Vercel V2 link also requests Chrome's one-time Local Network Access permission when AI settings are opened; if Chrome blocks it, use the local link shown there.

## What “connected” means

The V2 dashboard calls a loopback-only companion at `127.0.0.1:4873`. The companion accepts requests only from the V2 branch deployment, its Vercel preview hosts, or local development. It validates the V2 data source, fixes Codex to read-only mode, refuses interactive approvals, and returns a structured review proposal. It never receives a dashboard cloud-write capability.

The companion starts automatically when Blake signs into the Mac. It uses Codex App Server with ChatGPT-managed authentication and starts with `gpt-5.6-sol`, while `AI settings & review` also exposes the other models the current ChatGPT account actually reports. If the companion is not running, the dashboard stays usable and does not make repeated background connection requests.
