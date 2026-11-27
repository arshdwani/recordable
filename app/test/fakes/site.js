// An in-memory Jira + Jira Service Management site, enough to run Recordable's real backend offline.
// Assets is switched off (the workspace endpoint 404s), so establishments live in Recordable's own register.

export function createSite() {
  const s = {
    kv: new Map(),
    issues: new Map(),
    requestTypes: [
      { id: '41', name: 'Change request', issueTypeId: '10010', groupIds: ['12'] },
      { id: '42', name: 'Questions for HR', issueTypeId: '10013', groupIds: ['12'] },
      { id: '96', name: 'Raise HR Case', issueTypeId: '10013', groupIds: ['12'] },
    ],
    next: 1,
    att: 1,
    reported: null,
    calls: [],
  };
  const USERS = [
    { accountId: 'u-admin', displayName: 'Dana Admin', accountType: 'atlassian', active: true },
    { accountId: 'u1', displayName: 'Sam Ortiz', accountType: 'atlassian', active: true },
    { accountId: 'u3', displayName: 'Lee Wong', accountType: 'atlassian', active: true },
    { accountId: 'bot1', displayName: 'automation-bot', accountType: 'atlassian', active: true },
  ];
  const res = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
  const newIssue = (fields, by, extra = {}) => {
    const key = `HR-${s.next++}`;
    const i = { key, id: String(9000 + s.next), fields: { labels: [], ...fields }, comments: [], props: {}, attachments: [], status: 'To Do', by, created: new Date().toISOString(), ...extra };
    s.issues.set(key, i);
    return i;
  };
  const view = (i) => ({
    key: i.key,
    id: i.id,
    fields: {
      summary: i.fields.summary,
      description: i.fields.description || null,
      status: { name: i.status, statusCategory: { key: i.status === 'Done' ? 'done' : 'new' } },
      created: i.created,
      reporter: { accountId: 'u-admin', displayName: 'Dana Admin' },
      issuetype: { id: i.fields.issuetype?.id || '10013', subtask: Boolean(i.fields.parent) },
      parent: i.fields.parent ? { key: i.fields.parent.key } : undefined,
      project: { id: '10005', key: 'HR' },
      labels: i.fields.labels || [],
      attachment: i.attachments.map((a) => ({ id: a.id, filename: a.filename, created: i.created, size: a.size })),
      duedate: i.fields.duedate || null,
      assignee: i.fields.assignee || null,
    },
  });

  s.requestJira = (who) => async (path, opts = {}) => {
    const method = opts.method || 'GET';
    const url = String(path);
    const p = url.split('?')[0];
    const q = new URLSearchParams(url.split('?')[1] || '');
    const isJson = typeof opts.body === 'string';
    const body = isJson && opts.body ? JSON.parse(opts.body) : undefined;
    s.calls.push({ who, method, p });
    let m;
    if (p === '/rest/api/3/mypermissions') return res(200, { permissions: { ADMINISTER: { havePermission: who === 'user' } } });
    if (p === '/rest/api/3/myself') return res(200, USERS[0]);
    if (p === '/rest/api/3/serverInfo') return res(200, { baseUrl: 'https://safety.example.net' });
    if (p === '/rest/servicedeskapi/assets/workspace') return res(404, { errorMessage: 'Assets is not enabled' });
    if (p === '/rest/servicedeskapi/servicedesk') return res(200, { values: [{ id: '2', projectId: '10003', projectKey: 'ITS', projectName: 'IT Support' }, { id: '4', projectId: '10005', projectKey: 'HR', projectName: 'Human Resources' }] });
    if (p === '/rest/servicedeskapi/servicedesk/4/requesttype') {
      if (method === 'POST') {
        const t = { id: String(300 + s.requestTypes.length), name: body.name, issueTypeId: body.issueTypeId, groupIds: [] };
        s.requestTypes.push(t);
        return res(201, t);
      }
      return res(200, { values: s.requestTypes });
    }
    if (p === '/rest/api/3/issue/createmeta/10005/issuetypes') return res(200, { issueTypes: [{ id: '10002', name: 'Task', subtask: false }, { id: '10003', name: 'Sub-task', subtask: true }, { id: '10013', name: 'Questions for HR', subtask: false }] });
    if (p === '/rest/api/3/user/assignable/search') return res(200, USERS);
    if (p === '/rest/api/3/user/bulk') {
      const ids = q.getAll('accountId');
      return res(200, { values: USERS.filter((u) => ids.includes(u.accountId)) });
    }
    if (p === '/rest/servicedeskapi/request' && method === 'POST') {
      const rt = s.requestTypes.find((t) => t.id === String(body.requestTypeId));
      if (!rt) return res(400, { errorMessage: 'no such request type' });
      if (body.requestFieldValues.description && rt.name === 'Injury or illness') return res(400, { errorMessage: "The field 'description' is not valid for this request type." });
      const i = newIssue({ summary: body.requestFieldValues.summary, description: body.requestFieldValues.description, issuetype: { id: rt.issueTypeId } }, who, { requestTypeId: rt.id });
      return res(201, { issueKey: i.key, issueId: i.id });
    }
    if ((m = p.match(/^\/rest\/servicedeskapi\/request\/([A-Z]+-\d+)$/))) {
      const i = s.issues.get(m[1]);
      return i?.requestTypeId ? res(200, { issueKey: i.key, requestTypeId: i.requestTypeId }) : res(404, {});
    }
    if (p === '/rest/api/3/issue' && method === 'POST') {
      if (body.fields.assignee?.accountId === 'bot1') return res(400, { errors: { assignee: 'User cannot be assigned' } });
      const i = newIssue(body.fields, who);
      return res(201, { key: i.key, id: i.id });
    }
    if ((m = p.match(/^\/rest\/api\/3\/issue\/([A-Z]+-\d+)$/))) {
      const i = s.issues.get(m[1]);
      if (!i) return res(404, { errorMessages: ['Issue does not exist'] });
      if (method === 'DELETE') {
        s.issues.delete(m[1]);
        return res(204);
      }
      if (method === 'PUT') {
        Object.assign(i.fields, body.fields || {});
        for (const l of body.update?.labels || []) if (l.add && !i.fields.labels.includes(l.add)) i.fields.labels.push(l.add);
        return res(204);
      }
      return res(200, view(i));
    }
    if ((m = p.match(/^\/rest\/api\/3\/issue\/([A-Z]+-\d+)\/properties\/([\w-]+)$/))) {
      const i = s.issues.get(m[1]);
      if (!i) return res(404, {});
      if (method === 'DELETE') { delete i.props[m[2]]; return res(204); }
      if (method === 'GET') return m[2] in i.props ? res(200, { key: m[2], value: i.props[m[2]] }) : res(404, {});
      i.props[m[2]] = body;
      return res(200, {});
    }
    if ((m = p.match(/^\/rest\/api\/3\/issue\/([A-Z]+-\d+)\/comment$/))) {
      s.issues.get(m[1]).comments.push({ who, body: body.body, internal: Boolean(body.properties?.[0]?.value?.internal) });
      return res(201, { id: 'c1' });
    }
    if ((m = p.match(/^\/rest\/api\/3\/issue\/([A-Z]+-\d+)\/attachments$/))) {
      const i = s.issues.get(m[1]);
      const raw = Buffer.isBuffer(opts.body) ? opts.body : Buffer.from(String(opts.body || ''));
      const filename = (raw.toString('latin1').match(/filename="([^"]+)"/) || [])[1] || 'file';
      const start = raw.indexOf('\r\n\r\n') + 4;
      const end = raw.lastIndexOf('\r\n--');
      const a = { id: String(s.att++), filename, size: end - start, body: raw.subarray(start, end) };
      i.attachments.push(a);
      return res(200, [{ id: a.id, filename }]);
    }
    return res(404, { errorMessages: [`fake site: no route ${method} ${p}`] });
  };
  return s;
}

/** Fake @forge/kvs over a Map, including FAIL_IF_EXISTS and prefix queries with cursors. */
export function fakeKvs(map) {
  const query = () => {
    const q = { prefix: '', n: 100, c: 0 };
    const api = {
      where: (_k, cond) => { q.prefix = cond.prefix; return api; },
      limit: (n) => { q.n = n; return api; },
      cursor: (c) => { q.c = Number(c); return api; },
      getMany: async () => {
        const keys = [...map.keys()].filter((k) => k.startsWith(q.prefix)).sort();
        const page = keys.slice(q.c, q.c + q.n);
        return { results: page.map((key) => ({ key, value: structuredClone(map.get(key)) })), nextCursor: q.c + q.n < keys.length ? String(q.c + q.n) : undefined };
      },
    };
    return api;
  };
  return {
    kvs: {
      get: async (k) => (map.has(k) ? structuredClone(map.get(k)) : undefined),
      set: async (k, v, o) => {
        if (!/^[A-Za-z0-9:._#-]+$/.test(k)) throw new Error(`bad key ${k}`);
        if (o?.keyPolicy === 'FAIL_IF_EXISTS' && map.has(k)) throw new Error('KEY_ALREADY_EXISTS');
        map.set(k, structuredClone(v));
      },
      delete: async (k) => { map.delete(k); },
      query,
    },
    WhereConditions: { beginsWith: (prefix) => ({ prefix }) },
  };
}
