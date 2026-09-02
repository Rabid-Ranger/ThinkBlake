# Accelerator AI V2

This branch is an isolated test copy of Accelerator OS V16.3.6.

- Cloud state is pinned to workspace `e9953426-0a8d-4890-9cf0-4f4ac4e71c46`.
- Production workspace fallback is disabled.
- Browser backups, recovery copies, unsynced drafts, demo markers, native app state, and AI proposal drafts use V2-only storage keys.
- A local Accelerator AI Companion connects the dashboard to Codex App Server using Blake's existing ChatGPT-managed Codex sign-in. It does not require an OpenAI API key.
- Six WebMCP site tools remain available as a secondary Codex-browser route.
- The only write-capable site tool stages a browser-local proposal. It cannot mutate dashboard or cloud state.
- The visible AI Desk reports whether Codex is genuinely connected, the configured model, the ChatGPT account type/plan, and what the AI is allowed to access.
- A fresh browser with no cloud session opens directly in safe demo mode. Codex can read the clearly labelled sample record and stage drafts, but demo mode cannot save to cloud.
- The dashboard receives only non-secret connection metadata (`chatgpt`, plan type, and configured model). OAuth tokens and credentials remain inside Codex.
- LM Studio, MLX, and custom model servers can be added to the same companion later. LM Studio is installed but its local model server was not running during this build.

## First test

1. Open the V2 deployment on the Mac where the companion is installed. A fresh browser starts in demo mode without a cloud-login interruption.
2. Open `AI Desk`. It connects automatically and shows `AI Desk · Codex ready`.
3. Type a question under `Ask Accelerator AI`, then choose `Ask AI`.
4. Review the answer and optionally choose `Stage for review`.
5. A staged answer is browser-only. No dashboard field or cloud record is changed automatically.

## What “connected” means

The V2 dashboard calls a loopback-only companion at `127.0.0.1:4873`. The companion accepts requests only from the V2 branch deployment, its Vercel preview hosts, or local development. It validates the V2 data source, fixes Codex to read-only mode, refuses interactive approvals, and returns a structured review proposal. It never receives a dashboard cloud-write capability.

The companion starts automatically when Blake signs into the Mac. It uses Codex App Server with ChatGPT-managed authentication and the configured model `gpt-5.6-sol`. If the companion is not running, the dashboard stays usable and does not make repeated background connection requests.
