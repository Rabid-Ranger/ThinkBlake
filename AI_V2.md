# Accelerator AI V2

This branch is an isolated test copy of Accelerator OS V16.3.6.

- Cloud state is pinned to workspace `e9953426-0a8d-4890-9cf0-4f4ac4e71c46`.
- Production workspace fallback is disabled.
- Browser backups, recovery copies, unsynced drafts, demo markers, native app state, and AI proposal drafts use V2-only storage keys.
- A local Accelerator AI Companion connects the dashboard to Codex App Server using Blake's existing ChatGPT-managed Codex sign-in. It does not require an OpenAI API key.
- Six WebMCP site tools remain available as a secondary Codex-browser route.
- The only write-capable site tool stages a browser-local proposal. It cannot mutate dashboard or cloud state.
- A quiet `AI assist` row now appears beside the decisions it can actually help with in Home, Strategy, Plan, every step of the video builder, Learn, Framework, Creators, Calendar, and the Decision Library.
- The primary action follows the work on screen. Strategy changes between audience, message and business checks; the video builder changes between viewer, research, promise, package, hook, structure, CTA and handoff checks.
- Every action uses a narrow server-owned context profile. For example, a hook request receives the creator's audience, message, active month, exact viewer, promise, saved title/thumbnail, proof assets and relevant same-job examples—not the entire dashboard and not old AI drafts.
- Formula actions return one reusable bracketed formula plus one filled creator-specific example. Package and portfolio actions return no more than three compact options. Learning actions separate observation, interpretation and decision.
- Readiness gates run before AI. If a result, promise, title, research source or other required input is missing, the dashboard names that input immediately and makes no model call. AI is never asked to fabricate the missing evidence.
- The visible AI Desk reports the genuinely active route and model, the ChatGPT account type/plan when Codex is active, and what the AI is allowed to access.
- A fresh browser with no cloud session opens directly in safe demo mode. Codex can read the clearly labelled sample record and stage drafts, but demo mode cannot save to cloud.
- The dashboard receives only non-secret connection metadata (`chatgpt`, plan type, and configured model). OAuth tokens and credentials remain inside Codex.
- AI Desk can test, save, select, and forget Codex models, LM Studio, MLX, and custom OpenAI-compatible model servers. The active route is persistent on this Mac and is always visible.
- `Automatic` routing is the default. Fast evidence/timing checks use the quickest available Codex model, normal creator decisions use the selected model, and diagnosis, packaging, results and reporting use the strongest available reasoning model. The actual provider, model, task depth and confidence are shown on every answer.
- `Fixed` routing remains available in AI Desk when Blake wants every task to use the model selected below.
- Custom server API keys are stored in macOS Keychain. They are never put in dashboard state, browser storage, Supabase, or the Vercel deployment.
- Automatic fallback is enabled: the selected route is tried first, followed by connected configured routes. The response reports when a fallback route answered.

## First test

1. Open the V2 deployment on the Mac where the companion is installed. A fresh browser starts in demo mode without a cloud-login interruption.
2. Work normally. A small `AI assist` row appears where the current decision can benefit from it; it is not a separate AI workflow.
3. Choose the single suggested check. Less common checks are behind `•••`.
4. Review the concise answer inline and optionally choose `Keep for review`, `Copy`, or `Think deeper`.
5. A staged answer is browser-only. No dashboard field or cloud record is changed automatically.

AI Desk remains the connection, routing and review hub. Use it to see the active route, choose automatic or fixed routing, switch among the Codex models available to the signed-in ChatGPT account, or connect a fallback server:

1. Start the LM Studio or MLX OpenAI-compatible server first.
2. Open `AI Desk` and enter its local server address. The defaults are `http://127.0.0.1:1234/v1` for LM Studio and `http://127.0.0.1:8080/v1` for MLX.
3. Choose `Test & save`. The companion verifies the server and reads the models it actually reports.
4. Choose `Use this route`. The active provider and model update throughout the dashboard.
5. Choose `Forget` to remove a saved route. If it used a key, the companion also removes that key from macOS Keychain.

For the simplest Mac test, open `http://127.0.0.1:4873/dashboard`. It serves the same V2 dashboard and connects to the same isolated Supabase cloud workspace, while avoiding Chrome's public-site-to-local-service permission boundary. The Vercel V2 link also requests Chrome's one-time Local Network Access permission when AI Desk is opened; if Chrome blocks it, use the local link shown inside AI Desk.

## What “connected” means

The V2 dashboard calls a loopback-only companion at `127.0.0.1:4873`. The companion accepts requests only from the V2 branch deployment, its Vercel preview hosts, or local development. It validates the V2 data source, fixes Codex to read-only mode, refuses interactive approvals, and returns a structured review proposal. It never receives a dashboard cloud-write capability.

The companion starts automatically when Blake signs into the Mac. It uses Codex App Server with ChatGPT-managed authentication and starts with `gpt-5.6-sol`, while AI Desk also exposes the other models the current ChatGPT account actually reports. If the companion is not running, the dashboard stays usable and does not make repeated background connection requests.
