(() => {
  'use strict';
  if (window.__acceleratorPlainLanguageUi) return;
  window.__acceleratorPlainLanguageUi = true;

  const EXACT = new Map(Object.entries({
    'Provisional':'Not final yet',
    'PROVISIONAL':'NOT FINAL YET',
    'Constraint':'Main issue',
    'CONSTRAINT':'MAIN ISSUE',
    'Current constraint':'Main issue right now',
    'Leading constraint':'Main issue',
    'Find bottleneck':'Find the main issue',
    'Find the first real constraint':'Find the first real problem',
    'Bottleneck':'Main issue',
    'BOTTLENECK':'MAIN ISSUE',
    'Working bottleneck':'What the data is pointing to',
    'Working clue':'What the data is pointing to',
    'Working read':'Current read',
    'Primary signal':'Main number to watch',
    'PRIMARY SIGNAL':'MAIN NUMBER TO WATCH',
    'Guardrail':'What needs to stay healthy',
    'GUARDRAIL':'WHAT NEEDS TO STAY HEALTHY',
    'Guardrails':'What needs to stay healthy',
    'GUARDRAILS':'WHAT NEEDS TO STAY HEALTHY',
    'Explore / Exploit':'Test new ideas or repeat what works',
    'EXPLORE / EXPLOIT':'TEST NEW IDEAS OR REPEAT WHAT WORKS',
    'Explore':'Test new ideas',
    'EXPLORE':'TEST NEW IDEAS',
    'Exploit':'Repeat what works',
    'EXPLOIT':'REPEAT WHAT WORKS',
    'Portfolio':'Content mix',
    'PORTFOLIO':'CONTENT MIX',
    'Programming':'What to make next',
    'PROGRAMMING':'WHAT TO MAKE NEXT',
    'Programming lesson':'What this video taught us',
    'PROGRAMMING LESSON':'WHAT THIS VIDEO TAUGHT US',
    'Monthly posture':'This month’s approach',
    'Choose monthly posture':'Choose this month’s approach',
    '90-day chapter':'90-day plan',
    'Open operating plan →':'Open plan →',
    'Gather evidence':'Gather the data and examples',
    'Evidence confidence':'How sure are we?',
    'Research / evidence':'Research / proof',
    'No obvious single constraint':'No single main problem',
    'Discovery / not enough qualified viewers':'Reach / not enough of the right new viewers',
    'Qualified growth':'Grow with the right audience',
    'Baseline Library':'Usual Performance Library',
    'Video Performance Baselines':'What This Creator Usually Gets',
    'Baseline name':'Name this comparison',
    'Same-age window':'Checkpoint',
    'Add baseline':'Add usual performance',
    '+ Add baseline':'+ Add usual performance',
    'Save baseline':'Save usual performance',
    'Baseline history':'Past usual-performance versions',
    'No matched baseline':'No usual result saved yet',
    'Matched normal':'Usual result',
    'Starting normal':'Starting usual result',
    'Current normal':'Current usual result',
    'Same-age views':'Views by this point',
    'Matched comparison':'Fair comparison',
    'Connected decisions to review':'Things to review after this change'
  }));

  const PHRASES = [
    ['Use this for programming and follow-up decisions.','Use this to decide what to make next and what to repeat, change, or stop.'],
    ['The useful state is not “how many fields are filled.” It is the active constraint, the current month, and the next decision that would move the creator forward.',
      'What matters is not how many fields are filled. It is knowing the main issue, what matters this month, and the next useful move.'],
    ['Opportunity → Click → Opening → Experience → Action. Stop at the first meaningful break. Do not blame CTA when the video never earned the click.',
      'Was it shown? → Did they click? → Did they keep watching? → Did they take the next step? Stop at the first place the numbers clearly drop.'],
    ['Choose a destination, hypothesis and sequence of monthly chapters that attack the constraint in order.',
      'Choose where the channel should be in 90 days, what you think will get it there, and what each month should focus on.'],
    ['Explore or exploit, then allocate Reach, Trust and Convert slots based on the actual bottleneck and capacity.',
      'Decide whether to test new ideas or repeat what works, then choose the Reach, Trust, and Convert mix based on the main issue and how much the team can make.'],
    ['Explore when evidence is weak, Exploit when evidence is strong, and preserve the baseline that should not be destabilized.',
      'Test new ideas when you are unsure. Repeat what works when the pattern is clear. Keep the parts that are already healthy.'],
    ['At the end of the month, decide what the evidence means for the next month. Do not simply roll unfinished ideas forward unchanged.',
      'At the end of the month, decide what the results mean for next month. Do not automatically carry unfinished ideas forward.'],
    ['The bottleneck itself may have changed. Preserve completed work and rebuild what remains.',
      'The main issue may have changed. Keep what is already done and update the parts that still need work.'],
    ['Nothing in the chain is clearly broken. Choose the highest-leverage strategic opportunity instead of forcing a problem diagnosis.',
      'Nothing looks clearly broken. Choose the most useful thing to improve or test next instead of inventing a problem.'],
    ['Run a deliberate Explore/Exploit test against the strongest opportunity.',
      'Run one deliberate test around the strongest idea, or repeat what is already working.'],
    ['Use Explore when you do NOT yet have enough evidence to know what deserves repeated investment. You intentionally test a wider range of topics, formats, packages, or angles to acquire signal.',
      'Test new ideas when you are not sure what deserves more investment yet. Try a wider range of topics, formats, titles/thumbnails, or angles so you can see what actually works.'],
    ['Use Exploit when you DO have a clear signal worth repeating. You narrow the range, create follow-ups, repeat proven formats, and put more resources behind what is already working.',
      'Repeat what works when you have a clear pattern. Narrow the range, make follow-ups, reuse proven formats, and put more effort behind what is already working.'],
    ['The follow-up should exploit the signal, not merely repeat the first video.',
      'The follow-up should build on what worked, not just repeat the first video.'],
    ['A deliberate test used to reduce uncertainty and acquire signal about topic, format, package, audience or business response.',
      'A deliberate test used to learn whether the topic, format, title/thumbnail, audience, or business result actually works.'],
    ['Use when there is not enough evidence yet to confidently exploit a direction.',
      'Use this when you do not have enough data yet to confidently repeat a direction.'],
    ['A shortlist of validated topic and format opportunities, each with evidence and a clear reason it may transfer.',
      'A shortlist of promising topics and formats, with the data or examples that support each one and why it may work here.'],
    ['Study topic demand, title formulas and thumbnail concepts as separate variables so packaging is built from evidence rather than taste.',
      'Study topic demand, title patterns, and thumbnail ideas separately so the title/thumbnail is based on what is working, not just taste.'],
    ['Compare by job, format, traffic source and realistic baseline.',
      'Compare similar videos by job, format, traffic source, and what this creator usually gets.'],
    ['Record what happened → what it may mean → what changes next.',
      'Write down what happened, what you think it means, and what should change next.'],
    ['Reusable learning objects, follow-up backlog, packaging learnings, catalogue opportunities and next-decision recommendations.',
      'Reusable lessons, follow-up ideas, title/thumbnail lessons, older-video opportunities, and a clear next move.'],
    ['Reporting without decisions, overreacting to early noise or ignoring catalogue behavior.',
      'Reporting numbers without deciding what to do, overreacting too early, or ignoring what older videos are doing.'],
    ['The strategy may be fine, but production capacity or consistency is the bottleneck.',
      'The strategy may be fine, but the team may simply be unable to make videos consistently enough.'],
    ['Before diagnosing clicks or retention, verify whether the channel is creating enough qualified discovery opportunities.',
      'Before blaming CTR or retention, check whether enough of the right new viewers are seeing the videos in the first place.'],
    ['The channel is not creating enough qualified entry points for the rest of the viewer journey to compound.',
      'The channel is not bringing in enough of the right new viewers for everything else to build from.'],
    ['The audience watches, but not enough qualified viewers move into a deeper relationship.',
      'People watch, but not enough of the right viewers come back or go deeper with the channel.'],
    ['Qualified viewers exist, but they are stuck on proof, fit, process, objections, or action.',
      'The right viewers are there, but something about proof, fit, process, objections, or the next step is stopping them from acting.'],
    ['A video chosen mainly to bring the right new people into the channel. Use it when qualified discovery is the current need.',
      'A video meant mainly to bring the right new people into the channel. Use it when Reach is the main need.'],
    ['Another execution of a format or show that already has evidence of working. Use it when you want to reinforce a winner instead of constantly inventing something new.',
      'Another version of a format or show that is already working. Use it when you want to repeat a winner instead of constantly inventing something new.'],
    ['A video created because existing evidence already says the audience wants more around a proven topic, problem, person or format.',
      'A video created because the audience has already shown they want more around a proven topic, problem, person, or format.'],
    ['A decision-support video for qualified viewers who need proof, fit, process, price, objection, or next-step clarity.',
      'A video for interested viewers who need help deciding based on proof, fit, process, price, objections, or the next step.'],
    ['Keep facts separate from explanations until you have enough evidence.',
      'Keep what you know separate from what you think it means until you have enough data.'],
    ['What evidence do we already have?',
      'What do we already know from the data, comments, and past videos?'],
    ['Which research source can answer the unknown?',
      'Where can we look to answer what we still do not know?'],
    ['Pick research by the decision you need to make, then stop once the evidence is sufficient to move.',
      'Research the question you actually need to answer, then stop once you have enough to make the next decision.']
  ];

  const SKIP = new Set(['SCRIPT','STYLE','CODE','PRE','TEXTAREA','INPUT']);
  const attrs = ['title','aria-label','placeholder'];

  function rewriteString(value) {
    if (!value) return value;
    const trimmed = value.trim();
    if (EXACT.has(trimmed)) {
      const replacement = EXACT.get(trimmed);
      return value.replace(trimmed, replacement);
    }
    let out = value;
    for (const [from,to] of PHRASES) if (out.includes(from)) out = out.split(from).join(to);
    return out;
  }

  function blocked(el) {
    if (!el || el.nodeType !== 1) return false;
    if (SKIP.has(el.tagName)) return true;
    if (el.isContentEditable) return true;
    if (el.closest?.('[data-plain-language-skip], .user-entered, .user-content, .markdown-body')) return true;
    return false;
  }

  function rewriteNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (!parent || blocked(parent)) return;
      const next = rewriteString(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || blocked(node)) return;
    for (const attr of attrs) {
      if (!node.hasAttribute(attr)) continue;
      const before = node.getAttribute(attr);
      const after = rewriteString(before);
      if (after !== before) node.setAttribute(attr, after);
    }
    for (const child of node.childNodes) rewriteNode(child);
  }

  let scheduled = false;
  function run() {
    scheduled = false;
    if (document.body) rewriteNode(document.body);
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(run);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true});
  else run();

  new MutationObserver(schedule).observe(document.documentElement, {
    childList:true,
    subtree:true,
    characterData:true,
    attributes:true,
    attributeFilter:attrs
  });

  window.__acceleratorPlainLanguage = { run, rewriteString };
})();