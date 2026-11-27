// End to end over the real backend, offline: a fake Jira/JSM site with Assets switched off, so establishments live in
// Recordable's own register. Runs setup, the sample, questions, the OSHA report, logging, the year-end package and
// ITA files, Rovo actions, the portal trigger, alerts, personal data reporting and sample removal.
// Run with --experimental-test-module-mocks.
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createSite, fakeKvs } from './fakes/site.js';

const APP_ID = '6dcac9f3-8e0d-48c1-80d5-0088740349a2';
const site = createSite();
const route = (strings, ...vals) => strings.reduce((out, s, i) => out + s + (i < vals.length ? encodeURIComponent(vals[i]) : ''), '');
mock.module('@forge/api', {
  exports: {
    asApp: () => ({ requestJira: site.requestJira('app') }),
    asUser: () => ({ requestJira: site.requestJira('user') }),
    route,
    assumeTrustedRoute: (p) => p,
    getAppContext: () => ({ appAri: { appId: APP_ID } }),
    privacy: {
      reportPersonalData: async (accounts) => {
        site.reported = accounts;
        return accounts.filter((a) => a.accountId === 'u3').map((a) => ({ accountId: a.accountId, status: 'closed' }));
      },
    },
  },
});
mock.module('@forge/kvs', { exports: fakeKvs(site.kv) });

const svc = await import('../src/service.js');
const sample = await import('../src/sample.js');
const store = await import('../src/store.js');
const actions = await import('../src/actions.js');
const triggers = await import('../src/triggers.js');
const { HEADERS_300A, HEADERS_CASES } = await import('../src/core/ita.js');

const cells = (line) => { let n = 1; let q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) n++; } return { length: n }; };
const keyOf = async (k) => (await store.getSample()).cases[k];
const ctx = { principal: { accountId: 'u-admin' } };
const ev = async (k) => (await svc.evaluateCase(await store.getCase(k))).r;

test('setup picks the HR desk and creates "Injury or illness" on a case type, not a change type', async () => {
  const r = await svc.setUp();
  assert.match(r.project, /Human Resources/);
  const cfg = await store.getConfig();
  const rt = site.requestTypes.find((t) => t.id === cfg.requestTypeId);
  assert.equal(rt.name, 'Injury or illness');
  assert.equal(rt.issueTypeId, '10013');
  assert.equal(cfg.registerOnly, true);
  assert.match(cfg.assetsNote, /Assets isn't available/);
  const b = await svc.getBoard();
  assert.equal(b.setup.hidden, true, 'the board tells the admin to add the request type to a portal group');
});

test('load sample: 2 establishments, 12 cases, logged, closed and open ones', async () => {
  let r;
  for (let i = 0; i < 40; i++) {
    r = await sample.loadSampleStep({ accountId: 'u-admin', budgetMs: 60000 });
    if (r.done) break;
  }
  assert.equal(r.done, true);
  const ests = await store.listEstablishments();
  assert.equal(ests.length, 2);
  const cases = await store.listCases();
  assert.equal(cases.length, 12);
  assert.equal(cases.filter((c) => c.status === 'logged').length, 7);
  assert.equal(cases.filter((c) => c.status === 'closed').length, 2);
  assert.equal(cases.filter((c) => c.status === 'open').length, 3);
  assert.ok(cases.every((c) => c.sample));
  // Recordable stores codes, not names.
  assert.ok(!JSON.stringify([...site.kv.values()]).includes('Marcus Bell'));
});

test('sample decisions match the rules', async () => {
  assert.equal((await ev(await keyOf('sutures'))).decision, 'recordable');
  const bf = await store.getCase(await keyOf('butterfly'));
  assert.equal(bf.status, 'closed');
  const otc = await ev(await keyOf('otc-rx'));
  assert.equal(otc.decision, 'recordable');
  assert.match(otc.summary, /prescription-strength/);
  const rs = await ev(await keyOf('restricted'));
  assert.equal(rs.outcome, 'restricted');
  assert.equal(rs.days.restricted, 12);
  const ns = await ev(await keyOf('needlestick'));
  assert.equal(ns.privacy[0].code, 'sharps');
  const hr = await ev(await keyOf('hearing'));
  assert.equal(hr.typeCol, 'M5');
  const cm = await store.getCase(await keyOf('commute'));
  assert.equal(cm.status, 'closed');
  const fx = await ev(await keyOf('fracture'));
  assert.equal(fx.outcome, 'away');
  assert.equal(fx.days.away, 21);
  const amp = await ev(await keyOf('amputation'));
  assert.equal(amp.report.required, true);
  assert.equal(amp.report.hours, 24);
  assert.equal((await ev(await keyOf('question-dose'))).questions[0].id, 'med.doseMg');
  assert.equal((await ev(await keyOf('question-prior'))).questions[0].id, 'prior');
});

test('case numbers run per establishment and year; privacy cases hide the name on the log', async () => {
  const sm = await store.getSample();
  const p1 = await svc.yearView(sm.estIds.p1, new Date().getUTCFullYear());
  assert.deepEqual(p1.rows.map((r) => r.caseNo.slice(5)), ['001', '002', '003']);
  assert.equal(p1.rows.find((r) => r.issueKey === sm.cases.needlestick).name, 'Privacy case');
  assert.equal(p1.rows.find((r) => r.issueKey === sm.cases.sutures).name, 'Marcus Bell');
  const p2 = await svc.yearView(sm.estIds.p2, new Date().getUTCFullYear());
  assert.equal(p2.rows.length, 4);
  assert.equal(p2.t.H, 2);
  assert.equal(p2.t.I, 1);
  assert.equal(p2.t.J, 1);
  assert.ok(p2.rates.dart > 0);
  assert.equal(p2.rates.dart, Math.round(((3 * 200000) / p2.hours) * 100) / 100);
});

test('answering a question re-decides the case', async () => {
  const k = await keyOf('question-dose');
  await svc.updateFacts({ issueKey: k, question: 'med.doseMg', answer: '800', accountId: 'u-admin' });
  assert.equal((await ev(k)).decision, 'recordable');
  const p = await keyOf('question-prior');
  await svc.updateFacts({ issueKey: p, question: 'prior', answer: 'not-recovered', accountId: 'u-admin' });
  assert.equal((await ev(p)).decision, 'existing-case');
  await svc.closeCase({ issueKey: p, accountId: 'u-admin' });
  assert.equal((await store.getCase(p)).status, 'merged');
});

test('the OSHA report: refused for a non-reportable case, recorded on time for the amputation', async () => {
  await assert.rejects(svc.markReported({ issueKey: await keyOf('sutures'), method: 'phone' }), /Nothing on this case needs reporting/);
  const k = await keyOf('amputation');
  await assert.rejects(svc.closeCase({ issueKey: k }), /recordable/);
  const r = await svc.markReported({ issueKey: k, method: 'online', reference: 'SIR-123', checklist: ['establishment', 'time'], accountId: 'u-admin' });
  assert.equal(r.onTime, true);
  const lg = await svc.logCase({ issueKey: k, accountId: 'u-admin' });
  assert.equal(lg.caseNo.slice(5), '004');
  assert.ok(site.issues.get(k).attachments.some((a) => a.filename.startsWith('OSHA-301-')));
  const pdf = site.issues.get(k).attachments.find((a) => a.filename.startsWith('OSHA-301-'));
  assert.ok(pdf.body.toString('latin1').startsWith('%PDF-1.4'));
});

test('year-end package: a task with the 300 log, the 300A and both ITA files in OSHA\'s exact headers', async () => {
  const sm = await store.getSample();
  const year = new Date().getUTCFullYear();
  const r = await svc.prepareSummary({ estId: sm.estIds.p1, year, accountId: 'u-admin' });
  const task = site.issues.get(r.key);
  assert.match(task.fields.summary, /OSHA 300A/);
  assert.equal(task.fields.duedate, `${year + 1}-02-01`);
  const names = task.attachments.map((a) => a.filename);
  assert.equal(names.length, 4);
  const a = task.attachments.find((x) => x.filename.startsWith('ITA-300A-')).body.toString('utf8').split('\r\n');
  assert.equal(a[0], HEADERS_300A.join(','));
  assert.equal(cells(a[1]).length, 28);
  assert.match(a[1], /^Plant 1, Dayton|^"Plant 1, Dayton"/);
  const c = task.attachments.find((x) => x.filename.startsWith('ITA-300-301-')).body.toString('utf8').trim().split('\r\n');
  assert.equal(c[0], HEADERS_CASES.join(','));
  assert.equal(c.length, 5, 'four Plant 1 cases');
  assert.ok(!c.join('\n').includes('Ana Souza'), 'names are never in the ITA file');
  assert.ok(!c.join('\n').includes('Marcus'), 'names are scrubbed from the narratives');
  // Plant 2 has 86 employees at peak: 300A only.
  const r2 = await svc.prepareSummary({ estId: sm.estIds.p2, year, accountId: 'u-admin' });
  assert.equal(site.issues.get(r2.key).attachments.length, 3);
  // Preparing again updates the same task.
  const again = await svc.prepareSummary({ estId: sm.estIds.p2, year, accountId: 'u-admin' });
  assert.equal(again.key, r2.key);
});

test('Rovo: rates for Plant 2, recordability from a description, open cases, record days', async () => {
  const rates = await actions.getRates({ establishment: 'Plant 2' });
  assert.equal(rates.establishments.length, 1);
  assert.ok(rates.establishments[0].dartRate > 0);
  assert.ok(rates.source.title);
  const yes = await actions.checkRecordable({ description: 'He got 3 stitches and went back to work the same day' });
  assert.equal(yes.decision, 'Recordable');
  assert.ok(yes.reasons.some((x) => /1904\.7\(b\)\(5\)\(ii\)\(D\)/.test(x)));
  assert.equal(yes.source.url.startsWith('https://www.ecfr.gov'), true);
  const no = await actions.checkRecordable({ description: 'Small cut closed with butterfly strips, cleaned, finished his shift' });
  assert.equal(no.decision, 'Not recordable');
  const ask = await actions.checkRecordable({ description: 'The doctor told her to take ibuprofen for her wrist' });
  assert.match(ask.decision, /questions/);
  const open = await actions.getOpenCases({});
  assert.equal(open.reportToOsha.length, 0, 'the amputation was reported');
  const capKey = await keyOf('cap');
  assert.ok(open.stillAway.some((s) => s.request === capKey));
  const d = await actions.recordDays({ issueKey: await keyOf('sutures'), daysRestricted: '3' }, ctx);
  assert.equal(d.daysRestricted, 3);
  assert.equal(d.outcome, 'Job transfer or restriction');
  assert.ok(d.source);
});

test('a portal report opens a case from the form answers via the issue-created trigger', async () => {
  const cfg = await store.getConfig();
  const sm = await store.getSample();
  const made = await site.requestJira('user')('/rest/servicedeskapi/request', { method: 'POST', body: JSON.stringify({ serviceDeskId: '4', requestTypeId: cfg.requestTypeId, requestFieldValues: { summary: 'Burned forearm on the oven' } }) });
  const { issueKey } = await made.json();
  site.issues.get(issueKey).props[APP_ID] = { fields: [{ key: 'v', value: '1' }, { key: 'est', value: sm.estIds.p1 }, { key: 'date', value: new Date().toISOString().slice(0, 10) }, { key: 'activity', value: 'working' }, { key: 'employee', value: 'Jo Example' }, { key: 'happened', value: 'Touched the curing oven door' }, { key: 'kind', value: 'injury' }, { key: 'bodyPart', value: 'arm' }, { key: 'treatments', value: 'hotcold,bandage' }, { key: 'missed', value: 'none' }], isValid: true };
  await triggers.onIssueCreated({ issue: { key: issueKey, fields: { project: { id: '10005' }, issuetype: { subtask: false } } } });
  const c = await store.getCase(issueKey);
  assert.ok(c, 'case opened');
  assert.equal(c.facts.est, sm.estIds.p1);
  assert.deepEqual(c.facts.treatments, ['hotcold', 'bandage']);
  assert.equal((await ev(issueKey)).decision, 'not-recordable');
  assert.ok(site.issues.get(issueKey).comments[0].internal);
  assert.ok(!JSON.stringify(c).includes('Jo Example'));
  await triggers.onIssueCreated({ issue: { key: issueKey, fields: { project: { id: '10005' } } } });
  assert.equal(site.issues.get(issueKey).comments.length, 1, 'a duplicate event does nothing');
});

test('treat any request as an injury: text suggestions become facts, the rest become questions', async () => {
  const made = await site.requestJira('user')('/rest/api/3/issue', { method: 'POST', body: JSON.stringify({ fields: { summary: 'Cut thumb, 4 stitches at urgent care', project: { id: '10005' }, issuetype: { id: '10013' } } }) });
  const { key } = await made.json();
  const intake = await svc.intakeFor(key);
  assert.ok(intake.matched.includes('stitches'));
  const sm = await store.getSample();
  await svc.openFromAction({ issueKey: key, est: sm.estIds.p2, incidentDate: '2026-11-20', accountId: 'u-admin' });
  const r = await ev(key);
  assert.equal(r.decision, 'needs-info');
  assert.equal(r.questions[0].id, 'workRelated');
  await svc.updateFacts({ issueKey: key, question: 'workRelated', answer: 'yes', accountId: 'u-admin' });
  assert.equal((await ev(key)).decision, 'recordable');
});

test('alerts: one per step; personal data report scrubs closed accounts', async () => {
  const a = await triggers.runAlerts();
  assert.ok(a.checked >= 1);
  const again = await triggers.runAlerts();
  assert.equal(again.posted, 0);
  // u3 acted on a case; Atlassian says the account is closed.
  const k = await keyOf('sutures');
  const c = await store.getCase(k);
  await store.saveCase({ ...c, history: [...c.history, { at: Date.now(), what: 'facts', by: 'u3' }] });
  const pr = await triggers.runPrivacyReport();
  assert.ok(pr.reported >= 2);
  assert.ok(pr.scrubbed >= 1);
  assert.ok(!(await store.getCase(k)).history.some((h) => h.by === 'u3'));
});

test('remove sample: requests, year-end tasks, establishments and year data go; other cases stay', async () => {
  let r;
  for (let i = 0; i < 20; i++) {
    r = await sample.removeSampleStep({ budgetMs: 60000 });
    if (!r.remaining) break;
  }
  assert.equal(r.remaining, 0);
  assert.equal((await store.listEstablishments()).length, 0);
  assert.equal((await store.listYears()).length, 0);
  const left = await store.listCases();
  assert.equal(left.length, 2, 'the portal case and the treated request stay');
  assert.ok(left.every((c) => !c.sample && !c.facts.est));
  assert.equal([...site.issues.values()].filter((i) => /OSHA 300A/.test(i.fields.summary)).length, 0);
});
