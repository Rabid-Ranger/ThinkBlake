# Accelerator AI V2

This branch is an isolated test copy of Accelerator OS V16.3.6.

- Cloud state is pinned to workspace `e9953426-0a8d-4890-9cf0-4f4ac4e71c46`.
- Production workspace fallback is disabled.
- Browser backups, recovery copies, unsynced drafts, demo markers, native app state, and AI proposal drafts use V2-only storage keys.
- A local Accelerator AI Companion connects the dashboard to Codex App Server using Blake's existing ChatGPT-managed Codex sign-in. It does not require an OpenAI API key.
- Six WebMCP site tools remain available as a secondary Codex-browser route.
- The only write-capable site tool stages a browser-local proposal. It cannot mutate dashboard or cloud state.
- Contextual AI decision support now appears directly in Home, Strategy, Plan, Videos, Learn, Framework, Creators, Calendar, and the Decision Library.
- Every contextual request carries the active creator strategy, audience, message, diagnosis, plan, current video, coaching history, commitments, learnings, reports, and recently reviewed AI drafts that are relevant to the decision.
- Formula and template requests require both a reusable bracketed template and one filled creator-specific example. Learning and report requests must separate observation, interpretation, confidence, decision, and missing evidence.
- The visible AI Desk reports the genuinely active route and model, the ChatGPT account type/plan when Codex is active, and what the AI is allowed to access.
- A fresh browser with no cloud session opens directly in safe demo mode. Codex can read the clearly labelled sample record and stage drafts, but demo mode cannot save to cloud.
- The dashboard receives only non-secret connection metadata (`chatgpt`, plan type, and configured model). OAuth tokens and credentials remain inside Codex.
- AI Desk can now test, save, select, and forget Codex models, LM Studio, MLX, and custom OpenAI-compatible model servers. The active route is persistent on this Mac and is always visible.
- Custom server API keys are stored in macOS Keychain. They are never put in dashboard state, browser storage, Supabase, or the Vercel deployment.
- Automatic fallback is enabled: the selected route is tried first, followed by connected configured routes. The response reports when a fallback route answered.

## First test

1. Open the V2 deployment on the Mac where the companion is installed. A fresh browser starts in demo mode without a cloud-login interruption.
2. Work normally in Home, Strategy, Plan, Videos, Learn, Framework, Creators, Calendar, or the Library. The AI panel on that page offers the decisions appropriate to that part of the workflow.
3. Choose a decision prompt or ask a specific question about the page.
4. Review the answer inline and optionally choose `Stage for review` or `Copy`.
5. A staged answer is browser-only. No dashboard field or cloud record is changed automatically.

AI Desk remains the connection and review hub. Use it to see the active route, switch among the Codex models available to the signed-in ChatGPT account, or connect a fallback server:

1. Start the LM Studio or MLX OpenAI-compatible server first.
2. Open `AI Desk` and enter its local server address. The defaults are `http://127.0.0.1:1234/v1` for LM Studio and `http://127.0.0.1:8080/v1` for MLX.
3. Choose `Test & save`. The companion verifies the server and reads the models it actually reports.
4. Choose `Use this route`. The active provider and model update throughout the dashboard.
5. Choose `Forget` to remove a saved route. If it used a key, the companion also removes that key from macOS Keychain.

For the simplest Mac test, open `http://127.0.0.1:4873/dashboard`. It serves the same V2 dashboard and connects to the same isolated Supabase cloud workspace, while avoiding Chrome's public-site-to-local-service permission boundary. The Vercel V2 link also requests Chrome's one-time Local Network Access permission when AI Desk is opened; if Chrome blocks it, use the local link shown inside AI Desk.

## What “connected” means

The V2 dashboard calls a loopback-only companion at `127.0.0.1:4873`. The companion accepts requests only from the V2 branch deployment, its Vercel preview hosts, or local development. It validates the V2 data source, fixes Codex to read-only mode, refuses interactive approvals, and returns a structured review proposal. It never receives a dashboard cloud-write capability.

The companion starts automatically when Blake signs into the Mac. It uses Codex App Server with ChatGPT-managed authentication and starts with `gpt-5.6-sol`, while AI Desk also exposes the other models the current ChatGPT account actually reports. If the companion is not running, the dashboard stays usable and does not make repeated background connection requests.
