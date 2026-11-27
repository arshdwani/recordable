// Atlassian Document Format builders for Recordable notes on injury and illness requests.

export const text = (t, marks) => ({ type: 'text', text: String(t), ...(marks ? { marks } : {}) });
export const strong = (t) => text(t, [{ type: 'strong' }]);
export const link = (t, href) => text(t, [{ type: 'link', attrs: { href } }]);
export const mention = (accountId) => ({ type: 'mention', attrs: { id: accountId } });
export const para = (...nodes) => ({ type: 'paragraph', content: nodes.flat().filter(Boolean).map((n) => (typeof n === 'string' ? text(n) : n)) });
export const bullets = (items) => ({ type: 'bulletList', content: items.filter(Boolean).map((i) => ({ type: 'listItem', content: [para(i)] })) });
export const heading = (t, level = 3) => ({ type: 'heading', attrs: { level }, content: [text(t)] });
export const doc = (...blocks) => ({ type: 'doc', version: 1, content: blocks.flat().filter(Boolean) });

/** A Recordable note: bold lead, then optional bullet lines. */
export const note = (lead, lines = [], extra = []) => doc(para(strong('Recordable: '), lead), lines.filter(Boolean).length ? bullets(lines.filter(Boolean)) : null, ...extra);
