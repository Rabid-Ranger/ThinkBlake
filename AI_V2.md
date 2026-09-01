# Accelerator AI V2

This branch is an isolated test copy of Accelerator OS V16.3.6.

- Cloud state is pinned to workspace `e9953426-0a8d-4890-9cf0-4f4ac4e71c46`.
- Production workspace fallback is disabled.
- Browser backups, recovery copies, unsynced drafts, demo markers, native app state, and AI proposal drafts use V2-only storage keys.
- WebMCP site tools expose the current V2 context to Codex in the built-in browser.
- The only write-capable site tool stages a browser-local proposal. It cannot mutate dashboard or cloud state.

## First test

1. Open the V2 deployment in Codex's built-in browser and sign into the cloud when prompted.
2. Confirm the page shows the `AI V2` button.
3. Ask Codex to read the current Accelerator context and creator record.
4. Ask Codex to stage one recommendation.
5. Review it in the `AI V2` drawer. Copy or discard it; no dashboard field is changed automatically.
