// The Recordable panel on an injury or illness request (jira:issueContext and jira:issuePanel): the decision with
// the rule for every step, the questions that block it, the OSHA report clock, the facts, and the log entry.
import React, { useEffect, useState } from 'react';
import ForgeReconciler, {
  Box, Button, ButtonGroup, Checkbox, DatePicker, ErrorMessage, Heading, Inline, Label, Link, Lozenge, RadioGroup, SectionMessage,
  Select, Spinner, Stack, Text, Textfield, TimePicker, Toggle,
} from '@forge/react';
import { call, Caption, Cite, DecisionPill, fmtDate, hoursText, Pill, plural, StatusPill } from './common.jsx';

const RESULT = { yes: ['meets', 'removed'], no: ['does not', 'success'], 'first-aid': ['first aid', 'success'], none: ['not treatment', 'default'], 'n/a': ['n/a', 'default'], note: ['note', 'inprogress'], privacy: ['privacy', 'new'] };
const val = (e) => (e?.target ? e.target.value : e?.value ?? e);
const opt = (opts, v) => opts.find((o) => o.value === v);

const Step = ({ s }) => (
  <Inline space="space.100" alignBlock="start">
    <Box xcss={{ minWidth: '86px' }}><Pill appearance={(RESULT[s.result] || [])[1] || 'default'}>{(RESULT[s.result] || [s.result])[0]}</Pill></Box>
    <Stack space="space.0">
      <Text>{s.text}</Text>
      <Cite cite={s.cite} />
      {s.source ? <Caption>{s.source}</Caption> : null}
    </Stack>
  </Inline>
);

const Question = ({ q, p, busy, answer }) => {
  const [a, setA] = useState(q.input === 'treatments' ? [] : q.input === 'days' ? { away: 0, restricted: 0 } : null);
  const [exc, setExc] = useState(null);
  return (
    <Box xcss={{ padding: 'space.150', borderRadius: 'border.radius.200', backgroundColor: 'color.background.discovery' }}>
      <Stack space="space.100">
        <Text>{q.text}</Text>
        <Cite cite={q.cite} />
        {q.options ? <RadioGroup name={`q-${q.id}`} options={q.options} onChange={(e) => setA(val(e))} /> : null}
        {q.input === 'number' ? <Textfield id={`q-${q.id}`} type="number" onChange={(e) => setA(val(e))} /> : null}
        {q.input === 'date' ? <DatePicker id={`q-${q.id}`} onChange={setA} /> : null}
        {q.input === 'days' ? (
          <Inline space="space.200">
            <Stack space="space.050"><Label labelFor="q-away">Days away</Label><Textfield id="q-away" type="number" defaultValue="0" onChange={(e) => setA((x) => ({ ...x, away: Number(val(e)) || 0 }))} /></Stack>
            <Stack space="space.050"><Label labelFor="q-restr">Days restricted or transferred</Label><Textfield id="q-restr" type="number" defaultValue="0" onChange={(e) => setA((x) => ({ ...x, restricted: Number(val(e)) || 0 }))} /></Stack>
          </Inline>
        ) : null}
        {q.input === 'treatments' ? (
          <Stack space="space.0">
            {p.options.treatments.map((t) => <Checkbox key={t.value} value={t.value} label={t.label} isChecked={a.includes(t.value)} onChange={() => setA((x) => (x.includes(t.value) ? x.filter((c) => c !== t.value) : [...x, t.value]))} />)}
            <Caption>Tick nothing and answer to record "no treatment".</Caption>
          </Stack>
        ) : null}
        {a === 'exception' ? <Select inputId={`q-${q.id}-ex`} options={p.options.exceptions} onChange={(o) => setExc(o?.value)} placeholder="Which exception?" /> : null}
        <Inline>
          <Button appearance="primary" isDisabled={busy || a === null || (a === 'exception' && !exc)} onClick={() => (a === 'exception' ? answer(null, { exception: exc }) : answer({ question: q.id, answer: a }))}>Answer</Button>
        </Inline>
      </Stack>
    </Box>
  );
};

const Facts = ({ p, busy, save, cancel }) => {
  const f = p.facts;
  const [x, setX] = useState({});
  const set = (k) => (e) => setX((o) => ({ ...o, [k]: val(e) }));
  const flag = (k, on) => setX((o) => ({ ...o, [k]: on }));
  const cur = (k) => (k in x ? x[k] : k.split('.').reduce((o, part) => o?.[part], f));
  const treat = cur('treatments') || [];
  const dx = cur('diagnoses') || [];
  return (
    <Stack space="space.150">
      <Heading size="xsmall">Edit the facts</Heading>
      <Inline space="space.200" shouldWrap>
        <Stack space="space.050"><Label labelFor="f-est">Establishment</Label><Box xcss={{ minWidth: '220px' }}><Select inputId="f-est" options={p.establishments} defaultValue={opt(p.establishments, f.est)} onChange={set('est')} /></Box></Stack>
        <Stack space="space.050"><Label labelFor="f-date">Date of injury or illness</Label><DatePicker id="f-date" defaultValue={f.incidentDate} onChange={set('incidentDate')} /></Stack>
        <Stack space="space.050"><Label labelFor="f-time">Time</Label><TimePicker id="f-time" defaultValue={f.incidentTime} onChange={set('incidentTime')} /></Stack>
        <Stack space="space.050"><Label labelFor="f-learned">Learned of it</Label><DatePicker id="f-learned" defaultValue={f.learnedDate} onChange={set('learnedDate')} /></Stack>
      </Inline>
      <Inline space="space.200" shouldWrap>
        <Stack space="space.050"><Label labelFor="f-type">Type</Label><Box xcss={{ minWidth: '200px' }}><Select inputId="f-type" options={p.options.types} defaultValue={opt(p.options.types, f.type || 'injury')} onChange={set('type')} /></Box></Stack>
        <Stack space="space.050"><Label labelFor="f-part">Body part</Label><Box xcss={{ minWidth: '200px' }}><Select inputId="f-part" options={p.options.bodyParts} defaultValue={opt(p.options.bodyParts, f.bodyPart)} onChange={set('bodyPart')} /></Box></Stack>
        <Stack space="space.050"><Label labelFor="f-wr">Work-related</Label><Box xcss={{ minWidth: '160px' }}><Select inputId="f-wr" options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'unknown', label: 'Not known' }]} defaultValue={opt([{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'unknown', label: 'Not known' }], f.workRelated || 'unknown')} onChange={set('workRelated')} /></Box></Stack>
      </Inline>
      <Stack space="space.050"><Label labelFor="f-ex">Exception to work-relatedness (29 CFR 1904.5(b)(2))</Label><Select inputId="f-ex" options={[{ value: '', label: 'None' }, ...p.options.exceptions]} defaultValue={opt(p.options.exceptions, f.exception) || { value: '', label: 'None' }} onChange={set('exception')} /></Stack>
      <Stack space="space.050">
        <Label labelFor="f-treat">Treatment (first aid is the closed list in 29 CFR 1904.7(b)(5)(ii))</Label>
        {p.options.treatments.map((t) => <Checkbox key={t.value} value={t.value} label={t.label} isChecked={treat.includes(t.value)} onChange={() => flag('treatments', treat.includes(t.value) ? treat.filter((c) => c !== t.value) : [...treat, t.value])} />)}
      </Stack>
      <Inline space="space.200" shouldWrap>
        <Stack space="space.050"><Label labelFor="f-drug">Non-prescription medicine</Label><Box xcss={{ minWidth: '220px' }}><Select inputId="f-drug" options={[{ value: '', label: 'None' }, ...p.options.meds]} defaultValue={opt(p.options.meds, f.med?.drug) || { value: '', label: 'None' }} onChange={set('med.drug')} /></Box></Stack>
        <Stack space="space.050"><Label labelFor="f-dose">Single dose (mg)</Label><Textfield id="f-dose" type="number" defaultValue={f.med?.doseMg ?? ''} onChange={set('med.doseMg')} /></Stack>
        <Stack space="space.050"><Label labelFor="f-by">Recommended by</Label><Box xcss={{ minWidth: '220px' }}><Select inputId="f-by" options={[{ value: 'physician', label: 'Physician or other licensed health care professional' }, { value: 'self', label: 'The employee' }, { value: 'other', label: 'Supervisor or first-aider' }, { value: 'unknown', label: 'Not known' }]} defaultValue={opt([{ value: 'physician', label: 'Physician or other licensed health care professional' }, { value: 'self', label: 'The employee' }, { value: 'other', label: 'Supervisor or first-aider' }, { value: 'unknown', label: 'Not known' }], f.med?.by)} onChange={set('med.by')} /></Box></Stack>
      </Inline>
      <Inline space="space.200" shouldWrap>
        <Stack space="space.050"><Label labelFor="f-afrom">First day away</Label><DatePicker id="f-afrom" defaultValue={f.away?.from} onChange={set('away.from')} /></Stack>
        <Stack space="space.050"><Label labelFor="f-ato">Back at work on</Label><DatePicker id="f-ato" defaultValue={f.away?.to} onChange={set('away.to')} /></Stack>
        <Stack space="space.050"><Label labelFor="f-adays">or days away</Label><Textfield id="f-adays" type="number" defaultValue={f.away?.from ? '' : f.away?.days ?? ''} onChange={set('away.days')} /></Stack>
      </Inline>
      <Inline space="space.200" shouldWrap>
        <Stack space="space.050"><Label labelFor="f-rfrom">First restricted day</Label><DatePicker id="f-rfrom" defaultValue={f.restricted?.from} onChange={set('restricted.from')} /></Stack>
        <Stack space="space.050"><Label labelFor="f-rto">Full duty again on</Label><DatePicker id="f-rto" defaultValue={f.restricted?.to} onChange={set('restricted.to')} /></Stack>
        <Stack space="space.050"><Label labelFor="f-rdays">or days restricted</Label><Textfield id="f-rdays" type="number" defaultValue={f.restricted?.from ? '' : f.restricted?.days ?? ''} onChange={set('restricted.days')} /></Stack>
      </Inline>
      <Inline space="space.300" shouldWrap>
        <Checkbox value="transfer" label="Job transfer" isChecked={Boolean(cur('restricted.transfer'))} onChange={() => flag('restricted.transfer', !cur('restricted.transfer'))} />
        <Checkbox value="injuryDay" label="Restricted on the day of injury only" isChecked={Boolean(cur('restricted.injuryDayOnly'))} onChange={() => flag('restricted.injuryDayOnly', !cur('restricted.injuryDayOnly'))} />
        <Checkbox value="loc" label="Lost consciousness" isChecked={Boolean(cur('loc'))} onChange={() => flag('loc', !cur('loc'))} />
        <Checkbox value="death" label="Died" isChecked={Boolean(cur('death'))} onChange={() => flag('death', !cur('death'))} />
        <Checkbox value="amp" label="Amputation" isChecked={Boolean(cur('amputation'))} onChange={() => flag('amputation', !cur('amputation'))} />
        <Checkbox value="eye" label="Loss of an eye" isChecked={Boolean(cur('eyeLoss'))} onChange={() => flag('eyeLoss', !cur('eyeLoss'))} />
      </Inline>
      <Stack space="space.050">
        <Label labelFor="f-dx">Diagnosed by a physician or other licensed health care professional (29 CFR 1904.7(b)(7))</Label>
        <Inline space="space.300" shouldWrap>{p.options.diagnoses.map((d) => <Checkbox key={d.value} value={d.value} label={d.label} isChecked={dx.includes(d.value)} onChange={() => flag('diagnoses', dx.includes(d.value) ? dx.filter((c) => c !== d.value) : [...dx, d.value])} />)}</Inline>
      </Stack>
      <Inline space="space.200" shouldWrap>
        <Stack space="space.050"><Label labelFor="f-hosp">Hospital</Label><Box xcss={{ minWidth: '240px' }}><Select inputId="f-hosp" options={HOSP} defaultValue={opt(HOSP, f.hospital || 'none')} onChange={set('hospital')} /></Box></Stack>
        <Stack space="space.050"><Label labelFor="f-veh">Vehicle accident</Label><Box xcss={{ minWidth: '240px' }}><Select inputId="f-veh" options={VEH} defaultValue={opt(VEH, f.vehicle || 'none')} onChange={set('vehicle')} /></Box></Stack>
        <Stack space="space.050"><Label labelFor="f-prior">Earlier case, same type and body part</Label><Box xcss={{ minWidth: '240px' }}><Select inputId="f-prior" options={PRIOR} defaultValue={opt(PRIOR, f.prior || 'none')} onChange={set('prior')} /></Box></Stack>
      </Inline>
      <Inline space="space.100">
        <Button appearance="primary" isDisabled={busy || !Object.keys(x).length} onClick={() => save(x)}>Save and re-check</Button>
        <Button appearance="subtle" onClick={cancel}>Cancel</Button>
      </Inline>
    </Stack>
  );
};
const HOSP = [{ value: 'none', label: 'Not treated at a hospital' }, { value: 'er', label: 'Emergency room, then released' }, { value: 'observation', label: 'Admitted for observation or tests only' }, { value: 'inpatient', label: 'Admitted as an in-patient' }];
const VEH = [{ value: 'none', label: 'No' }, { value: 'public-road', label: 'On a public street or highway' }, { value: 'work-zone', label: 'In a construction work zone' }, { value: 'public-transport', label: 'On commercial or public transport' }];
const PRIOR = [{ value: 'none', label: 'None' }, { value: 'recovered', label: 'Yes, fully recovered from it' }, { value: 'not-recovered', label: 'Yes, not fully recovered' }, { value: 'unknown', label: 'Yes, not known if recovered' }];

const Report = ({ p, busy, act }) => {
  const r = p.report;
  const [how, setHow] = useState(null);
  const [date, setDate] = useState(p.today);
  const [time, setTime] = useState(null);
  const [ref, setRef] = useState('');
  const [checks, setChecks] = useState([]);
  if (!r?.required) return null;
  if (r.done) {
    return (
      <SectionMessage appearance={r.done.onTime ? 'success' : 'warning'} title={`Reported to OSHA ${r.done.onTime ? 'on time' : 'late'}`}>
        <Text>{`${r.done.atText}${r.done.reference ? ` · reference ${r.done.reference}` : ''}${r.done.byName ? ` · by ${r.done.byName}` : ''}. It was due ${r.dueText}.`}</Text>
      </SectionMessage>
    );
  }
  return (
    <SectionMessage appearance="error" title={`Report to OSHA by ${r.dueText} (${hoursText(r.hoursLeft)})`}>
      <Stack space="space.100">
        <Text>{`${r.events.map((e) => e.label).join(' and ')}: report within ${r.hours} hours of learning of it (29 CFR ${r.cite}).${r.tentative ? ' Work-relatedness is not settled yet: if it is work-related, this deadline applies.' : ''}`}</Text>
        <Text>Call the nearest OSHA Area Office, call 1-800-321-OSHA (6742), or report online at osha.gov/report. Have this ready (29 CFR 1904.39(b)(2)):</Text>
        {p.options.checklist.map((c) => <Checkbox key={c.value} value={c.value} label={`${c.label}${p.reportFacts?.[c.value] ? `: ${p.reportFacts[c.value]}` : ''}`} isChecked={checks.includes(c.value)} onChange={() => setChecks((x) => (x.includes(c.value) ? x.filter((k) => k !== c.value) : [...x, c.value]))} />)}
        <Inline space="space.200" shouldWrap alignBlock="end">
          <Stack space="space.050"><Label labelFor="rep-how">How you reported</Label><Box xcss={{ minWidth: '260px' }}><Select inputId="rep-how" options={p.options.reportHow} onChange={(o) => setHow(o?.value)} /></Box></Stack>
          <Stack space="space.050"><Label labelFor="rep-date">Date</Label><DatePicker id="rep-date" defaultValue={p.today} onChange={setDate} /></Stack>
          <Stack space="space.050"><Label labelFor="rep-time">Time (local)</Label><TimePicker id="rep-time" onChange={setTime} /></Stack>
          <Stack space="space.050"><Label labelFor="rep-ref">OSHA reference (optional)</Label><Textfield id="rep-ref" onChange={(e) => setRef(val(e))} /></Stack>
        </Inline>
        <Inline><Button appearance="danger" isDisabled={busy || !how} onClick={() => act('markReported', { method: how, date, time, reference: ref, checklist: checks }, 'Report recorded.')}>Record the report</Button></Inline>
      </Stack>
    </SectionMessage>
  );
};

const Panel = () => {
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showSteps, setShowSteps] = useState(true);
  const [unlog, setUnlog] = useState(null);
  const load = async () => {
    const r = await call('getPanel');
    if (r?.error) setError(r.error);
    else { setError(''); setP(r); }
  };
  useEffect(() => { load(); }, []);
  const act = async (name, payload, done) => {
    setBusy(true);
    setMsg('');
    setError('');
    const r = await call(name, payload);
    if (r?.error) setError(r.error);
    else {
      await load();
      if (done) setMsg(typeof done === 'function' ? done(r) : done);
    }
    setBusy(false);
    return r;
  };
  if (!p) return error ? <ErrorMessage>{error}</ErrorMessage> : <Spinner label="Checking the case" />;
  if (p.none) {
    return (
      <Stack space="space.100">
        <Text>This request isn't an injury or illness case yet.</Text>
        <Text>Use "Treat as injury or illness" in the request's ••• menu to start.</Text>
        {error ? <ErrorMessage>{error}</ErrorMessage> : null}
      </Stack>
    );
  }
  const d = p.decision;
  const look = d.code === 'recordable' ? (p.log ? 'success' : 'warning') : d.code === 'not-recordable' ? 'success' : d.code === 'needs-info' ? 'discovery' : 'information';
  const t = p.told;
  return (
    <Stack space="space.200">
      <Inline space="space.100" alignBlock="center" shouldWrap>
        {p.badge ? <Pill appearance={p.badge.type} bold>{p.badge.label}</Pill> : null}
        <DecisionPill code={d.code} />
        <StatusPill status={p.status} label={p.statusLabel} />
        {p.est ? <Text>{p.est.name}</Text> : <Text color="color.text.warning">No establishment yet</Text>}
        {p.sample ? <Lozenge>sample</Lozenge> : null}
      </Inline>
      <Report p={p} busy={busy} act={act} />
      <SectionMessage appearance={look} title={d.code === 'recordable' ? `${p.log ? `On the 300 log as ${p.log.caseNo}` : 'Recordable'}: ${d.outcomeLabel} (column ${d.outcomeCol}), ${d.typeLabel}` : d.code === 'not-recordable' ? 'Not recordable' : d.code === 'needs-info' ? `${plural(d.questions.length, 'question')} before Recordable can decide` : 'Not a new case'}>
        <Text>{d.summary}</Text>
        {d.code === 'recordable' && !p.log && d.recordBy ? <Text>{`Enter it on the OSHA 300 log by ${fmtDate(d.recordBy)} (7 calendar days, 29 CFR 1904.29(b)(3)).`}</Text> : null}
        {p.awayStarts ? <Text>{`Days away start counting on ${fmtDate(p.awayStarts)}: the day of injury is never counted (29 CFR 1904.7(b)(3)(i)). The outcome moves to column H then.`}</Text> : null}
        {d.privacy?.length ? <Text>{`Privacy case (29 CFR ${d.privacy.map((x) => x.cite).join(', ')}): the log will say "Privacy case" instead of the name.`}</Text> : null}
      </SectionMessage>
      {msg ? <SectionMessage appearance="success"><Text>{msg}</Text></SectionMessage> : null}
      {error ? <ErrorMessage>{error}</ErrorMessage> : null}

      {d.questions.map((q) => <Question key={q.id} q={q} p={p} busy={busy} answer={(a, patch) => act('updateFacts', patch ? { patch } : a, 'Answer saved. Recordable checked the case again.')} />)}

      <ButtonGroup>
        {d.code === 'recordable' && !p.log ? <Button appearance="primary" isDisabled={busy} onClick={() => act('logCase', {}, (r) => `Entered on the 300 log as case ${r.caseNo}${r.form301 ? `; incident report attached (${r.form301})` : ''}.`)}>Enter on the 300 log</Button> : null}
        {['not-recordable', 'existing-case'].includes(d.code) && p.status === 'open' ? <Button isDisabled={busy} onClick={() => act('closeCase', {}, 'Closed as not recordable.')}>Close: not recordable</Button> : null}
        {['closed', 'merged'].includes(p.status) ? <Button isDisabled={busy} onClick={() => act('reopenCase', {}, 'Reopened.')}>Reopen</Button> : null}
        {p.status !== 'closed' && p.status !== 'merged' ? <Button appearance="subtle" isDisabled={busy} onClick={() => setEditing(!editing)}>{editing ? 'Close the facts' : 'Edit the facts'}</Button> : null}
      </ButtonGroup>
      {editing ? <Facts p={p} busy={busy} cancel={() => setEditing(false)} save={async (x) => { const r = await act('updateFacts', { patch: x }, (res) => (res.unchanged ? 'Nothing changed.' : `Saved. ${res.summary}`)); if (!r?.error) setEditing(false); }} /> : null}

      {p.log ? (
        <Box xcss={{ padding: 'space.150', borderRadius: 'border.radius.200', backgroundColor: 'color.background.success' }}>
          <Stack space="space.075">
            <Heading size="xsmall">{`OSHA 300 log · case ${p.log.caseNo}`}</Heading>
            <Text>{`${p.est?.name || ''} ${p.log.year} log · ${d.outcomeLabel || ''} (column ${d.outcomeCol || '-'}) · ${d.typeLabel} (column ${d.typeCol}) · ${p.days.away} days away · ${p.days.restricted} days restricted${p.days.capped ? ' (180-day cap)' : ''}${p.days.awayOngoing || p.days.restrictedOngoing ? ' · still counting' : ''}`}</Text>
            <Caption>{`Entered ${fmtDate(p.log.at)}${p.log.byName ? ` by ${p.log.byName}` : ''}${p.log.onTime === false ? ' (after the 7-day deadline)' : ''}`}</Caption>
            {p.form301 ? <Link href={p.form301.url}>{`Incident report: ${p.form301.name}`}</Link> : null}
            {unlog === null ? <Inline><Button appearance="subtle" onClick={() => setUnlog('')}>Remove from the log</Button></Inline> : (
              <Inline space="space.100" alignBlock="end">
                <Stack space="space.050"><Label labelFor="unlog">Why (for the audit trail)</Label><Textfield id="unlog" onChange={(e) => setUnlog(val(e))} placeholder="e.g. Doctor confirmed not work-related" /></Stack>
                <Button appearance="warning" isDisabled={busy || !unlog.trim()} onClick={async () => { await act('unlogCase', { reason: unlog }, 'Removed from the log.'); setUnlog(null); }}>Remove</Button>
              </Inline>
            )}
          </Stack>
        </Box>
      ) : null}

      <Stack space="space.100">
        <Inline space="space.100" alignBlock="center"><Heading size="xsmall">How Recordable decided</Heading><Toggle id="steps" isChecked={showSteps} onChange={() => setShowSteps(!showSteps)} /></Inline>
        {showSteps ? d.steps.map((s, i) => <Step key={`${i}-${s.cite}`} s={s} />) : null}
        {!d.steps.length ? <Caption>No rule has applied yet.</Caption> : null}
      </Stack>

      <Stack space="space.075">
        <Heading size="xsmall">What the request says</Heading>
        <Caption>Read from the request in Jira. Recordable doesn't store names or descriptions.</Caption>
        {[['Employee', `${t.employee}${t.jobTitle ? `, ${t.jobTitle}` : ''}`], ['Where', t.where], ['Doing', t.doing], ['What happened', t.happened], ['Injury', t.injury], ['Object or substance', t.object], ['Care from', [t.physician, t.facility].filter(Boolean).join(', ')]]
          .filter(([, v]) => v && v.trim()).map(([k, v]) => <Text key={k}>{`${k}: ${v}`}</Text>)}
        <Text>{`Facts: ${p.facts.incidentDate ? fmtDate(p.facts.incidentDate) : 'no date'}${p.facts.incidentTime ? ` ${p.facts.incidentTime}` : ''} · ${p.labels.type}${p.labels.bodyPart ? ` · ${p.labels.bodyPart}` : ''} · treatment: ${p.labels.treatments.join(', ') || (p.facts.noTreatment ? 'none' : 'not given')}${p.facts.med?.drug ? ` · ${p.facts.med.drug}${p.facts.med.doseMg ? ` ${p.facts.med.doseMg} mg` : ''}` : ''} · ${p.days.away} days away, ${p.days.restricted} restricted`}</Text>
      </Stack>

      <Stack space="space.050">
        <Heading size="xsmall">History</Heading>
        {p.history.slice(0, 8).map((h) => <Caption key={`${h.at}-${h.what}`}>{`${new Date(h.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · ${h.name} · ${h.what}${h.detail ? `: ${h.detail}` : ''}`}</Caption>)}
      </Stack>
    </Stack>
  );
};

ForgeReconciler.render(<React.StrictMode><Panel /></React.StrictMode>);
