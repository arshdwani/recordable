// UI resolvers: the backend for the Recordable page, the request panel, the portal form and the issue action.
import ResolverModule from '@forge/resolver';
// With "type": "module", Forge's bundler hands back the CommonJS namespace; unwrap the class either way.
const Resolver = ResolverModule.default || ResolverModule;
import * as svc from '../service.js';
import { loadSampleStep, removeSampleStep } from '../sample.js';
import * as store from '../store.js';
import { friendly } from '../errors.js';
import * as jira from '../jira.js';
import { TREATMENTS, BODY_PARTS, TYPES, MEDS } from '../core/catalog.js';

const resolver = new Resolver();
const accountId = (req) => req.context?.accountId;
const issueKeyOf = (req) => req.payload?.issueKey || req.context?.extension?.issue?.key;

// Every resolver returns { error } with a message people can act on; the raw response goes to the logs.
const safe = (fn) => async (req) => {
  try {
    return await fn(req);
  } catch (e) {
    console.error(e);
    return { error: friendly(e) };
  }
};
const def = (name, fn) => resolver.define(name, safe(fn));
const withIssue = (fn) => (req) => fn({ ...(req.payload || {}), issueKey: issueKeyOf(req), accountId: accountId(req) });

// Portal: the "Injury or illness" form (jiraServiceManagement:portalRequestCreatePropertyPanel). Runs for customers,
// so it reads only Recordable's own storage: whether this request type is the injury form, and the establishments.
def('portalForm', async (req) => {
  const cfg = await store.getConfig();
  const typeId = String(req.payload?.requestTypeId || req.context?.extension?.request?.typeId || '');
  const enabled = Boolean(cfg.requestTypeId && typeId && typeId === String(cfg.requestTypeId));
  if (!enabled) return { enabled: false };
  const ests = (await store.listEstablishments()).sort((a, b) => a.name.localeCompare(b.name));
  return {
    enabled: true,
    establishments: ests.map((e) => ({ value: e.id, label: e.name })),
    treatments: TREATMENTS.filter((t) => t.code !== 'otc' && t.code !== 'rx').map((t) => ({ value: t.code, label: t.portal })),
    bodyParts: BODY_PARTS.map((b) => ({ value: b.code, label: b.label })),
    kinds: TYPES.map((t) => ({ value: t.code, label: t.code === 'injury' ? 'An injury (cut, sprain, burn, fracture, strain...)' : t.label })),
    meds: [...Object.entries(MEDS).map(([value, m]) => ({ value, label: m.label })), { value: 'other', label: 'Something else' }],
  };
});

// Board
def('getBoard', () => svc.getBoard());
def('setUp', () => svc.setUp());
def('listEstablishments', () => svc.listEstablishments());
def('saveEstablishment', (req) => svc.saveEstablishment(req.payload || {}));
def('removeEstablishment', (req) => svc.removeEstablishment(req.payload || {}));
def('saveYear', (req) => svc.saveYear(req.payload || {}));
def('connectAssets', () => svc.connectAssets());
def('saveSettings', (req) => svc.saveSettings(req.payload || {}));
def('loadSample', (req) => loadSampleStep({ accountId: accountId(req) }));
def('removeSample', () => removeSampleStep());
def('getYearView', async (req) => {
  const v = await svc.yearView(req.payload?.estId, req.payload?.year);
  return { est: { id: v.est.id, name: v.est.name }, year: v.year, rows: v.rows, t: v.t, rates: v.rates, checks: v.checks, hours: v.hours, avgEmployees: v.avgEmployees, peakEmployees: v.peakEmployees, ita: v.ita };
});
def('prepareSummary', (req) => svc.prepareSummary({ ...(req.payload || {}), accountId: accountId(req) }));
def('markYear', (req) => svc.markYear({ ...(req.payload || {}), accountId: accountId(req) }));
def('listUsers', async () => {
  const cfg = await store.getConfig();
  return cfg.projectKey ? jira.assignableUsers(cfg.projectKey) : [await jira.myself()];
});

// Request panel and issue action
def('getPanel', (req) => svc.getPanel(issueKeyOf(req), { accountId: accountId(req) }));
def('openCase', withIssue((p) => svc.openFromAction(p)));
def('getIntake', (req) => svc.intakeFor(issueKeyOf(req)));
def('updateFacts', withIssue(svc.updateFacts));
def('logCase', withIssue(svc.logCase));
def('unlogCase', withIssue(svc.unlogCase));
def('closeCase', withIssue(svc.closeCase));
def('reopenCase', withIssue(svc.reopenCase));
def('markReported', withIssue(svc.markReported));

export const handler = resolver.getDefinitions();
