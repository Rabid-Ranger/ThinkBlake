# Studio collection: make the existing workflow usable

## Problem and intended outcome
Blake needs available YouTube measurements to reach the existing Analytics and coaching workflow with minimal manual collection. Large all-in-one prompts ask for too much, incomplete replies are difficult to recover, and the save screen does not expose enough of the received measurements.

Keep the live layout and conditional diagnosis. Default to a five-video batch at one checkpoint, offer separate audience and channel requests, and offer a targeted missing-fields request. Review every metric before an explicit save. Never erase known values with an incomplete Studio revision. Make optional manual entry a fallback, not the next mandatory task.

## Authority and inherited data
Use current main cfffbbb and the active coaching Playbook / analytics research reviewed in STUDIO_ANALYTICS_REVIEW_2026-09-21.md. Retain compatible measurement definitions, exact-age video comparisons, dated 90-day channel periods, separate rolling-28-day audience snapshots, and starting/operating baseline history. Carry forward the verified analytics review fixes from b1a31d; exclude the preview login bypass and auto-demo changes. No client data migration or seeding.

## Scope
- Guided single-checkpoint batch prompts; keep advanced full collection optional.
- Separate audience and channel requests, with actual requested date ranges.
- Format-only recovery for prose/table replies, without re-requesting unavailable data.
- Missing-field follow-up based on saved rows; refuse incomplete replacements.
- Review all incoming video metrics and report context; explicit save and clear optional follow-up.
- Keep coaching to the strongest supported next move, preserve winners, and require repeated evidence before changing diagnosis.

## Verification
Unit tests for prompt scope, dates, null preservation, duplicate handling, and review rows. Browser test through copy, paste, review, save, follow-up, manual correction, reload, diagnosis, and mobile. Run the release/persistence checks before publication. Verify deployed script hashes and load. Actual Ask Studio account retrieval remains unverified unless compared with a source report; never promise access to every field.
