// "Load sample" and "Remove sample": resumable in steps, because each UI call has 25 seconds.
// The sample raises real JSM requests on the "Injury or illness" request type with portal-form answers, opens the
// cases, adds what a safety coordinator would add, and logs or closes them, so every screen has something to show.
import * as store from './store.js';
import * as jira from './jira.js';
import * as svc from './service.js';
import * as estab from './establishments.js';
import { SAMPLE_ESTABLISHMENTS, SAMPLE_CASES, sampleDate, sampleHours, samplePortal } from './core/sample.js';
import { wallNow, wallToday } from './core/establishments.js';
import { yearOf } from './core/dates.js';
import { UserError } from './errors.js';

const STEPS = ['setup', 'establishments', 'cases', 'done'];
const now = () => Date.now();

export async function loadSampleStep({ accountId, budgetMs = 18000 } = {}) {
  const t0 = now();
  await svc.requireAdmin('load the sample');
  let job = (await store.getJob('sample')) || { phase: 'setup', done: [] };
  const sample = await store.getSample();
  const left = () => budgetMs - (now() - t0);
  const out = () => ({ phase: job.phase, step: STEPS.indexOf(job.phase) + 1, steps: STEPS.length, done: job.phase === 'done', cases: job.done.length, total: SAMPLE_CASES.length, keys: Object.values(sample.cases || {}) });

  if (job.phase === 'setup') {
    let cfg = await svc.ensureProject(await store.getConfig());
    await svc.ensureEstablishmentBackend(cfg);
    job = { ...job, phase: 'establishments' };
    await store.saveJob('sample', job);
    if (left() < 6000) return out();
  }

  if (job.phase === 'establishments') {
    const cfg = await store.getConfig();
    sample.establishments = sample.establishments || [];
    sample.estIds = sample.estIds || {};
    for (const e of SAMPLE_ESTABLISHMENTS) {
      if (sample.estIds[e.key] && (await store.getEstablishment(sample.estIds[e.key]))) continue;
      const { key, avg, peak, ...fields } = e;
      const made = await estab.addEstablishment(cfg, fields, { sample: true });
      sample.estIds[key] = made.id;
      sample.establishments.push(made.id);
      await store.saveSample(sample);
      const today = wallToday(e.tz);
      await store.saveYear({ estId: made.id, year: yearOf(today), hours: sampleHours(avg, today), avgEmployees: avg, peakEmployees: peak, sample: true });
    }
    job = { ...job, phase: 'cases' };
    await store.saveJob('sample', job);
    if (left() < 6000) return out();
  }

  if (job.phase === 'cases') {
    const cfg = await store.getConfig();
    if (!cfg.serviceDeskId || !cfg.requestTypeId) throw new UserError('Set up Recordable first.');
    const portalKey = jira.portalPropKey();
    sample.cases = sample.cases || {};
    sample.issues = sample.issues || [];
    for (const s of SAMPLE_CASES) {
      if (job.done.includes(s.key)) continue;
      if (left() < 7000) return out();
      const estId = sample.estIds[s.est];
      const est = await store.getEstablishment(estId);
      const tz = est?.tz || 'America/New_York';
      const today = wallToday(tz);
      let date = sampleDate(today, s.ago);
      let time = s.time;
      let learned = { date, time: s.time };
      if (s.hoursAgo) {
        const at = new Date(wallNow(tz) - s.hoursAgo * 36e5).toISOString();
        date = at.slice(0, 10);
        time = at.slice(11, 16);
        const l = new Date(wallNow(tz) - (s.hoursAgo - 0.25) * 36e5).toISOString();
        learned = { date: l.slice(0, 10), time: l.slice(11, 16) };
      }
      let key = sample.cases[s.key];
      if (!key) {
        const made = await jira.createRequest({ serviceDeskId: cfg.serviceDeskId, requestTypeId: cfg.requestTypeId, summary: s.summary, description: undefined, who: 'user' });
        key = made.key;
        sample.cases[s.key] = key;
        sample.issues.push(key);
        await store.saveSample(sample);
        if (portalKey) await jira.setProperty(key, portalKey, { fields: samplePortal(s, { estId, date, time }), isValid: true }, 'user');
      }
      // Open from the portal answers, then date it as the employee reported it (the day the employer learned of it).
      const opened = await svc.openCase({ issueKey: key, accountId, source: 'sample', sample: true, quiet: true });
      if (!opened.existed || !opened.case.sampleDated) {
        const c = await store.getCase(key);
        await store.saveCase({ ...c, sample: true, sampleDated: true, facts: { ...c.facts, learnedDate: learned.date, learnedTime: learned.time } });
      }
      if (s.patch) await svc.updateFacts({ issueKey: key, patch: s.patch(today), accountId, quiet: true });
      const c = await store.getCase(key);
      const ev = await svc.evaluateCase(c);
      await jira.addComment(key, svc.decisionNote(ev, c, { first: true }), { who: 'user', internal: true }).catch(() => null);
      if (s.then === 'log' && !c.log) await svc.logCase({ issueKey: key, accountId, day: ev.r.recordBy && ev.r.recordBy < ev.today ? addOne(c.facts.learnedDate) : ev.today });
      if (s.then === 'close' && c.status === 'open') await svc.closeCase({ issueKey: key, accountId });
      job = { ...job, done: [...job.done, s.key] };
      await store.saveJob('sample', job);
    }
    job = { ...job, phase: 'done' };
    await store.saveJob('sample', job);
  }
  await store.deleteJob('sample');
  return { ...out(), phase: 'done', done: true, cases: SAMPLE_CASES.length };
}

// Sample cases logged long after the injury are dated as if entered the day after it was reported (on time).
const addOne = (iso) => new Date(Date.parse(`${iso}T00:00:00Z`) + 864e5).toISOString().slice(0, 10);

/** Remove the sample: its requests (and any year-end tasks for its establishments), cases, establishments, year data. */
export async function removeSampleStep({ budgetMs = 18000 } = {}) {
  const t0 = now();
  await svc.requireAdmin('remove the sample');
  const sample = await store.getSample();
  const cfg = await store.getConfig();
  const ests = sample.establishments || [];
  let removedRequests = 0;
  let removedEstablishments = 0;
  const years = (await store.listYears()).filter((y) => ests.includes(y.estId));
  const issues = [...new Set([...(sample.issues || []), ...years.map((y) => y.summaryKey).filter(Boolean)])];
  for (const key of issues) {
    if (now() - t0 > budgetMs - 4000) break;
    await jira.deleteIssue(key, 'user').catch((e) => { if (e.status !== 404) throw e; });
    await store.deleteCase(key);
    await jira.deleteProperty(key, 'recordable').catch(() => null);
    sample.issues = (sample.issues || []).filter((k) => k !== key);
    removedRequests++;
    await store.saveSample({ ...sample, issues: sample.issues });
  }
  const remaining = (sample.issues || []).length;
  if (!remaining && now() - t0 < budgetMs - 3000) {
    // Cases on the sample establishments that people raised while trying the app stay, but lose their establishment.
    for (const c of await store.listCases()) if (ests.includes(c.facts?.est) && !c.sample) await store.saveCase({ ...c, facts: { ...c.facts, est: null } });
    for (const y of years) {
      await store.saveYear({ ...y, summaryKey: null });
      await store.deleteYear(y.estId, y.year);
    }
    for (const id of ests) {
      await estab.removeEstablishment(cfg, id).catch((e) => console.error('Recordable: sample establishment', e.message));
      for (const k of await store.listClaims(`caseno:${id}:`)) await store.deleteRaw(k);
      removedEstablishments++;
    }
    await store.deleteSample();
    await store.deleteJob('sample');
  }
  return { removedRequests, removedEstablishments, remaining: remaining || (ests.length && removedEstablishments < ests.length ? 1 : 0) };
}
