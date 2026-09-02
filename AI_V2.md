# Accelerator AI V2

This branch is an isolated test copy of Accelerator OS V16.3.6.

- Cloud state is pinned to workspace `e9953426-0a8d-4890-9cf0-4f4ac4e71c46`.
- Production workspace fallback is disabled.
- Browser backups, recovery copies, unsynced drafts, demo markers, native app state, and AI proposal drafts use V2-only storage keys.
- Six WebMCP site tools expose the current V2 context and connection boundary to Codex in the built-in browser.
- The only write-capable site tool stages a browser-local proposal. It cannot mutate dashboard or cloud state.
- The visible AI Desk reports whether Codex is genuinely connected, where the model is selected, what the tools can access, and the last real tool call.
- A fresh browser with no cloud session opens directly in safe demo mode. Codex can read the clearly labelled sample record and stage drafts, but demo mode cannot save to cloud.
- The dashboard cannot see the Codex account, ChatGPT plan, or exact model name. Those remain controlled inside Codex.
- LM Studio, MLX, and custom model servers are shown as unavailable until a local Accelerator Companion is paired. Vercel cannot directly reach a model running on the user's Mac.

## First test

1. Open the V2 deployment in Codex's built-in browser. A fresh browser starts in demo mode without a cloud-login interruption.
2. Confirm the page shows `AI Desk · Codex connected`. If it says `Not connected`, enable site tools in Codex browser permissions and reload.
3. Ask Codex to read the current Accelerator context and creator record.
4. Ask Codex to stage one recommendation.
5. Review it in the `AI Desk`. Copy or discard it; no dashboard field is changed automatically.

## What “connected” means

The current V2 uses Codex as the AI runtime. The dashboard provides tools; it does not contain its own chatbot or make model calls. The active model and ChatGPT sign-in are selected and managed in Codex. The page can only verify that Codex discovered its tools. Demo data and isolated-cloud data are identified separately in both the AI Desk and tool results.

An embedded provider switcher requires a separate local companion service. That companion would be responsible for securely pairing the dashboard with Codex App Server, LM Studio, MLX, or another OpenAI-compatible server. Until that service exists and passes pairing checks, the AI Desk must not mark those routes active.
