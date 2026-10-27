const fs = require('node:fs');
const path = require('node:path');

const FIRST_WEEK = '2026-11-02';
const zone = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', hourCycle: 'h23'
});

function dueWeek(now) {
  const parts = Object.fromEntries(zone.formatToParts(now).map(p => [p.type, p.value]));
  const date = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  if (daysSinceMonday === 0 && Number(parts.hour) < 9) date.setUTCDate(date.getUTCDate() - 7);
  return date.toISOString().slice(0, 10);
}

function gate(runs, now = new Date(), manual = false) {
  const week = dueWeek(now);
  const period = week;
  if (!manual && week < FIRST_WEEK) return {run: false, reason: 'not_due', week};
  const relevant = runs.filter(r => r.week === period);
  if (!manual && relevant.some(r => r.result === 'complete')) {
    return {run: false, reason: 'already_complete', week: period};
  }
  const last = relevant.slice().sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))[0];
  if (!manual && last) {
    const retryHours = last.result === 'blocked' ? 24 : 4;
    if (now - new Date(last.finishedAt) < retryHours * 3600000) {
      return {run: false, reason: 'retry_backoff', week: period, lastResult: last.result};
    }
  }
  return {run: true, reason: manual ? 'manual' : 'weekly_due_or_catch_up', week: period,
    instruction: 'Resume this week; skip channels already verified in the run reports. Never mark an unconfirmed save complete.'};
}

function readRuns(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter(n => /^run-.*\.json$/.test(n)).map(name => {
    const entry = JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.week || '') ||
        !['complete', 'partial', 'blocked'].includes(entry.result) ||
        !Number.isFinite(Date.parse(entry.finishedAt)) || !Array.isArray(entry.channels)) {
      throw new Error(`Invalid run record: ${name}. Review it before collecting again.`);
    }
    return entry;
  });
}

if (require.main === module) {
  try {
    const directory = path.resolve(__dirname, '../../weekly-analytics');
    console.log(JSON.stringify(gate(readRuns(directory), new Date(), process.argv.includes('--manual')), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {dueWeek, gate, readRuns};
