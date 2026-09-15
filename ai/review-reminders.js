(() => {
  'use strict';
  if (window.__acceleratorReviewReminders) return;

  const KEY = 'accelerator-ai-v3-review-queue';
  let queue = read();

  function stateValue() {
    try {
      const value = (0, eval)('typeof state !== "undefined" ? state : null');
      return value && typeof value === 'object' ? value : null;
    } catch (_) { return null; }
  }

  function activeCreator(value) {
    if (!value) return null;
    return (value.creators || []).find(item => item.id === value.currentCreatorId) || (value.creators || [])[0] || null;
  }

  function activeVideo(value, creator) {
    if (!creator) return null;
    return (creator.videos || []).find(item => item.id === value.currentVideoId) || (creator.videos || [])[0] || null;
  }

  function read() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
    } catch (_) { return []; }
  }

  function write(items) {
    queue = (Array.isArray(items) ? items : []).slice(0, 30);
    localStorage.setItem(KEY, JSON.stringify(queue));
    document.dispatchEvent(new CustomEvent('accelerator:review-queue', { detail: diagnostics() }));
  }

  function impact(binding) {
    const value = String(binding || '');
    if (/^audience\./.test(value)) return { target: 'strategy', label: 'Audience changed', copy: 'Check the message, monthly focus, and who the active video is for.' };
    if (/^message\./.test(value)) return { target: 'planner', label: 'Message changed', copy: 'Check the active video promises, titles, thumbnails, and hooks that use this message.' };
    if (/^(strategy|business)\./.test(value)) return { target: 'planner', label: 'Business path changed', copy: 'Review conversion roles and CTAs that point to this next step.' };
    if (/^viewer\./.test(value)) return { target: 'planner', label: 'Video viewer changed', copy: 'Review the promise, package and opening before production continues.' };
    if (/^promise\./.test(value)) return { target: 'planner', label: 'Promise changed', copy: 'Review the title, thumbnail, hook and structure against the new promise.' };
    if (/^package\./.test(value)) return { target: 'planner', label: 'Package changed', copy: 'Review the hook so the opening confirms the click immediately.' };
    if (/^hook\./.test(value)) return { target: 'planner', label: 'Opening changed', copy: 'Review the structure and production handoff for continuity.' };
    if (/^analytics\.(?:_24h|_48h|_7d|_28d|sourceContext)/.test(value)) return { target: 'learn', label: 'New video result', copy: 'There is a new result to review and turn into a lesson.' };
    if (/^analytics\.(?:observe|interpret|decision|nextMove)/.test(value)) return { target: 'home', label: 'Learning changed', copy: 'Review the next video or monthly focus that should inherit this learning.' };
    return null;
  }

  function enqueue(binding, origin = 'edit') {
    const effect = impact(binding);
    if (!effect) return null;
    const value = stateValue();
    const creator = activeCreator(value);
    const video = activeVideo(value, creator);
    const signature = [creator && creator.id, video && video.id, effect.target, effect.label].join('|');
    const previous = queue.find(item => item.signature === signature);
    const item = {
      id: previous ? previous.id : 'review-' + Date.now().toString(36),
      signature,
      creatorId: creator && creator.id || null,
      videoId: video && video.id || null,
      target: effect.target,
      label: effect.label,
      copy: effect.copy,
      sourceBinding: String(binding || ''),
      origin,
      updatedAt: new Date().toISOString()
    };
    write([item, ...queue.filter(entry => entry.signature !== signature)]);
    return item;
  }

  function dismiss(id) {
    write(queue.filter(item => item.id !== id));
  }

  function diagnostics() {
    const value = stateValue();
    const creator = activeCreator(value);
    return {
      count: queue.filter(item => !item.creatorId || !creator || item.creatorId === creator.id).length,
      items: queue.slice(),
      storageKey: KEY
    };
  }

  document.addEventListener('change', event => {
    const field = event.target && event.target.closest ? event.target.closest('[data-bind]') : null;
    if (!field || field.dataset.aiApplying === 'true') return;
    enqueue(field.getAttribute('data-bind'), 'edit');
  });

  window.__acceleratorReviewReminders = { enqueue, dismiss, diagnostics, impact };
})();
