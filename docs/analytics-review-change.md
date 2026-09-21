# Analytics evidence and Studio update workflow

## User problem
The current dashboard has useful comparisons, but summaries can mislabel metrics, disagree about winners, compare audience revisions as trends, and ask for too much data at every update.

## Desired outcome
Keep the live layout and original diagnosis. Provide consistent evidence-led reads, clearly named normals, and a small recurring Studio request with honest manual fallbacks.

## Source authority
Current main cfffbbb and September 21 live review; Mastery 00 and active coaching playbook; official Ask Studio and Advanced Mode documentation checked September 21, 2026. Synthetic tests reproduce observed behavior without storing client data.

## Inherited state
No schema migration, seed, cloud write, or automatic plan/diagnosis change. Retain all observations, baseline versions, audience revisions, and existing prompt modes. Work is a review branch, not a production release.

## Proposed behavior
Use latest revisions from distinct compatible audience periods. Keep metric labels attached to values. Route recommendations by stable stage IDs, preserve winning results and distinguish missing evidence. Share video assessment rules with diagnostic support. Default Studio collection to a bounded routine update; keep all-window setup available. Explain what Ask Studio may retrieve, which exact reports need manual verification, and which creator/business context comes from outside YouTube.

## Acceptance
Regression cases for same-period revisions, mismatched audience scope, impressions-only baseline, missing video evidence, unassigned winner, WATCH threshold, single clue and multi-stage priority; prompt/import round trip; desktop/mobile preview; no production writes. Test results and PR recorded in handoff.
