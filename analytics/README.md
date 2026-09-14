# Live Analytics

Adds only the Analytics navigation/page to the existing production loader. API/source and cloud-first persistence are unchanged. The page is adapted from the selected Decision Desk Analytics implementation; the Decision Desk Home, AI and research overlays are not installed.

Copy Studio prompt → paste complete JSON → review actual channel, source/window and changes → confirm/save. Missing metrics remain null. Ask Studio may not provide every requested report; use Advanced Mode exports to obtain unavailable source data. One fenced JSON block may be surrounded by explanatory prose; ambiguous/multiple blocks and prose-only answers are rejected without writes. A copyable format follow-up helps recover. Default collection is exact first-seven-day data, not all windows at once.

The pure engine stores immutable observations and baseline versions per creator in analyticsFoundation. The first baseline needs five eligible source-verified values, preferably 10–20. Each compatible age/format/era/definition group updates after four distinct new eligible uploads; the original starting baseline stays fixed. Duplicates do not count twice. Publishing without results cannot recalculate a baseline. Accepted Studio imports mirror computed versions to coachOS for the existing Analytics charts; native linked videos match exact IDs/URLs only. Manual legacy baselines remain review-based.

Validation: importer/domain tests, browser review/persistence flow, and production cloud safety regression using controlled server responses. No database schema migration. No API key or model dependency. The tests' synthetic data stays in isolated Demo Mode.

Rollback: revert the live Analytics release commit. Previously saved analyticsFoundation/coachOS fields remain in creator data and are not deleted by rollback.

The import dialog keeps actions outside the scrolling response, focuses errors and confirms application separately from cloud sync. Manual entry is directly accessible and validates sample size/numbers. Existing Plan → Diagnosis is preserved; a read-only supporting section shows the analytics read, one next check, baseline versions and the latest saved learning. It never applies or changes a diagnosis.

## Same-age Analytics workspace (September 14)
Default Analytics now renders workspace.js: Video comparisons (24h, 48h, 7d, optional28d) and a separate optional90-day channel report. The page is not gated by the old90-day setup wizard. Native and imported videos are selectable; each metric shows its own value, matched normal, sample and multiple/percentage-point difference. Manual summaries require verified source/definition and compatible job, and self-inclusion blocks comparisons. Imported comparisons use the strict engine's preceding compatible videos. Imported records are updated through reviewed imports.

Views and engagedViews stay separate in manual baseline, manual review, import, channel report, baseline history and diagnosis evidence. Unknown metric definitions do not create a verified policy. Engaged-only cohorts may establish a policy once five eligible values exist. Ask Studio prompts follow the selected age. Optional invalid channel reports are skipped with review warnings, not allowed to discard otherwise valid video rows.

Channel numbers are labeled whole-channel totals and display dates/source. Growth is unavailable without two distinct90-day ranges and matching verified definitions. Starting-report corrections are explicit and retain startingHistory; adding a current report does not alter the starting report. Date entry uses inclusive first/last dates; storage keeps an exclusive end. Native Plan diagnosis remains unchanged, with one provisional video or verified channel read; source date and uncertainty are shown.

Authority: recovered research catalog entries1 Advanced Mode + Groups,2 Same-Lifespan Comparison,85 Two-Baseline Rule; https://support.google.com/youtube/answer/9082582 confirms August2026 views count starts across formats, with engaged metrics retained. Cohort minima and outlier bands are house guidance, not official YouTube thresholds.

Additional tests: analytics-workspace.test.js and analytics-workspace-browser.cjs (manual baseline → result → separate multiples → reload → channel correction/history → current channel period → native diagnosis → mobile).
