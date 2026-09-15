(() => {
  'use strict';
  if (window.__acceleratorReviewReminderUi) return;
  window.__acceleratorReviewReminderUi = true;

  let renderQueued = false;

  function stateValue() {
    try {
      const value = (0, eval)('typeof state !== "undefined" ? state : null');
      return value && typeof value === 'object' ? value : null;
    } catch (_) { return null; }
  }

  function view() {
    return String(stateValue()?.view || 'home');
  }

  function items() {
    const api = window.__acceleratorReviewReminders;
    return api ? api.diagnostics().items || [] : [];
  }

  function currentCreatorId() {
    const value = stateValue();
    if (!value) return null;
    return value.currentCreatorId || (value.creators || [])[0]?.id || null;
  }

  function relevant() {
    const creatorId = currentCreatorId();
    const currentView = view();
    return items().filter(item =>
      item.target === currentView &&
      (!item.creatorId || !creatorId || item.creatorId === creatorId)
    );
  }

  function ensureStyle() {
    if (document.getElementById('accelerator-review-reminder-style')) return;
    const style = document.createElement('style');
    style.id = 'accelerator-review-reminder-style';
    style.textContent = [
      '.accelerator-review-reminder{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin:0 0 18px;padding:14px 16px;border:1px solid #e1d9b9;border-radius:14px;background:#fff9df;color:#33404a}',
      '.accelerator-review-reminder strong{display:block;margin:0 0 4px;font:800 13px/1.3 Inter,system-ui,sans-serif;color:#17212b}',
      '.accelerator-review-reminder span{display:block;font:550 12px/1.45 Inter,system-ui,sans-serif;color:#66717c}',
      '.accelerator-review-reminder-actions{display:flex;gap:8px;flex:none}',
      '.accelerator-review-reminder button{min-height:34px;border:1px solid #c7b96d;border-radius:9px;background:#fff;color:#554b1f;padding:7px 10px;font:750 11px/1 Inter,system-ui,sans-serif;cursor:pointer}',
      '@media(max-width:680px){.accelerator-review-reminder{display:grid}.accelerator-review-reminder-actions{justify-content:flex-start}}'
    ].join('');
    document.head.appendChild(style);
  }

  function render() {
    renderQueued = false;
    ensureStyle();
    const page = document.querySelector('#app main .page');
    if (!page) return;
    let banner = page.querySelector('[data-accelerator-review-reminder]');
    const matches = relevant();
    if (!matches.length) {
      if (banner) banner.remove();
      return;
    }
    if (!banner) {
      banner = document.createElement('aside');
      banner.className = 'accelerator-review-reminder';
      banner.setAttribute('data-accelerator-review-reminder', '');
      page.insertBefore(banner, page.firstChild);
    }
    const first = matches[0];
    const markup =
      '<div><strong>' + matches.length + ' connected decision' + (matches.length === 1 ? '' : 's') + ' to review</strong>' +
      '<span>' + escapeHtml(first.copy || first.label) + '</span></div>' +
      '<div class="accelerator-review-reminder-actions">' +
      '<button type="button" data-review-dismiss="' + escapeHtml(first.id) + '">Dismiss</button></div>';
    if (banner.dataset.signature !== markup) {
      banner.dataset.signature = markup;
      banner.innerHTML = markup;
    }
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[char]);
  }

  function schedule() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(render);
  }

  document.addEventListener('accelerator:review-queue', schedule);
  document.addEventListener('click', event => {
    const button = event.target.closest && event.target.closest('[data-review-dismiss]');
    if (!button) return;
    window.__acceleratorReviewReminders?.dismiss(button.dataset.reviewDismiss);
    schedule();
  });

  if (document.body) new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, { once: true });
  else schedule();
})();
