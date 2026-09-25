(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AcceleratorAnalytics = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const RULE_VERSION = 'connected-analytics-v1';
  const WINDOWS = [24, 48, 168, 672];
  const metricDictionary = Object.freeze({
    views: { label: 'Views', unit: 'count', meaning: 'Playback starts under the recorded YouTube definition.' },
    engagedViews: { label: 'Engaged views', unit: 'count', meaning: 'Continued or intentional playback under the recorded source definition; not unique people or a fixed watch-duration threshold.' },
    impressions: { label: 'Registered impressions', unit: 'count', meaning: 'Eligible thumbnail opportunities reported by YouTube, not every source of a view.' },
    ctr: { label: 'Impressions CTR', unit: 'ratio', max: 1, meaning: 'Choice following a registered thumbnail impression. Use the reported rate, not total views divided by impressions.' },
    retention30: { label: 'First 30-second retention', unit: 'ratio', max: 1, meaning: 'The reported Studio intro percentage. It identifies an opening question, not the cause of a drop.' },
    apv: { label: 'Average percentage viewed', unit: 'ratio', meaning: 'Average portion watched. Compare similar duration and format; replay-related values may exceed 100%.' },
    avdSeconds: { label: 'Average view duration', unit: 'seconds', meaning: 'Average time watched using the source-defined playback population.' },
    browsePct: { label: 'Browse %', unit: 'ratio', max: 1, meaning: 'Share of views attributed to Browse features for the exact saved video checkpoint.' },
    suggestedPct: { label: 'Suggested %', unit: 'ratio', max: 1, meaning: 'Share of views attributed to Suggested videos for the exact saved video checkpoint.' },
    searchPct: { label: 'Search %', unit: 'ratio', max: 1, meaning: 'Share of views attributed to YouTube Search for the exact saved video checkpoint.' },
    externalPct: { label: 'External %', unit: 'ratio', max: 1, meaning: 'Share of views attributed to External sources for the exact saved video checkpoint.' },
    watchSeconds: { label: 'Watch time', unit: 'seconds', meaning: 'Total time watched in the stated period.' },
    viewsFromImpressions: { label: 'Views from impressions', unit: 'count', meaning: 'Views within the registered-impression funnel.' },
    watchSecondsFromImpressions: { label: 'Watch time from impressions', unit: 'seconds', meaning: 'Watch time within the registered-impression funnel.' },
    endScreenRate: { label: 'End screen element click rate', unit: 'ratio', max: 1, meaning: 'Clicks relative to appearances of the stated end-screen element.' },
    qualifiedLeads: { label: 'Qualified leads', unit: 'count', meaning: 'Attributed qualified leads with a stated source and attribution window.' },
    bookings: { label: 'Bookings', unit: 'count', meaning: 'Attributed bookings with a stated source and attribution window.' },
    purchases: { label: 'Purchases', unit: 'count', meaning: 'Attributed purchases with a stated source and attribution window.' }
  });

  function copy(value) {
    if (Array.isArray(value)) return value.map(copy);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, copy(child)]));
    return value;
  }
  function freeze(value) {
    if (value && typeof value === 'object') {
      Object.keys(value).forEach(key => freeze(value[key]));
      if (!Object.isFrozen(value)) Object.freeze(value);
    }
    return value;
  }
  freeze(metricDictionary);
  function fail(message) { throw new Error('Analytics: ' + message); }
  function text(value, name) {
    if (typeof value !== 'string' || !value.trim()) fail(name + ' is required.');
    return value.trim();
  }
  function instant(value, name) {
    const raw = text(value, name);
    if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(raw) || !Number.isFinite(Date.parse(raw))) {
      fail(name + ' needs an explicit date, time and timezone.');
    }
    return new Date(raw).toISOString();
  }
  function canonicalVideoId(value) {
    const raw = text(value, 'videoId');
    if (/^https?:\/\//i.test(raw)) {
      let url;
      try { url = new URL(raw); } catch (_) { fail('Invalid video URL.'); }
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      let id;
      if (host === 'youtu.be') id = url.pathname.split('/')[1];
      else if (['youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
        id = url.searchParams.get('v');
        if (!id && /^\/(shorts|live|embed)\//.test(url.pathname)) id = url.pathname.split('/')[2];
      }
      if (!id || !/^[\w-]{11}$/.test(id)) fail('Use a YouTube video URL or an internal video ID.');
      return id;
    }
    if (raw.length > 200 || /[\s\x00-\x1f]/.test(raw)) fail('Invalid video ID.');
    return raw;
  }
  function emptyStore() { return { observations: [], policies: [], baselines: [], reviews: [], events: [] }; }
  function storeCopy(store) {
    if (!store || ['observations', 'policies', 'baselines', 'reviews', 'events'].some(key => !Array.isArray(store[key]))) fail('Invalid analytics store.');
    return copy(store);
  }
  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
    return JSON.stringify(value);
  }
  function definition(observation, metric) {
    const saved = observation.metricDefinitions && observation.metricDefinitions[metric] || observation.definitionId || 'unknown';
    // "Engaged views" is already a metric-specific field. Older imports stored its
    // definition as unknown even when the value came directly from Studio, which
    // unnecessarily blocked apples-to-apples Engaged views comparisons.
    if (metric === 'engagedViews' && !knownDefinition(saved)) return 'youtube-studio-engaged-views-advanced-mode-v1';
    return saved;
  }
  function knownDefinition(value) { return Boolean(value && !/^(unknown|legacy|unverified)$/i.test(value)); }
  function logicalKey(observation) {
    return stable([observation.creatorId || '', observation.videoId, observation.windowHours, observation.traffic, observation.paid]);
  }
  function latestObservations(store, asOf) {
    const latest = new Map();
    for (const item of store.observations) {
      if (item.acceptedAt > asOf || item.capturedAt > asOf) continue;
      const prior = latest.get(item.logicalKey);
      if (!prior || item.revision > prior.revision) latest.set(item.logicalKey, item);
    }
    return Array.from(latest.values());
  }
  function median(values) {
    const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!sorted.length) return null;
    const m = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
  }
  // R7 / type-7 interpolation. This is empirical dispersion, never a confidence interval.
  function percentile(values, p) {
    if (!Number.isFinite(p) || p < 0 || p > 1) fail('Invalid percentile.');
    const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!sorted.length) return null;
    const position = (sorted.length - 1) * p, lower = Math.floor(position), upper = Math.ceil(position);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
  }
  function sampleLevel(n) { return n === 0 ? 'unavailable' : n < 5 ? 'provisional' : n < 10 ? 'limited' : 'established_sample'; }
  function countBand(multiple) {
    if (!Number.isFinite(multiple) || multiple < 0) return 'unavailable';
    if (multiple < 0.7) return 'below_usual';
    if (multiple <= 1.3) return 'around_usual';
    if (multiple < 1.7) return 'above_usual';
    if (multiple < 2.5) return 'strong_expansion';
    if (multiple < 5) return 'large_expansion';
    return 'exceptional_expansion';
  }
  function normalizeObservation(input, now) {
    const item = copy(input || {});
    const suppliedId = canonicalVideoId(item.videoId || item.youtubeVideoId);
    item.videoId = canonicalVideoId(item.youtubeVideoId || item.videoId);
    if (item.videoId !== suppliedId && !item.internalVideoId) item.internalVideoId = suppliedId;
    item.id = text(item.id, 'observation id');
    item.creatorId = item.creatorId ? text(item.creatorId, 'creatorId') : '';
    item.publishedAt = instant(item.publishedAt, 'publishedAt');
    item.capturedAt = instant(item.capturedAt, 'capturedAt');
    if (item.capturedAt > now) fail('capturedAt cannot be in the future.');
    if (item.publishedAt > item.capturedAt) fail('Publication cannot follow its observation.');
    if (!WINDOWS.includes(item.windowHours)) fail('Use a separate 24, 48, 168 or 672-hour lifespan window.');
    item.format = text(item.format, 'format');
    item.eraId = text(item.eraId, 'eraId');
    item.job = item.job || null;
    if (item.job && !['Reach', 'Trust', 'Convert'].includes(item.job)) fail('Unknown primary video job.');
    item.definitionId = item.definitionId || 'unknown';
    item.metricDefinitions = item.metricDefinitions || {};
    for (const value of Object.values(item.metricDefinitions)) text(value, 'metric definition');
    item.coverage = item.coverage || 'unknown';
    if (!['exact', 'partial', 'calendar_approximation', 'unknown'].includes(item.coverage)) fail('Unknown period coverage.');
    item.traffic = item.traffic || 'all';
    item.paid = item.paid || 'unknown';
    if (!['organic', 'paid', 'mixed', 'unknown'].includes(item.paid)) fail('Unknown paid-traffic context.');
    if (typeof item.source === 'string') item.source = { kind: 'manual', report: text(item.source, 'source') };
    if (!item.source || typeof item.source !== 'object' || !Object.keys(item.source).length) fail('An observation needs its source.');
    if (!item.metrics || typeof item.metrics !== 'object' || Array.isArray(item.metrics)) fail('Metrics must be an object.');
    for (const [metric, value] of Object.entries(item.metrics)) {
      const rule = metricDictionary[metric];
      if (!rule) fail('Unsupported metric: ' + metric);
      if (value === null) continue;
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail(metric + ' must be a nonnegative number or null.');
      if (rule.unit === 'count' && !Number.isSafeInteger(value)) fail(metric + ' must be an integer count.');
      if (rule.max !== undefined && value > rule.max) fail(metric + ' must be a ratio from 0 to 1, not a percentage entered as a whole number.');
    }
    item.acceptedAt = now;
    item.logicalKey = logicalKey(item);
    return item;
  }
  function normalizePolicy(input, now) {
    const policy = copy(input || {});
    policy.id = text(policy.id, 'policy id');
    policy.creatorId = policy.creatorId ? text(policy.creatorId, 'creatorId') : '';
    policy.format = text(policy.format, 'format');
    policy.eraId = text(policy.eraId, 'eraId');
    if (!WINDOWS.includes(policy.windowHours)) fail('Unknown baseline window.');
    policy.primaryMetric = policy.primaryMetric || 'engagedViews';
    if (!['views', 'engagedViews', 'impressions'].includes(policy.primaryMetric)) fail('A baseline needs views, engagedViews, or impressions as its primary count metric.');
    policy.definitionId = text(policy.definitionId, 'definitionId');
    if (!knownDefinition(policy.definitionId)) fail('Validate the primary metric definition before saving a baseline policy.');
    policy.metricDefinitions = policy.metricDefinitions || {};
    policy.cohortLimit = policy.cohortLimit === undefined ? 20 : policy.cohortLimit;
    policy.refreshAfter = policy.refreshAfter === undefined ? (policy.refreshAfterDistinctVideos || 4) : policy.refreshAfter;
    policy.refreshDays = policy.refreshDays === undefined ? 30 : policy.refreshDays;
    if (!Number.isInteger(policy.cohortLimit) || policy.cohortLimit < 5 || policy.cohortLimit > 20) fail('Choose a cohort limit between 5 and 20.');
    if (!Number.isInteger(policy.refreshAfter) || policy.refreshAfter < 1) fail('Refresh interval must be a positive number of distinct videos.');
    if (!Number.isInteger(policy.refreshDays) || policy.refreshDays < 1) fail('Refresh day interval must be a positive number.');
    policy.job = policy.job || policy.primaryJob || null;
    if (policy.job && !['Reach', 'Trust', 'Convert'].includes(policy.job)) fail('Unknown policy video job.');
    policy.traffic = policy.traffic || 'all';
    policy.paid = policy.paid || 'unknown';
    policy.allowBroaderJobFallback = policy.allowBroaderJobFallback !== false;
    policy.createdAt = now;
    policy.ruleVersion = RULE_VERSION;
    return policy;
  }
  function rejection(observation, policy, asOf, beforePublication) {
    if ((observation.creatorId || '') !== (policy.creatorId || '')) return 'different_creator';
    if (observation.windowHours !== policy.windowHours) return 'different_window';
    if (beforePublication && observation.publishedAt >= beforePublication) return 'not_a_predecessor';
    if (observation.format !== policy.format) return 'different_format';
    if (observation.eraId !== policy.eraId) return 'different_era';
    if (observation.coverage !== 'exact') return 'window_not_exact';
    if (observation.traffic !== policy.traffic || observation.paid !== policy.paid) return 'different_traffic_context';
    const maturesAt = new Date(Date.parse(observation.publishedAt) + policy.windowHours * 3600000).toISOString();
    if (maturesAt > asOf || maturesAt > observation.capturedAt) return 'window_not_mature';
    if (!knownDefinition(definition(observation, policy.primaryMetric)) || definition(observation, policy.primaryMetric) !== definition(policy, policy.primaryMetric)) return 'different_primary_definition';
    if (!Number.isFinite(observation.metrics[policy.primaryMetric])) return 'primary_metric_missing';
    if (Number.isFinite(observation.metrics.views) && observation.metrics.views === 0 && Number.isFinite(observation.metrics.impressions) && observation.metrics.impressions >= 100 && Number.isFinite(observation.metrics.ctr) && observation.metrics.ctr > 0) return 'internally_inconsistent_metrics';
    return null;
  }
  function cohort(store, policy, asOf, options) {
    const opts = options || {}, excluded = [], possible = [];
    for (const observation of latestObservations(store, asOf)) {
      if (opts.videoId && observation.videoId === opts.videoId) { excluded.push({ videoId: observation.videoId, reason: 'current_video' }); continue; }
      const reason = rejection(observation, policy, asOf, opts.beforePublication);
      if (reason) { excluded.push({ videoId: observation.videoId, reason }); continue; }
      if (opts.allowedIds && !opts.allowedIds.has(observation.videoId)) continue;
      possible.push(observation);
    }
    possible.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.videoId.localeCompare(b.videoId));
    // A canonical video contributes at most once, even if imported with another observation ID.
    const distinct = Array.from(new Map(possible.map(item => [item.videoId, item])).values());
    const matched = policy.job ? distinct.filter(item => item.job === policy.job) : distinct;
    const broadened = Boolean(policy.job && matched.length < 5 && policy.allowBroaderJobFallback);
    const candidates = broadened ? distinct : matched;
    if (!broadened) distinct.filter(item => !candidates.includes(item)).forEach(item => excluded.push({ videoId: item.videoId, reason: 'different_job' }));
    candidates.slice(policy.cohortLimit).forEach(item => excluded.push({ videoId: item.videoId, reason: 'outside_recent_cohort' }));
    return { members: candidates.slice(0, policy.cohortLimit), eligible: candidates, excluded, broadened };
  }
  function summary(members, policy) {
    const result = {};
    for (const metric of Object.keys(metricDictionary)) {
      const expected = definition(policy, metric), expectedKnown = knownDefinition(expected);
      const rows = members.filter(item => {
        if (!Number.isFinite(item.metrics[metric])) return false;
        const actual = definition(item, metric);
        return expectedKnown ? knownDefinition(actual) && actual === expected : !knownDefinition(actual);
      });
      const values = rows.map(item => item.metrics[metric]);
      result[metric] = { median: median(values), n: values.length, p25: values.length >= 10 ? percentile(values, .25) : null,
        p75: values.length >= 10 ? percentile(values, .75) : null, definitionId: expected, definitionVerified: expectedKnown,
        observationRevisionIds: rows.map(item => item.revisionId), sampleLevel: sampleLevel(values.length) };
    }
    return result;
  }
  function signature(selected, policy) { return stable([selected.members.map(item => item.revisionId), selected.broadened, policy.metricDefinitions]); }
  function baseline(store, policy, selected, kind, reason, now, triggerCount) {
    const previous = store.baselines.filter(item => item.policyId === policy.id && item.kind === kind).slice(-1)[0];
    const revision = previous ? previous.revision + 1 : 1;
    return { id: policy.id + ':' + kind + ':' + revision, policyId: policy.id, creatorId: policy.creatorId, kind, revision,
      builtAt: now, effectiveAt: now, evidenceAsOf: now, ruleVersion: RULE_VERSION, previousVersionId: previous ? previous.id : null,
      memberVideoIds: selected.members.map(item => item.videoId), observationRevisionIds: selected.members.map(item => item.revisionId),
      excluded: copy(selected.excluded), broadened: selected.broadened, metrics: summary(selected.members, policy),
      reason, triggerCount: triggerCount || 0, signature: signature(selected, policy), status: selected.members.length ? 'saved' : 'no_evidence' };
  }
  function createPolicy(store, input, nowISO) {
    const now = instant(nowISO, 'now'), next = storeCopy(store), policy = normalizePolicy(input, now);
    if (next.policies.some(item => item.id === policy.id)) fail('Policy already exists; create a new policy ID for a changed comparison.');
    const selected = cohort(next, policy, now);
    policy.initialPublicationCutoff = selected.eligible.length ? selected.eligible[0].publishedAt : now;
    next.policies.push(policy);
    next.baselines.push(baseline(next, policy, selected, 'starting', 'onboarding', now));
    const operating = baseline(next, policy, selected, 'operating', 'onboarding', now);
    next.baselines.push(operating);
    selected.eligible.forEach(item => next.events.push({ id: 'eligible:' + policy.id + ':' + item.videoId, kind: 'eligible_video', policyId: policy.id,
      videoId: item.videoId, eligibleAt: now, countedAt: now, baselineVersionId: operating.id, seed: true, active: true }));
    return next;
  }
  function refreshBaselines(store, nowISO) {
    const now = instant(nowISO, 'now'), next = storeCopy(store);
    for (const policy of next.policies) {
      if (policy.createdAt > now) continue;
      const selected = cohort(next, policy, now);
      for (const item of selected.eligible) {
        if (item.publishedAt <= policy.initialPublicationCutoff || next.events.some(event => event.kind === 'eligible_video' && event.policyId === policy.id && event.videoId === item.videoId)) continue;
        next.events.push({ id: 'eligible:' + policy.id + ':' + item.videoId, kind: 'eligible_video', policyId: policy.id,
          videoId: item.videoId, eligibleAt: now, countedAt: null, baselineVersionId: null, seed: false });
      }
      const eligibleIds = new Set(selected.eligible.map(item => item.videoId));
      next.events.filter(event => event.kind === 'eligible_video' && event.policyId === policy.id).forEach(event => { event.active = eligibleIds.has(event.videoId); });
      const pending = next.events.filter(event => event.kind === 'eligible_video' && event.policyId === policy.id && !event.countedAt && eligibleIds.has(event.videoId));
      const prior = next.baselines.filter(item => item.policyId === policy.id && item.kind === 'operating' && item.builtAt <= now).slice(-1)[0];
      if (!prior) continue;
      const daysSincePrior = (Date.parse(now) - Date.parse(prior.builtAt)) / 86400000;
      const monthlyRefreshDue = pending.length >= 1 && daysSincePrior >= policy.refreshDays;
      if (pending.length >= policy.refreshAfter || monthlyRefreshDue) {
        const changed = baseline(next, policy, selected, 'operating', pending.length >= policy.refreshAfter ? 'four_new_videos' : 'monthly_new_evidence', now, pending.length);
        next.baselines.push(changed);
        pending.forEach(event => { event.countedAt = now; event.baselineVersionId = changed.id; });
      } else {
        const countedIds = new Set(next.events.filter(event => event.policyId === policy.id && event.countedAt && event.countedAt <= now).map(event => event.videoId));
        selected.eligible.filter(item => item.publishedAt <= policy.initialPublicationCutoff).forEach(item => countedIds.add(item.videoId));
        const revised = cohort(next, policy, now, { allowedIds: countedIds });
        if (signature(revised, policy) !== prior.signature) next.baselines.push(baseline(next, policy, revised, 'operating', 'data_revision', now));
      }
    }
    return next;
  }
  function appendObservation(next, input, now) {
    const item = normalizeObservation(input, now);
    const sameId = next.observations.find(other => other.id === item.id);
    if (sameId && sameId.logicalKey !== item.logicalKey) fail('An observation ID cannot be reused for a different video or population.');
    const prior = next.observations.filter(other => other.logicalKey === item.logicalKey).slice(-1)[0];
    if (prior && prior.acceptedAt > now) fail('Cannot accept an observation before the current revision.');
    if (prior) {
      const payload = obj => { const value = copy(obj); ['id','revision','revisionId','supersedesId','acceptedAt'].forEach(key => delete value[key]); return stable(value); };
      if (payload(prior) === payload(item)) return false;
      item.id = prior.id;
    }
    item.revision = prior ? prior.revision + 1 : 1;
    item.revisionId = item.id + ':r' + item.revision;
    item.supersedesId = prior ? prior.revisionId : null;
    next.observations.push(item);
    return true;
  }
  function acceptObservation(store, input, nowISO) {
    const now = instant(nowISO, 'now'), next = storeCopy(store);
    appendObservation(next, input, now);
    return refreshBaselines(next, now);
  }
  function acceptObservations(store, inputs, nowISO) {
    const now = instant(nowISO, 'now'), next = storeCopy(store);
    if (!Array.isArray(inputs)) fail('Batch observations must be an array.');
    for (const input of inputs) appendObservation(next, input, now);
    return refreshBaselines(next, now);
  }
  function metricComparison(metric, current, row, sourceCompatible) {
    const rule = metricDictionary[metric], valid = Number.isFinite(current), normal = row && row.median;
    const result = { current: valid ? current : null, baseline: normal === undefined ? null : normal, n: row ? row.n : 0,
      unit: rule.unit, multiple: null, relativeChangePct: null, deltaPp: null, deltaSeconds: null,
      p25: row ? row.p25 : null, p75: row ? row.p75 : null, sampleLevel: sampleLevel(row ? row.n : 0), status: 'unavailable' };
    if (!sourceCompatible) { result.status = 'definition_mismatch'; return result; }
    if (!valid || !Number.isFinite(normal)) return result;
    if (normal > 0) { result.relativeChangePct = 100 * (current - normal) / normal; result.multiple = current / normal; }
    if (rule.unit === 'ratio') {
      result.deltaPp = 100 * (current - normal);
      result.status = row.n < 10 ? 'limited_sample' : current < row.p25 ? 'below_typical_range' : current > row.p75 ? 'above_typical_range' : 'inside_typical_range';
    } else if (rule.unit === 'seconds') {
      result.deltaSeconds = current - normal;
      result.status = row.n < 10 ? 'limited_sample' : current < row.p25 ? 'below_typical_range' : current > row.p75 ? 'above_typical_range' : 'inside_typical_range';
    } else result.status = normal === 0 ? 'zero_baseline' : countBand(result.multiple);
    return result;
  }
  function evidenceFor(target, comparisons, policy) {
    const cautions = [];
    if (target.coverage !== 'exact') cautions.push('The target window is not exact.');
    if (target.paid === 'unknown') cautions.push('Paid/organic traffic context is unknown.');
    const impressions = target.metrics.impressions;
    const engaged = target.metrics.engagedViews, views = target.metrics.views;
    const viewing = Number.isFinite(engaged) ? engaged : views;
    // Conservative product cautions, not eligibility thresholds or statistical significance.
    if (!Number.isFinite(impressions) || impressions < 100) cautions.push('Thumbnail exposure is missing or very limited; do not diagnose packaging from the rate alone.');
    if (!Number.isFinite(viewing) || viewing < 100) cautions.push('There is not enough playback volume yet to judge retention.');
    const primary = comparisons[policy.primaryMetric];
    if (!primary || primary.n < 5) cautions.push('The comparison has fewer than five primary-metric values.');
    return { cautions, targetImpressions: Number.isFinite(impressions) ? impressions : null,
      targetEngagedViews: Number.isFinite(engaged) ? engaged : null,
      targetViewingCount: Number.isFinite(viewing) ? viewing : null,
      viewingCountSource: Number.isFinite(engaged) ? 'engagedViews' : Number.isFinite(views) ? 'views' : null,
      sampleRules: 'Accelerator house guidance, not YouTube thresholds or statistical proof.', causalConfidence: 'not_established' };
  }
  function findingsFor(comparisons, evidence) {
    const findings = [];
    const impressions = comparisons.impressions, ctr = comparisons.ctr, opening = comparisons.retention30;
    const limitedExposure = evidence.targetImpressions === null || evidence.targetImpressions < 100;
    const limitedViewing = evidence.targetViewingCount === null || evidence.targetViewingCount < 100;
    const lower = item => item && item.status === 'below_typical_range';
    const notLower = item => item && ['inside_typical_range', 'above_typical_range'].includes(item.status);
    if (impressions && impressions.multiple >= 1.7 && ctr && ctr.deltaPp < 0) {
      findings.push({ stage: 'click', status: 'check_context', message: 'Impressions expanded while CTR fell. Check audience and traffic mix before changing the package.' });
    } else if (!limitedExposure && lower(ctr) && notLower(opening) && impressions && impressions.multiple >= .7) {
      findings.push({ stage: 'click', status: 'candidate', message: 'Packaging is a candidate for review. Compare the promise and audience context before choosing a test.' });
    }
    if (!limitedViewing && lower(opening)) findings.push({ stage: 'opening', status: 'candidate', message: 'The opening is holding fewer viewers than usual. Check whether the first 30 seconds deliver what the title and thumbnail promised.' });
    if (!limitedViewing && (!opening || opening.status === 'unavailable' || notLower(opening)) && (lower(comparisons.apv) || lower(comparisons.avdSeconds))) findings.push({ stage: 'experience', status: 'candidate', message: 'Inspect the actual retention curve and structure. These averages do not identify a timestamp or cause.' });
    if (impressions && impressions.multiple !== null && impressions.multiple < .7 && impressions.n >= 5) findings.push({ stage: 'opportunity', status: 'candidate', message: 'YouTube is showing this video less than usual. Check the topic, audience fit, and where the views came from before blaming the title or thumbnail.' });
    if (!findings.length) findings.push({ stage: null, status: 'observe', message: 'Keep the video’s job in mind. These numbers do not point to one clear main issue yet.' });
    return findings;
  }
  function compareVideo(store, options) {
    const opts = options || {}, asOf = instant(opts.asOf, 'asOf');
    const policy = store.policies.find(item => item.id === opts.policyId && item.createdAt <= asOf);
    if (!policy) fail('Baseline policy was not available at this time.');
    if (opts.windowHours !== policy.windowHours) fail('Review and policy windows must match.');
    const requestedId = canonicalVideoId(opts.videoId);
    const available = latestObservations(store, asOf);
    const alias = available.find(item => item.internalVideoId === requestedId && item.creatorId === policy.creatorId);
    const videoId = alias ? alias.videoId : requestedId;
    const target = available.filter(item => item.videoId === videoId && item.windowHours === policy.windowHours && item.creatorId === policy.creatorId && item.traffic === policy.traffic && item.paid === policy.paid).sort((a,b) => b.acceptedAt.localeCompare(a.acceptedAt))[0];
    if (!target) return freeze({ videoId, policyId: policy.id, windowHours: policy.windowHours, asOf, ruleVersion: RULE_VERSION,
      status: 'missing_observation', comparisons: {}, findings: [{ status: 'collect_evidence', message: 'Record the video at this exact lifespan before comparing.' }] });
    const targetIssue = rejection(target, policy, asOf) || (policy.job && target.job !== policy.job ? 'different_job' : null);
    const selected = cohort(store, policy, asOf, { videoId, beforePublication: target.publishedAt });
    const aggregates = summary(selected.members, policy), comparisons = {};
    for (const metric of Object.keys(metricDictionary)) comparisons[metric] = metricComparison(metric, target.metrics[metric], aggregates[metric], definition(target, metric) === aggregates[metric].definitionId && knownDefinition(definition(target, metric)));
    if (targetIssue) Object.values(comparisons).forEach(item => { item.status = 'context_mismatch'; item.multiple = null; item.relativeChangePct = null; item.deltaPp = null; item.deltaSeconds = null; });
    const evidence = evidenceFor(target, comparisons, policy);
    if (targetIssue) evidence.cautions.unshift('Target comparison unavailable: ' + targetIssue.replace(/_/g, ' ') + '.');
    const matchingBaseline = store.baselines.filter(item => item.policyId === policy.id && item.kind === 'operating' && item.builtAt <= asOf && item.signature === signature(selected, policy)).slice(-1)[0];
    return freeze({ videoId, policyId: policy.id, creatorId: policy.creatorId, windowHours: policy.windowHours, asOf, ruleVersion: RULE_VERSION,
      status: targetIssue ? 'context_mismatch' : selected.members.length ? 'compared' : 'no_baseline', targetIssue,
      targetObservationId: target.revisionId, target: copy(target), baselineVersionId: matchingBaseline ? matchingBaseline.id : null,
      baseline: { memberVideoIds: selected.members.map(item => item.videoId), observationRevisionIds: selected.members.map(item => item.revisionId),
        metrics: aggregates, excluded: selected.excluded, broadened: selected.broadened, evidenceAsOf: asOf },
      comparisons, evidence, findings: targetIssue ? [{ status: 'collect_evidence', message: 'Resolve the period or context mismatch before interpreting performance.' }] : findingsFor(comparisons, evidence) });
  }
  function acceptReview(store, comparison, nowISO) {
    const now = instant(nowISO, 'now'), next = storeCopy(store);
    if (!comparison || !comparison.asOf || comparison.asOf > now || !comparison.policyId) fail('Invalid review comparison.');
    const original = compareVideo(store, { videoId: comparison.videoId, policyId: comparison.policyId, windowHours: comparison.windowHours, asOf: comparison.asOf });
    if (stable(original) !== stable(comparison)) fail('Review evidence changed or was modified; build a fresh comparison.');
    const existing = next.reviews.find(item => stable(item.comparison) === stable(comparison));
    if (!existing) next.reviews.push({ id: 'review:' + next.reviews.length + ':' + comparison.videoId, videoId: comparison.videoId,
      policyId: comparison.policyId, savedAt: now, comparison: copy(comparison) });
    return refreshBaselines(next, now);
  }
  return freeze({ RULE_VERSION, WINDOWS: WINDOWS.slice(), metricDictionary, emptyStore, canonicalVideoId, median, percentile,
    countBand, sampleLevel, createPolicy, acceptObservation, acceptObservations, refreshBaselines, compareVideo, acceptReview });
});
