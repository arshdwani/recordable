// The Recordable page (jira:globalPage): open cases and their clocks, reportable-event alerts, the OSHA 300 logs,
// 300A totals and rates per establishment, year-end steps and electronic submission, establishments, rules, settings.
import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  BarChart, Box, Button, DynamicTable, EmptyState, ErrorMessage, Heading, Inline, Label, Link, Lozenge, Modal, ModalBody, ModalFooter,
  ModalHeader, ModalTitle, ModalTransition, ProgressBar, SectionMessage, Select, Spinner, Stack, Strong, Tab, TabList, TabPanel, Tabs,
  Text, Textfield, Toggle, User,
} from '@forge/react';
import { call, Caption, citeText, DecisionPill, fmtDate, hoursText, Kpi, Pill, plural, StatusPill } from './common.jsx';
import { TREATMENTS, EXCEPTIONS, PRIVACY_REASONS, SEVERE, REPORT_CHECKLIST, DIAGNOSES } from '../core/catalog.js';

const val = (e) => (e?.target ? e.target.value : e?.value ?? e);
const num = (n) => (n === null || n === undefined ? '–' : Number(n).toLocaleString('en-US'));
const SAMPLE_PHASE = { setup: 'Choosing the service project and request type', establishments: 'Adding 2 establishments to Assets', cases: 'Raising 12 injury and illness reports from the portal form', done: 'Done' };
const EST_TYPES = [{ value: '1', label: 'Private industry' }, { value: '2', label: 'State government' }, { value: '3', label: 'Local government' }];

// ---- Cases ------------------------------------------------------------------------------------------------------
const CaseTable = ({ rows, empty, logged }) => {
  if (!rows.length) return empty;
  const head = { cells: ['Clock', 'Request', 'Establishment', 'Date', 'Injury or illness', 'Decision', 'Outcome', 'Days away / restricted', logged ? 'Case no.' : 'Status'].map((t) => ({ key: t, content: t, isSortable: true })) };
  return (
    <DynamicTable
      head={head}
      rows={rows.map((r) => ({
        key: r.issueKey,
        cells: [
          { key: r.report && !r.report.done ? -1e9 + r.report.hoursLeft : r.badge?.label || '', content: r.badge ? <Pill appearance={r.badge.type} bold={r.badge.type === 'removed'}>{r.badge.label}</Pill> : null },
          { key: r.issueKey, content: <Inline space="space.050" alignBlock="center"><Link href={`/browse/${r.issueKey}`}>{r.issueKey}</Link>{r.sample ? <Lozenge>sample</Lozenge> : null}</Inline> },
          { key: r.est, content: <Text>{r.est || '–'}</Text> },
          { key: r.incidentDate || '', content: <Text>{fmtDate(r.incidentDate)}</Text> },
          { key: `${r.type} ${r.bodyPart}`, content: <Text>{[r.type, r.bodyPart].filter(Boolean).join(' · ')}</Text> },
          { key: r.decision, content: <DecisionPill code={r.decision} /> },
          { key: r.outcome, content: <Text>{r.outcome ? `${r.outcome} (${r.outcomeCol})` : '–'}</Text> },
          { key: (r.days?.away || 0) * 1000 + (r.days?.restricted || 0), content: <Text>{`${r.days?.away || 0} / ${r.days?.restricted || 0}${r.days?.awayOngoing || r.days?.restrictedOngoing ? ' +' : ''}${r.days?.capped ? ' (cap)' : ''}`}</Text> },
          { key: r.caseNo || r.status, content: logged ? <Text>{r.caseNo || '–'}</Text> : <StatusPill status={r.status} label={r.statusLabel} /> },
        ],
      }))}
    />
  );
};

// ---- 300 log ----------------------------------------------------------------------------------------------------
const LogTab = ({ b, onChange }) => {
  const ests = b.years || [];
  const [estId, setEstId] = useState(ests[0]?.id || null);
  const [year, setYear] = useState(b.year);
  const [v, setV] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const load = async (id = estId, y = year) => {
    if (!id) return;
    setV(null);
    const r = await call('getYearView', { estId: id, year: y });
    if (r?.error) setErr(r.error);
    else { setErr(''); setV(r); }
  };
  useEffect(() => { load(); }, [estId, year]);
  if (!ests.length) return <EmptyState header="No establishments yet" description="Each establishment keeps its own OSHA 300 log (29 CFR 1904.30). Add one, or load the sample." />;
  const prepare = async () => {
    setBusy(true);
    setMsg('');
    const r = await call('prepareSummary', { estId, year });
    setBusy(false);
    if (r?.error) return setErr(r.error);
    setMsg(`Year-end package attached to ${r.key}: ${r.files.join(', ')}.${r.problems.length ? ` ${plural(r.problems.length, 'gap')} in the case file: ${r.problems[0]}` : ''}`);
    load();
    onChange();
  };
  const yearOpts = [b.year, b.year - 1, b.year - 2].map((y) => ({ value: y, label: String(y) }));
  const estOpts = ests.map((e) => ({ value: e.id, label: e.name }));
  return (
    <Stack space="space.200">
      <Box paddingBlockStart="space.200" />
      <Inline space="space.200" alignBlock="end" shouldWrap>
        <Stack space="space.050"><Label labelFor="log-est">Establishment</Label><Box xcss={{ minWidth: '240px' }}><Select inputId="log-est" options={estOpts} defaultValue={estOpts.find((o) => o.value === estId)} onChange={(o) => setEstId(o?.value)} /></Box></Stack>
        <Stack space="space.050"><Label labelFor="log-year">Year</Label><Box xcss={{ minWidth: '120px' }}><Select inputId="log-year" options={yearOpts} defaultValue={yearOpts[0]} onChange={(o) => setYear(o?.value)} /></Box></Stack>
        {b.isAdmin ? <Button appearance="primary" isDisabled={busy || !v} onClick={prepare}>{busy ? 'Preparing…' : 'Prepare 300, 300A and ITA files'}</Button> : null}
      </Inline>
      {msg ? <SectionMessage appearance="success"><Text>{msg}</Text></SectionMessage> : null}
      {err ? <ErrorMessage>{err}</ErrorMessage> : null}
      {!v ? <Spinner label="Reading the log" /> : (
        <Stack space="space.150">
          <Caption>{`OSHA Form 300 equivalent · ${v.est.name} · ${v.year} · names are read from the requests in Jira and never stored by Recordable; privacy cases show "Privacy case" (29 CFR 1904.29(b)(6)).`}</Caption>
          {v.rows.length ? (
            <DynamicTable
              head={{ cells: ['(A) Case', '(B) Employee', '(C) Job title', '(D) Date', '(E) Where', '(F) Injury or illness', 'G-J', '(K) Away', '(L) Restricted', '(M) Type', 'Request'].map((t) => ({ key: t, content: t })) }}
              rows={v.rows.map((r) => ({
                key: r.caseNo,
                cells: [
                  { key: 'a', content: <Strong>{r.caseNo}</Strong> },
                  { key: 'b', content: r.privacy ? <Lozenge appearance="new">Privacy case</Lozenge> : <Text>{r.name}</Text> },
                  { key: 'c', content: <Text>{r.jobTitle}</Text> },
                  { key: 'd', content: <Text>{r.date}</Text> },
                  { key: 'e', content: <Text>{r.where}</Text> },
                  { key: 'f', content: <Text>{r.describe}</Text> },
                  { key: 'g', content: <Text>{r.outcomeCol}</Text> },
                  { key: 'k', content: <Text>{`${r.away}${r.ongoing && r.away ? '+' : ''}`}</Text> },
                  { key: 'l', content: <Text>{`${r.restricted}${r.ongoing && r.restricted ? '+' : ''}`}</Text> },
                  { key: 'm', content: <Text>{r.typeCol}</Text> },
                  { key: 'k2', content: <Link href={`/browse/${r.issueKey}`}>{r.issueKey}</Link> },
                ],
              }))}
            />
          ) : <EmptyState header={`No recordable cases on the ${v.year} log`} description="The 300A summary is still required, with zeros (29 CFR 1904.32(b)(2)(i))." />}
          <Inline space="space.200" shouldWrap>
            <Kpi label="(G) Deaths" value={v.t.G} />
            <Kpi label="(H) Days away cases" value={v.t.H} />
            <Kpi label="(I) Transfer or restriction" value={v.t.I} />
            <Kpi label="(J) Other recordable" value={v.t.J} />
            <Kpi label="(K) Days away" value={v.t.K} />
            <Kpi label="(L) Days restricted" value={v.t.L} />
          </Inline>
          <Text>{`Types: ${v.t.M1} injuries · ${v.t.M2} skin · ${v.t.M3} respiratory · ${v.t.M4} poisoning · ${v.t.M5} hearing loss · ${v.t.M6} other illnesses. Rates: total recordable ${v.rates.trc ?? '–'} · DART ${v.rates.dart ?? '–'} per 100 full-time workers${v.hours ? ` on ${num(v.hours)} hours` : ' (enter hours worked on the Rates tab)'}.`}</Text>
          {v.checks.length ? <SectionMessage appearance="warning" title="Before the 300A is certified"><Stack space="space.050">{v.checks.map((c) => <Text key={c}>{c}</Text>)}</Stack></SectionMessage> : null}
        </Stack>
      )}
    </Stack>
  );
};

// ---- Rates and hours ---------------------------------------------------------------------------------------------
const RatesTab = ({ b, onChange }) => {
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const save = async () => {
    const r = await call('saveYear', { estId: edit.id, year: b.year, hours: edit.hours, avgEmployees: edit.avgEmployees, peakEmployees: edit.peakEmployees });
    if (r?.error) return setErr(r.error);
    setErr('');
    setEdit(null);
    onChange();
  };
  const ests = b.years || [];
  if (!ests.length) return <EmptyState header="No establishments yet" description="Add an establishment, then its hours worked and average employees." />;
  const chart = ests.filter((e) => e.rates.trc !== null).flatMap((e) => [{ est: e.name, rate: e.rates.trc, kind: 'Total recordable' }, { est: e.name, rate: e.rates.dart, kind: 'DART' }]);
  return (
    <Stack space="space.200">
      <Box paddingBlockStart="space.200" />
      <Text>{`Rates per 100 full-time workers for ${b.year} so far. Total recordable case rate = (H + I + J) × 200,000 ÷ hours worked; DART = (H + I) × 200,000 ÷ hours worked (OSHA forms package; deaths are counted separately).`}</Text>
      {chart.length ? <BarChart height={260} data={chart} xAccessor="est" yAccessor="rate" colorAccessor="kind" title={`Incidence rates, ${b.year}`} /> : null}
      <DynamicTable
        head={{ cells: ['Establishment', 'Cases (H / I / J)', 'Hours worked', 'Average employees', 'Most at once', 'Total recordable rate', 'DART rate', ''].map((t) => ({ key: t, content: t })) }}
        rows={ests.map((e) => ({
          key: e.id,
          cells: [
            { key: 'n', content: <Strong>{e.name}</Strong> },
            { key: 'c', content: <Text>{`${e.t.H} / ${e.t.I} / ${e.t.J}${e.t.G ? ` (+${e.t.G} deaths)` : ''}`}</Text> },
            { key: 'h', content: <Text>{num(e.hours)}</Text> },
            { key: 'a', content: <Text>{num(e.avgEmployees)}</Text> },
            { key: 'p', content: <Text>{num(e.peakEmployees)}</Text> },
            { key: 't', content: <Strong>{e.rates.trc ?? '–'}</Strong> },
            { key: 'd', content: <Strong>{e.rates.dart ?? '–'}</Strong> },
            { key: 'x', content: b.isAdmin ? <Button appearance="subtle" onClick={() => setEdit({ id: e.id, name: e.name, hours: e.hours ?? '', avgEmployees: e.avgEmployees ?? '', peakEmployees: e.peakEmployees ?? '' })}>Edit hours</Button> : null },
          ],
        }))}
      />
      {edit ? (
        <Stack space="space.100">
          <Heading size="xsmall">{`${edit.name}, ${b.year}`}</Heading>
          <Inline space="space.200" shouldWrap>
            <Stack space="space.050"><Label labelFor="y-h">Total hours worked by all employees</Label><Textfield id="y-h" type="number" defaultValue={String(edit.hours)} onChange={(e) => setEdit((x) => ({ ...x, hours: val(e) }))} /></Stack>
            <Stack space="space.050"><Label labelFor="y-a">Annual average number of employees</Label><Textfield id="y-a" type="number" defaultValue={String(edit.avgEmployees)} onChange={(e) => setEdit((x) => ({ ...x, avgEmployees: val(e) }))} /></Stack>
            <Stack space="space.050"><Label labelFor="y-p">Most employees at any one time</Label><Textfield id="y-p" type="number" defaultValue={String(edit.peakEmployees)} onChange={(e) => setEdit((x) => ({ ...x, peakEmployees: val(e) }))} /></Stack>
          </Inline>
          <Caption>Hours actually worked: no vacation, sick leave or holidays. Average employees: the total paid each pay period divided by the number of pay periods, rounded up. "Most at once" counts every person (full-time, part-time, seasonal, temporary) and decides electronic submission (29 CFR 1904.41(b)(2)).</Caption>
          {err ? <ErrorMessage>{err}</ErrorMessage> : null}
          <Inline space="space.100"><Button appearance="primary" onClick={save}>Save</Button><Button appearance="subtle" onClick={() => setEdit(null)}>Cancel</Button></Inline>
        </Stack>
      ) : null}
    </Stack>
  );
};

// ---- Year-end ---------------------------------------------------------------------------------------------------
const YearEndTab = ({ b, onChange }) => {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const mark = async (e, step) => {
    setBusy(`${e.id}-${step}`);
    const r = await call('markYear', { estId: e.id, year: b.year, step });
    setBusy('');
    if (r?.error) setErr(r.error);
    else onChange();
  };
  return (
    <Stack space="space.200">
      <Box paddingBlockStart="space.200" />
      <Stack space="space.050">
        {b.deadlines.map((d) => <Text key={d.what}>{`• ${d.what}: ${d.when} (${citeText(d.cite)})`}</Text>)}
      </Stack>
      {err ? <ErrorMessage>{err}</ErrorMessage> : null}
      {(b.years || []).map((e) => (
        <Box key={e.id} xcss={{ padding: 'space.200', borderRadius: 'border.radius.200', borderWidth: 'border.width', borderStyle: 'solid', borderColor: 'color.border' }}>
          <Stack space="space.100">
            <Inline space="space.100" alignBlock="center" shouldWrap>
              <Heading size="small">{`${e.name} · ${b.year}`}</Heading>
              {e.ita.exempt ? <Lozenge>partially exempt</Lozenge> : e.ita.submitCases ? <Lozenge appearance="moved">ITA: 300A + 300/301 cases</Lozenge> : e.ita.submit300A ? <Lozenge appearance="inprogress">ITA: 300A</Lozenge> : e.ita.unknown ? <Lozenge appearance="new">ITA: needs NAICS or headcount</Lozenge> : <Lozenge>no ITA submission</Lozenge>}
              {e.size ? <Caption>{`ITA size code ${e.size}`}</Caption> : null}
            </Inline>
            {e.ita.reasons.map((r) => <Text key={r.text}>{`${r.text} (${citeText(r.cite)})`}</Text>)}
            <Inline space="space.200" shouldWrap alignBlock="center">
              <Pill appearance={e.summaryKey ? 'success' : 'default'}>{e.summaryKey ? '1. Package prepared' : '1. Prepare package'}</Pill>
              {e.summaryKey ? <Link href={`/browse/${e.summaryKey}`}>{e.summaryKey}</Link> : null}
              <Pill appearance={e.certified ? 'success' : 'default'}>{e.certified ? `2. Certified ${fmtDate(e.certified.date)}` : '2. Certify'}</Pill>
              <Pill appearance={e.posted ? 'success' : 'default'}>{e.posted ? `3. Posted ${fmtDate(e.posted.date)}` : '3. Post Feb 1 - Apr 30'}</Pill>
              {e.ita.submit300A ? <Pill appearance={e.submitted ? 'success' : 'default'}>{e.submitted ? `4. Submitted ${fmtDate(e.submitted.date)}` : `4. Submit by ${fmtDate(e.ita.due)}`}</Pill> : null}
            </Inline>
            {b.isAdmin ? (
              <Inline space="space.100" shouldWrap>
                {!e.certified ? <Button appearance="subtle" isDisabled={Boolean(busy) || !e.summaryKey} onClick={() => mark(e, 'certified')}>Mark certified</Button> : null}
                {!e.posted ? <Button appearance="subtle" isDisabled={Boolean(busy) || !e.certified} onClick={() => mark(e, 'posted')}>Mark posted</Button> : null}
                {e.ita.submit300A && !e.submitted ? <Button appearance="subtle" isDisabled={Boolean(busy) || !e.summaryKey} onClick={() => mark(e, 'submitted')}>Mark submitted to the ITA</Button> : null}
              </Inline>
            ) : null}
            {e.checks.length ? <Caption>{`Check: ${e.checks.join(' ')}`}</Caption> : null}
          </Stack>
        </Box>
      ))}
      {!(b.years || []).length ? <EmptyState header="No establishments yet" description="Year-end steps appear per establishment." /> : null}
    </Stack>
  );
};

// ---- Establishments ---------------------------------------------------------------------------------------------
const EMPTY = { name: '', street: '', city: '', state: '', zip: '', naics: '', industry: '', estType: '1', company: '', ein: '', tz: 'America/New_York', leadAccountId: '' };
const Establishments = ({ isAdmin, where, onChange }) => {
  const [list, setList] = useState(null);
  const [users, setUsers] = useState([]);
  const [edit, setEdit] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);
  const remove = async (e) => {
    setRemoving(null);
    setBusy(true);
    const r = await call('removeEstablishment', { id: e.id });
    setBusy(false);
    if (r?.error) return setErr(r.error);
    await load();
    onChange();
  };
  const load = async () => {
    const r = await call('listEstablishments');
    if (r?.error) setErr(r.error);
    else setList(r);
  };
  useEffect(() => { load(); }, []);
  const open = async (e) => {
    setErr('');
    if (!users.length) { const u = await call('listUsers'); if (!u?.error) setUsers(u); }
    setEdit(e ? { ...EMPTY, ...e } : { ...EMPTY });
  };
  const save = async () => {
    setBusy(true);
    setErr('');
    const r = await call('saveEstablishment', edit);
    setBusy(false);
    if (r?.error) return setErr(r.error);
    setEdit(null);
    await load();
    onChange();
  };
  const set = (k) => (e) => setEdit((x) => ({ ...x, [k]: val(e) }));
  if (!list) return err ? <ErrorMessage>{err}</ErrorMessage> : <Spinner label="Reading establishments" />;
  const userOpts = users.map((u) => ({ value: u.accountId, label: u.displayName }));
  const field = (k, label, ph, w = '180px') => <Stack space="space.050"><Label labelFor={`e-${k}`}>{label}</Label><Box xcss={{ minWidth: w }}><Textfield id={`e-${k}`} defaultValue={edit[k] || ''} onChange={set(k)} placeholder={ph} /></Box></Stack>;
  return (
    <Stack space="space.200">
      <Box paddingBlockStart="space.200" />
      <Text>{`${where ? `Establishments live in ${where}.` : 'No establishments yet.'} Each one that is expected to operate for a year or more keeps its own 300 log (29 CFR 1904.30); its NAICS code and headcount decide electronic submission (29 CFR 1904.41).`}</Text>
      {list.length ? (
        <DynamicTable
          head={{ cells: ['Establishment', 'Assets', 'Address', 'NAICS', 'Company', 'Safety lead', ''].map((t) => ({ key: t, content: t })) }}
          rows={list.map((e) => ({
            key: e.id,
            cells: [
              { key: 'n', content: <Inline space="space.050"><Strong>{e.name}</Strong>{e.sample ? <Lozenge>sample</Lozenge> : null}</Inline> },
              { key: 'o', content: e.url ? <Link href={e.url}>{e.objectKey}</Link> : <Text>{e.objectKey || 'Register'}</Text> },
              { key: 'a', content: <Text>{[e.street, e.city, e.state, e.zip].filter(Boolean).join(', ')}</Text> },
              { key: 'i', content: <Text>{e.naics ? `${e.naics}${e.industry ? ` · ${e.industry}` : ''}` : '–'}</Text> },
              { key: 'c', content: <Text>{e.company || '–'}</Text> },
              { key: 'l', content: e.leadAccountId ? <User accountId={e.leadAccountId} /> : <Text>–</Text> },
              { key: 'x', content: isAdmin ? <Inline space="space.050"><Button appearance="subtle" onClick={() => open(e)}>Edit</Button><Button appearance="subtle" onClick={() => setRemoving(e)}>Remove</Button></Inline> : null },
            ],
          }))}
        />
      ) : <EmptyState header="No establishments yet" description={isAdmin ? 'Add your sites, or load the sample (two Ohio plants).' : 'A Jira administrator can add establishments.'} />}
      {removing ? (
        <SectionMessage appearance="warning" title={`Remove ${removing.name}?`}>
          <Stack space="space.100">
            <Text>{`This removes it from ${where || 'Recordable'} and deletes its hours and year-end records in Recordable. Establishments with cases can't be removed.`}</Text>
            <Inline space="space.100"><Button appearance="danger" isDisabled={busy} onClick={() => remove(removing)}>Remove</Button><Button appearance="subtle" onClick={() => setRemoving(null)}>Cancel</Button></Inline>
          </Stack>
        </SectionMessage>
      ) : null}
      {err && !edit ? <ErrorMessage>{err}</ErrorMessage> : null}
      {isAdmin && !edit ? <Inline><Button onClick={() => open(null)}>Add an establishment</Button></Inline> : null}
      {edit ? (
        <Stack space="space.150">
          <Heading size="xsmall">{edit.id ? `Edit ${edit.name}` : 'New establishment'}</Heading>
          <Inline space="space.200" shouldWrap>
            {field('name', 'Name', 'Plant 2, Columbus', '240px')}
            {field('street', 'Street', '1800 Alum Creek Dr', '240px')}
            {field('city', 'City', 'Columbus')}
            {field('state', 'State', 'OH', '80px')}
            {field('zip', 'ZIP', '43207', '110px')}
          </Inline>
          <Inline space="space.200" shouldWrap>
            {field('naics', 'NAICS (6 digits)', '493110', '130px')}
            {field('industry', 'Industry description', 'General warehousing', '260px')}
            <Stack space="space.050"><Label labelFor="e-type">Type</Label><Box xcss={{ minWidth: '180px' }}><Select inputId="e-type" options={EST_TYPES} defaultValue={EST_TYPES.find((o) => o.value === edit.estType)} onChange={set('estType')} /></Box></Stack>
          </Inline>
          <Inline space="space.200" shouldWrap>
            {field('company', 'Legal company name', 'Ridgeway Fabrication Co.', '240px')}
            {field('ein', 'EIN', '12-3456789', '130px')}
            {field('tz', 'Time zone', 'America/New_York', '200px')}
            <Stack space="space.050"><Label labelFor="e-lead">Safety lead</Label><Box xcss={{ minWidth: '220px' }}><Select inputId="e-lead" options={userOpts} defaultValue={userOpts.find((o) => o.value === edit.leadAccountId)} onChange={set('leadAccountId')} placeholder="Gets the year-end task" /></Box></Stack>
          </Inline>
          {err ? <ErrorMessage>{err}</ErrorMessage> : null}
          <Inline space="space.100"><Button appearance="primary" isDisabled={busy} onClick={save}>Save</Button><Button appearance="subtle" onClick={() => setEdit(null)}>Cancel</Button></Inline>
        </Stack>
      ) : null}
    </Stack>
  );
};

// ---- Rules --------------------------------------------------------------------------------------------------------
const RulesTab = () => (
  <Stack space="space.200">
    <Box paddingBlockStart="space.200" />
    <Text>The rules Recordable applies, from 29 CFR Part 1904 (eCFR, read November 2026) and OSHA's recordkeeping FAQs. Every decision on a request shows which of these it used. Recordable gives operational guidance, not legal advice.</Text>
    <Heading size="small">Is it recordable? (29 CFR 1904.4)</Heading>
    <Text>1. Work-related: an event or exposure in the work environment caused or contributed to it, or significantly aggravated a pre-existing condition; presumed for the work environment (1904.5(a)). 2. A new case (1904.6). 3. It meets a general criterion (1904.7) or a specific one (1904.8-1904.11): death; days away; restricted work or job transfer; medical treatment beyond first aid; loss of consciousness; a significant diagnosed injury or illness (cancer, chronic irreversible disease, fractured or cracked bone or tooth, punctured eardrum).</Text>
    <Heading size="small">First aid is only these 14 items (1904.7(b)(5)(ii)); everything else is medical treatment</Heading>
    <Stack space="space.025">{TREATMENTS.filter((t) => t.kind === 'first-aid' && t.code !== 'butterfly').map((t) => <Text key={t.code}>{`(${t.letter}) ${t.label}${t.code === 'bandage' ? '; butterfly bandages or Steri-Strips (sutures, staples and surgical glue are medical treatment)' : ''}`}</Text>)}</Stack>
    <Caption>Non-prescription medicine is first aid unless a physician or other licensed health care professional recommends a single dose greater than the one on the OTC label (OSHA FAQ 7-8). A prescription counts once issued, filled or not (FAQ 7-10a).</Caption>
    <Heading size="small">Not work-related: the exceptions (1904.5(b)(2))</Heading>
    <Stack space="space.025">{EXCEPTIONS.map((e) => <Text key={e.code}>{`${e.label} (${e.cite})`}</Text>)}</Stack>
    <Heading size="small">Counting days (1904.7(b)(3)-(4))</Heading>
    <Text>Count calendar days, starting the day after the injury, including weekends and days off the employee could not have worked. Days recommended by a physician count even if the employee works. Restriction only on the day of injury doesn't count. Stop at 180 days away and restricted combined.</Text>
    <Heading size="small">Privacy cases (1904.29(b)(7))</Heading>
    <Stack space="space.025">{Object.values(PRIVACY_REASONS).map((p) => <Text key={p.cite}>{`${p.label} (${p.cite})`}</Text>)}</Stack>
    <Heading size="small">Report to OSHA (1904.39)</Heading>
    <Stack space="space.025">{Object.values(SEVERE).map((s) => <Text key={s.label}>{`${s.label}: within ${s.hours} hours of learning of it, if it happened within ${s.windowHours === 24 ? '24 hours' : '30 days'} of the incident (${s.cite})`}</Text>)}</Stack>
    <Caption>{`Not reportable (still recorded): a motor vehicle accident on a public street or highway outside a construction work zone, an accident on commercial or public transport, admission only for observation or tests (1904.39(b)(3), (b)(4), (b)(10)). Have ready: ${REPORT_CHECKLIST.map((c) => c.label.toLowerCase()).join('; ')}.`}</Caption>
    <Heading size="small">Clocks</Heading>
    <Text>Enter a recordable case on the 300 log and complete the 301 within 7 calendar days (1904.29(b)(3)). Certify the 300A and post it from February 1 to April 30 (1904.32). Submit electronically by March 2 where 1904.41 applies. Keep records 5 years (1904.33).</Text>
    <Caption>{`Significant diagnoses: ${DIAGNOSES.map((d) => d.label.toLowerCase()).join(', ')} (1904.7(b)(7)).`}</Caption>
  </Stack>
);

// ---- Settings -----------------------------------------------------------------------------------------------------
const SettingsTab = ({ b, onChange }) => {
  const [org, setOrg] = useState(b.settings?.orgName || '');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  if (!b.isAdmin) return <Text>Only Jira administrators can change settings.</Text>;
  const save = async () => {
    const r = await call('saveSettings', { orgName: org });
    if (r?.error) setErr(r.error);
    else { setErr(''); setMsg('Saved.'); onChange(); }
  };
  const assets = async () => {
    const r = await call('connectAssets');
    if (r?.error) setErr(r.error);
    else { setMsg(r.ok ? `Connected to the "${r.assets.schemaName}" schema in Assets.` : r.reason); onChange(); }
  };
  return (
    <Stack space="space.200">
      <Box paddingBlockStart="space.200" />
      <Text>{`Service project and request type: ${b.setup.project || 'not set up yet'}.`}</Text>
      <Text>{`Establishments: ${b.setup.where || 'not set up yet'}.`}</Text>
      {b.settings?.registerOnly ? <Inline><Button onClick={assets}>Connect Assets</Button></Inline> : null}
      <Stack space="space.050">
        <Label labelFor="s-org">Company name on the 300A and 301 (if establishments don't name one)</Label>
        <Box xcss={{ maxWidth: '420px' }}><Textfield id="s-org" defaultValue={org} onChange={(e) => setOrg(val(e))} /></Box>
      </Stack>
      <Inline><Button appearance="primary" onClick={save}>Save</Button></Inline>
      {msg ? <SectionMessage appearance="success"><Text>{msg}</Text></SectionMessage> : null}
      {err ? <ErrorMessage>{err}</ErrorMessage> : null}
      <Caption>Privacy: Recordable stores issue keys, account IDs, dates, codes and counts in Forge storage. Names, job titles, descriptions and medical details stay on the Jira requests and are read only to show a panel or build a form. No data leaves Atlassian.</Caption>
    </Stack>
  );
};

// ---- The sample tour ------------------------------------------------------------------------------------------
const Tour = ({ t }) => (
  <SectionMessage appearance="discovery" title="Try the sample">
    <Stack space="space.075">
      <Text>{`1. Report to OSHA: ${t.reportable} is a fingertip amputation from 90 minutes before you loaded the sample. Open it: Recordable shows the 24-hour clock and what OSHA will ask for. Record the report there${t.reported ? ' (done)' : ''}.`}</Text>
      <Text>{`2. Answer a question: ${t.dose} has a clinic-recommended ibuprofen dose nobody wrote down. Recordable asks for it instead of guessing: 800 mg makes it recordable, 200 mg doesn't${t.doseOpen ? '' : ' (answered)'}. ${t.prior} asks whether an earlier back injury had healed (29 CFR 1904.6).`}</Text>
      <Text>{`3. Compare ${t.sutures} (sutures: recordable) with ${t.butterfly} (butterfly strips: first aid), ${t.needlestick} (needlestick: a privacy case), ${t.hearing} (hearing shift: column M5) and ${t.commute} (car crash in the company lot while commuting: not work-related).`}</Text>
      <Text>{`4. Open the 300 log tab, pick ${t.plant2 || 'Plant 2'} and press "Prepare 300, 300A and ITA files"${t.summaryKey ? ` (done: ${t.summaryKey})` : ''}. ${t.cap} shows the 180-day cap.`}</Text>
      <Text>{`5. Ask Rovo: open Rovo, pick the Recordable agent, and ask "What's our DART rate at Plant 2?" or "Is this recordable? He got 3 stitches and went back to work."`}</Text>
    </Stack>
  </SectionMessage>
);

const Board = () => {
  const [b, setB] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [job, setJob] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [tick, setTick] = useState(0);
  const load = async () => {
    const r = await call('getBoard');
    if (r?.error) setError(r.error);
    else { setError(''); setB(r); setTick((x) => x + 1); }
  };
  useEffect(() => { load(); }, []);

  const setUp = async () => {
    setBusy('setup');
    setError('');
    const r = await call('setUp');
    setBusy('');
    if (r?.error) return setError(r.error);
    await load();
    setNotice(`Set up: ${r.project}, request type "${r.requestType}", establishments in ${r.establishments}.${r.note ? ` ${r.note}` : ''}`);
  };
  const loadSample = async () => {
    setBusy('sample');
    setNotice('');
    setError('');
    setJob({ step: 0, steps: 4, label: 'Starting' });
    let r;
    let misses = 0;
    for (let i = 0; i < 40; i++) {
      r = await call('loadSample');
      if (r?.error) { if (++misses > 2) break; continue; }
      misses = 0;
      setJob({ step: r.step, steps: r.steps, label: `${SAMPLE_PHASE[r.phase] || r.phase}${r.phase === 'cases' ? ` (${r.cases} of ${r.total})` : ''}` });
      if (r.done) break;
    }
    await load();
    setJob(null);
    setBusy('');
    if (r?.error) setError(`${r.error} Press Load sample again to continue where it stopped.`);
    else if (r?.done) setNotice('Sample loaded: 2 establishments and 12 injury and illness reports. Follow "Try the sample" above.');
  };
  const removeSample = async () => {
    setConfirmRemove(false);
    setBusy('remove');
    setNotice('');
    setError('');
    setJob({ label: 'Deleting the sample requests', step: 0, steps: 0 });
    let r;
    let n = 0;
    let misses = 0;
    for (let i = 0; i < 40; i++) {
      r = await call('removeSample');
      if (r?.error) { if (++misses > 2) break; continue; }
      misses = 0;
      n += r.removedRequests;
      setJob({ label: `Removed ${plural(n, 'request')} so far`, step: 0, steps: 0 });
      if (!r.remaining) break;
    }
    await load();
    setJob(null);
    setBusy('');
    if (r?.error) setError(`${r.error} Press Remove sample again to continue.`);
    else setNotice(`Removed the sample: ${plural(n, 'request')}, the 2 sample establishments and their year data.`);
  };

  if (!b) return error ? <ErrorMessage>{error}</ErrorMessage> : <Spinner label="Loading cases" />;
  const p = b.progress || {};
  const allDone = Object.values(p).every(Boolean);
  return (
    <Stack space="space.300">
      <Text>Decide whether each work injury or illness is OSHA-recordable under 29 CFR Part 1904, with the rule behind every step; run the 8- and 24-hour OSHA reporting clocks and the 7-day recording clock; and keep each establishment's 300 log, 300A summary and electronic submission files. Names and medical details stay in Jira.</Text>
      {b.tour ? <Tour t={b.tour} /> : null}
      {!b.tour && (!allDone || !b.setup.done) ? (
        <SectionMessage appearance="discovery" title="Getting started">
          <Stack space="space.075">
            {[
              [b.setup.done, `Set up: Recordable picks a safety, HR or facilities service project and adds an "Injury or illness" request type with a structured portal form.${b.setup.project ? ` Now: ${b.setup.project}.` : ''}`],
              [p.establishments, 'Add your establishments (in JSM Assets): each keeps its own 300 log.'],
              [p.year, 'Enter each establishment\'s hours worked and employees (Rates tab) for the 300A and the rates.'],
              [p.cases, 'Employees report on the portal; Recordable decides and cites the rule. Any request can also be treated as an injury from its ••• menu.'],
              [p.logged, 'Enter recordable cases on the 300 log within 7 days; the Form 301 is attached.'],
              [p.yearEnd, 'At year end, prepare the 300, 300A and ITA files, certify, post and submit.'],
            ].map(([done, text], i) => (
              <Inline key={text} space="space.100" alignBlock="center">
                <Pill appearance={done ? 'success' : 'default'}>{done ? 'done' : `step ${i + 1}`}</Pill>
                <Text>{text}</Text>
              </Inline>
            ))}
            {b.isAdmin ? (
              <Inline space="space.150" alignBlock="center" shouldWrap>
                {!b.setup.done ? <Button appearance="primary" isDisabled={Boolean(busy)} onClick={setUp}>{busy === 'setup' ? 'Setting up…' : 'Set up Recordable'}</Button> : null}
                {!b.hasSample ? <Button appearance={b.setup.done ? 'primary' : 'default'} isDisabled={Boolean(busy)} onClick={loadSample}>{busy === 'sample' ? 'Loading…' : 'Load sample'}</Button> : null}
                {!b.hasSample ? <Text>Two Ohio plants and twelve reports that cover the edge cases (about a minute; Remove sample undoes it).</Text> : null}
              </Inline>
            ) : <Text>Ask a Jira administrator to set Recordable up.</Text>}
          </Stack>
        </SectionMessage>
      ) : null}
      {b.setup.hidden && b.isAdmin ? (
        <SectionMessage appearance="information" title="Optional: show the injury form on your help center">
          <Stack space="space.050">
            <Text>{`Everything works without this: the sample, requests your agents raise in Jira ("Injury or illness" or any request with Treat as injury or illness), the board and Rovo. To let employees report on the portal too, add "Injury or illness" to a portal group in ${b.setup.project?.split(' · ')[0] || 'the service project'}'s settings (Request types, then ••• > Portal group > Edit). Jira's API can't do this step.`}</Text>
            {b.setup.settingsUrl ? <Link href={b.setup.settingsUrl} openNewTab>Open the request types</Link> : null}
          </Stack>
        </SectionMessage>
      ) : null}
      {b.setup.note && b.isAdmin ? <SectionMessage appearance="warning"><Text>{b.setup.note}</Text></SectionMessage> : null}
      {job ? (
        <SectionMessage appearance="information" title={busy === 'remove' ? 'Removing the sample' : 'Loading the sample'}>
          <Stack space="space.100">
            <Text>{job.steps ? `Step ${Math.max(1, job.step)} of ${job.steps}: ${job.label}…` : `${job.label}…`}</Text>
            {job.steps ? <ProgressBar value={Math.min(1, Math.max(0.05, (job.step - 1) / job.steps))} /> : <ProgressBar isIndeterminate />}
          </Stack>
        </SectionMessage>
      ) : null}
      {notice ? <SectionMessage appearance="success"><Text>{notice}</Text></SectionMessage> : null}
      {error ? <ErrorMessage>{error}</ErrorMessage> : null}
      <ModalTransition>
        {confirmRemove ? (
          <Modal onClose={() => setConfirmRemove(false)}>
            <ModalHeader><ModalTitle>Remove the sample?</ModalTitle></ModalHeader>
            <ModalBody><Text>This permanently deletes the 12 sample requests (with their attachments), any year-end tasks for the sample establishments, the 2 sample establishments in Assets and their hours. Your own requests and establishments are not touched.</Text></ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setConfirmRemove(false)}>Cancel</Button>
              <Button appearance="danger" onClick={removeSample}>Yes, remove the sample</Button>
            </ModalFooter>
          </Modal>
        ) : null}
      </ModalTransition>

      <Inline space="space.200" shouldWrap>
        <Kpi label="Report to OSHA now" value={b.counts.alerts} tone={b.counts.alerts ? 'danger' : undefined} />
        <Kpi label="Recordable, not on the log" value={b.counts.toLog} tone={b.counts.toLog ? 'warning' : undefined} />
        <Kpi label="Waiting for answers" value={b.counts.questions} tone={b.counts.questions ? 'info' : undefined} />
        <Kpi label={`On the ${b.year} logs`} value={(b.years || []).reduce((a, e) => a + e.cases, 0)} />
        {(b.years || []).filter((e) => e.rates.dart !== null).slice(0, 2).map((e) => <Kpi key={e.id} label={`DART · ${e.name}`} value={e.rates.dart} />)}
      </Inline>
      {b.isAdmin ? (
        <Inline space="space.100" shouldWrap>
          {b.hasSample ? <Button appearance="subtle" isDisabled={Boolean(busy)} onClick={() => setConfirmRemove(true)}>{busy === 'remove' ? 'Removing…' : 'Remove sample'}</Button> : null}
          {b.hasSample && b.sampleJob && !busy ? <Button isDisabled={Boolean(busy)} onClick={loadSample}>Finish loading the sample</Button> : null}
          {!b.hasSample && allDone ? <Button appearance="subtle" isDisabled={Boolean(busy)} onClick={loadSample}>Load sample</Button> : null}
        </Inline>
      ) : null}
      {b.alerts.length ? (
        <SectionMessage appearance="error" title={`${plural(b.alerts.length, 'event')} to report to OSHA`}>
          <Stack space="space.050">
            {b.alerts.map((a) => <Inline key={a.issueKey} space="space.100"><Link href={`/browse/${a.issueKey}`}>{a.issueKey}</Link><Text>{`${a.report.kinds.join(', ')} · ${a.est} · due ${a.report.dueText} local time (${hoursText(a.report.hoursLeft)})${a.report.tentative ? ' · if work-related' : ''}`}</Text></Inline>)}
            <Caption>Report by phone to the OSHA Area Office, on 1-800-321-OSHA (6742), or online at osha.gov/report (29 CFR 1904.39). Then record it in the request's Recordable panel.</Caption>
          </Stack>
        </SectionMessage>
      ) : null}
      <Tabs id="rc-tabs">
        <TabList>
          <Tab>{`Cases (${b.open.length} open)`}</Tab>
          <Tab>OSHA 300 logs</Tab>
          <Tab>Rates and hours</Tab>
          <Tab>Year-end</Tab>
          <Tab>Establishments</Tab>
          <Tab>Rules</Tab>
          <Tab>Settings</Tab>
        </TabList>
        <TabPanel>
          <Stack space="space.200">
            <Box paddingBlockStart="space.200" />
            <CaseTable rows={b.open} empty={<EmptyState header="No open cases" description={b.isAdmin ? 'New "Injury or illness" requests appear here, or load the sample.' : 'New "Injury or illness" requests appear here.'} />} />
            <Heading size="xsmall">{`On the logs (${b.logged.length})`}</Heading>
            <CaseTable logged rows={b.logged} empty={<Text>Nothing on the logs yet.</Text>} />
            <Inline space="space.100" alignBlock="center"><Toggle id="closed" isChecked={showClosed} onChange={() => setShowClosed(!showClosed)} /><Text>{`Show closed: not recordable (${b.closed.length})`}</Text></Inline>
            {showClosed ? <CaseTable rows={b.closed} empty={<Text>None.</Text>} /> : null}
          </Stack>
        </TabPanel>
        <TabPanel><LogTab b={b} onChange={load} /></TabPanel>
        <TabPanel><RatesTab b={b} onChange={load} /></TabPanel>
        <TabPanel><YearEndTab b={b} onChange={load} /></TabPanel>
        <TabPanel><Establishments isAdmin={b.isAdmin} where={b.setup.where} key={`est-${tick}`} onChange={load} /></TabPanel>
        <TabPanel><RulesTab /></TabPanel>
        <TabPanel><SettingsTab b={b} onChange={load} /></TabPanel>
      </Tabs>
    </Stack>
  );
};

ForgeReconciler.render(<React.StrictMode><Board /></React.StrictMode>);
