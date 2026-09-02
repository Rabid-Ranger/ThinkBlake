# Native AI flow

Accelerator AI should make the existing work faster, more connected and easier to revise. It should not create a second workspace or answer beside the work.

## The operating chain

Creator reality → audience and message → diagnosis → active month → video decision → result → learning → next decision

AI always starts from the artifact currently being edited and inherits only the useful upstream decisions. When something upstream changes, Accelerator creates a downstream review item instead of silently rewriting later work.

## Interaction model

1. **Draft in the real field.** Empty fields offer `Draft with AI`; completed fields offer `Refine with AI`. The suggestion appears directly below that field.
2. **Draft a complete step when useful.** Audience, Message, Business, Viewer, Research, Promise, Package, Hook and Learning offer one whole-section draft action. Only blank fields are targeted when blanks exist.
3. **Apply explicitly.** Blake can use one field, use every field in the section, try again or dismiss. No suggestion edits dashboard state until `Use` is selected.
4. **Propagate changes as review work.** Audience, message, business, viewer, promise, package, hook and result changes create concise review items for the downstream decisions they affect.
5. **Prepare coaching calls in place.** Review, Decide, Coach and Commit can be prefilled from the current creator, plan, evidence and commitments.
6. **Turn results into fields, not a report blob.** The selected checkpoint drafts directly into Observe, Interpret, Decide and Next move, while preserving the difference between facts and explanations.
7. **Keep model controls out of the main flow.** `AI settings & review` shows the active route/model, fallback setup, working automations and queued changes. Custom chat remains optional.

## What is automated

- Upstream edits automatically create downstream review items.
- New checkpoint evidence automatically surfaces a ready-to-draft learning step.
- Opening a coaching call automatically exposes the right prefill action for the current phase.
- The active model is routed automatically by task depth when Automatic routing is selected.

Automation prepares, flags and routes work. It does not silently apply or cloud-save generated strategy.

## Field contracts

Every native draft request contains:

- the exact allowed field bindings;
- the visible label and field guidance;
- the current value;
- the current creator and relevant upstream decision context; and
- one task-specific intent.

The companion returns structured field drafts only for those allowed bindings. The browser validates the binding again before a suggestion can be applied.

## Decision-specific behavior

| Work | Context used | Native result |
|---|---|---|
| Audience | person, situation, struggle, language, evidence and assumptions | missing or improved audience fields |
| Message | audience, practical result, emotional meaning, approach and proof | message fields that stay connected |
| Business | content goal, next step, pathway, offers and measurement | a usable viewer-to-business path |
| Viewer | creator audience, active month and this video's moment | one recognizable viewer state |
| Research | saved sources and current video decision | synthesis only; no invented sources |
| Promise | viewer, problem, result, mechanism and proof | one coherent promise |
| Package | promise, research, constraint and comparable videos | title and thumbnail fields that work together |
| Hook | package, viewer tension, mechanism and proof | a click-confirming opening in the Hook field |
| Learning | selected metrics, traffic context and same-job comparison | Observe, Interpret, Decide and Next move |
| Coaching | current plan, evidence, open commitments and call phase | phase-specific call fields |

## Research basis

The redesign combines several proven patterns:

- YouTube Studio generates creator-specific ideas, titles, thumbnails, hooks and outlines from channel context, then lets the creator save and refine the useful artifact: https://support.google.com/youtube/answer/15575509 and https://support.google.com/youtube/answer/16291691
- GitHub Copilot places suggestions directly where work is being written and supports accept, partial accept, ignore and dismiss: https://docs.github.com/en/copilot/responsible-use/inline-suggestions
- Linear surfaces proactive suggestions against existing workspace data, explains why they appeared and supports accept, decline or auto-apply by category: https://linear.app/docs/triage-intelligence
- Notion Autofill targets specific properties, can run from page edits or schedules and recommends human accuracy review: https://www.notion.com/help/autofill
- Microsoft Human-AI Interaction guidelines call for efficient invocation, dismissal and correction: https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/
- Google PAIR recommends preserving user control and designing graceful failure when automation lacks enough evidence: https://pair.withgoogle.com/guidebook-v2/
