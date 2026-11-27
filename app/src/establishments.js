// Establishments, wherever they live: the "OSHA establishments" schema in JSM Assets, or Recordable's own register
// when Assets is missing (or the admin prefers it). Reads from Assets refresh a mirror in storage, which the portal
// form, the triggers and the Rovo actions use (Assets refuses app-context calls).
import * as store from './store.js';
import * as assets from './assets.js';
import { UserError } from './errors.js';
import { cleanEstablishment, FIELDS, estTypeCode, estTypeLabel } from './core/establishments.js';

export const usesAssets = (cfg) => Boolean(cfg.assets && !cfg.registerOnly);
const clean = (input) => cleanEstablishment(input, (m) => { throw new UserError(m); });
const toAssets = (e) => ({ ...e, ...(e.estType !== undefined ? { estType: estTypeLabel(e.estType) } : {}) });
const fromAssets = (e) => ({ ...e, estType: estTypeCode(e.estType) });

/** All establishments. In Assets mode the mirror is refreshed (as the signed-in user). */
export async function loadEstablishments(cfg, { who = 'user', refresh = true } = {}) {
  if (!usesAssets(cfg) || who === 'app' || !refresh) return store.listEstablishments();
  let live;
  try {
    live = (await assets.listObjects(cfg.assets, who)).map(fromAssets);
  } catch (e) {
    console.error('Recordable: establishments read from Assets failed, using the mirror', e.message);
    return store.listEstablishments();
  }
  const mirror = await store.listEstablishments();
  const sample = new Set((await store.getSample()).establishments || []);
  const liveIds = new Set(live.map((s) => s.id));
  for (const s of live) {
    const old = mirror.find((m) => m.id === s.id);
    const next = { ...s, sample: sample.has(s.id) };
    if (!old || FIELDS.some((f) => (old[f] || '') !== (next[f] || '')) || old.sample !== next.sample || old.objectKey !== next.objectKey) await store.saveEstablishment(next);
  }
  for (const m of mirror) if (m.id.startsWith('a') && !liveIds.has(m.id)) await store.deleteEstablishment(m.id);
  return live.map((s) => ({ ...s, sample: sample.has(s.id) }));
}

export async function addEstablishment(cfg, input, { sample = false } = {}) {
  const fields = clean(input);
  if (!fields.name) throw new UserError('Give the establishment a name.');
  let e;
  if (usesAssets(cfg)) {
    const o = await assets.createObject(cfg.assets, toAssets(fields), 'user');
    e = { ...fields, id: `a${o.objectId}`, objectId: o.objectId, objectKey: o.objectKey };
  } else {
    e = { ...fields, id: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` };
  }
  e.sample = sample;
  await store.saveEstablishment(e);
  return e;
}

export async function updateEstablishment(cfg, id, input) {
  const old = await store.getEstablishment(id);
  if (!old) throw new UserError('That establishment is no longer there. Refresh the page.');
  const fields = clean(input);
  if (old.objectId && usesAssets(cfg)) await assets.updateObject(cfg.assets, old.objectId, toAssets({ name: old.name, ...fields }), 'user');
  const e = { ...old, ...fields };
  await store.saveEstablishment(e);
  return e;
}

export async function removeEstablishment(cfg, id) {
  const old = await store.getEstablishment(id);
  if (!old) return { ok: true };
  if (old.objectId && cfg.assets) await assets.deleteObject(cfg.assets, old.objectId, 'user').catch((e) => { if (e.status !== 404) throw e; });
  await store.deleteEstablishment(id);
  return { ok: true };
}
