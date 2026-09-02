# Native AI flow

Accelerator AI should shorten a decision, not create another workspace Blake must manage.

## The decision chain

Creator reality → audience and message → diagnosis → active month → video decision → result → learning → next decision

Each downstream AI check inherits the saved decisions upstream. It should challenge the weakest link, but it should not casually rewrite the whole chain.

## Interaction rules

1. **Appear at the decision.** The default entry point is the small AI assist row beside the current work, not AI Desk.
2. **One primary move.** The row recommends one context-sensitive check. Secondary checks stay behind `•••`.
3. **Use only relevant context.** Each action owns an explicit context profile. Unrelated creators, old AI drafts and irrelevant library items are excluded.
4. **Gate missing evidence before generation.** A deterministic dashboard check names the missing input and makes no model call.
5. **Match the output to the job.** A decision gets one recommendation; packaging gets at most three directions; a hook gets a formula and example; learning gets observation, interpretation and decision.
6. **Keep the first answer brief.** Rationale, evidence and uncertainty are progressive disclosure under `Why this answer`.
7. **Show provenance.** Every generated answer names the provider, actual model, task depth and confidence. A no-model readiness gate says `Dashboard check`.
8. **Keep Blake in control.** AI can copy or keep a browser-only review draft. It cannot silently edit creator data or cloud-save a recommendation.

## Action-to-context map

| Work on screen | AI uses | AI returns |
|---|---|---|
| Audience | recorded person, moment, tension, language, diagnosis | one clarification |
| Message | audience, message, offer, current viewer/promise | bracketed formula + filled example |
| Business | audience, message, goal, offer/path, CTA | one handoff correction |
| Plan | diagnosis, 90-day plan, active month, video mix, recent learning | one plan correction |
| Viewer | audience, active month, saved viewer state | one viewer clarification |
| Research | saved sources/signals, promise and package direction | one evidence gap |
| Promise | viewer problem, result, mechanism and proof | one promise correction |
| Package | viewer, promise, mechanism, research, active constraint, same-job videos | up to three title/thumbnail directions |
| Hook | viewer, promise, title, thumbnail, proof assets, comparable hooks | bracketed hook formula + filled example |
| Structure | package, hook, proof and progression | one weak section/transition |
| CTA | viewer moment, video job, business path and real destination | one fit/timing correction |
| Results | selected checkpoint, package, opening, traffic source and same-job comparisons | observation → interpretation → decision |
| Report | recorded results and learnings only | concise client-ready conclusion |

## Routing

- **Fast:** narrow evidence, timing and capacity checks.
- **Standard:** audience, message, viewer, promise, hook, structure and next-decision checks.
- **Deep:** diagnosis, plan coherence, package directions, experiments, results and reports.
- **Fixed:** use the manually selected provider/model for every action.

Automatic routing is a performance choice, not a hidden identity. The provider and actual model remain visible on every answer.

## Design basis

This design follows three established patterns: offer context-aware help and graceful correction, introduce AI progressively around its benefit rather than its machinery, and render known results in purpose-built interface elements instead of defaulting to long chat text.

- Microsoft Research: Guidelines for Human-AI Interaction — https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/
- Google PAIR: Mental Models — https://pair.withgoogle.com/guidebook-v2/chapter/mental-models/
- Google PAIR: Explainability + Trust — https://pair.withgoogle.com/guidebook-v2/chapter/explainability-trust/
- OpenAI: Latency optimization — https://developers.openai.com/api/docs/guides/latency-optimization
- Vercel AI Gateway: Model fallbacks — https://vercel.com/docs/ai-gateway/models-and-providers/model-fallbacks
- Vercel AI SDK: Structured data — https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
