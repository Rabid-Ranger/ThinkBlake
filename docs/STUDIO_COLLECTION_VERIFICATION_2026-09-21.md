# Studio collection release verification

This release builds on main cfffbbb and carries forward the analytics evidence review fixes. It supersedes the preview-only status in analytics-review-verification.md. It does not include preview login changes or automatic demo seeding.

## User flow
Analytics → Studio prompts → Recommended update → Copy prompt. Start with up to five videos at one checkpoint. Paste the reply, review every available metric and its source, confirm, then Save results. After saving, continue to Analytics, collect another batch, or open optional missing fields. Audience and channel requests are separate. Other checkpoints and the previous full-setup requests remain under an expandable section.

If the reply is prose or a table rather than usable JSON, Copy format follow-up asks the same Studio conversation to reformat its existing answer. It does not start the large research request again. Direct CSV/table parsing is not introduced. Studio access varies; an unavailable field is not automatically a manual task.

Incomplete video revisions that would remove a saved measurement are skipped and explained; other valid rows remain reviewable. Duplicate-only video replies have no save action. Starting baselines, compatible metric comparisons and diagnosis confirmation remain in place.

## Evidence
- 119 unit tests passed, including six new behavior tests for batch scope, saved-value follow-up, adjacent completed date ranges, format-only recovery, incomplete revision protection, and duplicate/revision review rows.
- Browser story covers real clipboard copy, setup switch, audience/format recovery, reviewed import, explicit confirmation, success state, all-metric review, audience revision, manual correction and stale-editor rejection, refresh, native diagnosis, mobile overflow, and zero cloud POSTs in isolated Demo Mode.
- 30 controlled cloud safety checks passed: read-only startup, demo isolation, restored analytics payload, local fallback, offline recovery, unknown-base and changed-version conflicts.
- 71 full dashboard regression checks passed: routes, creator lifecycle, channel shortcuts, formula population, seven handoffs, PDF control, responsive navigation, and no runtime errors.
- Save queue / PDF checks passed, including immediate browser backup, ordered cloud versions, simulated failure retry, and a valid nonempty PDF.
- Historical release harnesses were updated to serve the current analytics/AI/UI assets and to recognize the current title. The full dashboard harness checks complete status text and tooltip while preserving the current fixed-width status design.

## Boundaries
All automated analytics measurements and authenticated cloud responses are synthetic fixtures. No real creator data was imported or edited. Actual Ask Studio retrieval has not been tested against a real source report. No universal field-access or strict-JSON guarantee is made. The application source bundle and persistence API remain unchanged; no database migration or credential changes.

Deployment and exact commit/tree verification are recorded in the permanent workspace handoff after publication.
