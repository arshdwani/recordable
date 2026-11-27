// The "Injury or illness" form on the customer portal (jiraServiceManagement:portalRequestCreatePropertyPanel).
// Answers are handed to Jira with view.submit and saved on the request as an issue property: they stay in Jira.
// On every other request type this panel renders nothing.
import React, { useEffect, useRef, useState } from 'react';
import ForgeReconciler, {
  Box, Checkbox, DatePicker, Heading, Inline, Label, RadioGroup, RequiredAsterisk, SectionMessage, Select, Stack, Text, TextArea, Textfield, TimePicker, useProductContext,
} from '@forge/react';
import { invoke, view } from '@forge/bridge';

const ACTIVITY = [
  { value: 'working', label: 'Working (on site, or on a work errand or trip)' },
  { value: 'break', label: 'On a break or a meal' },
  { value: 'commute', label: 'In a vehicle accident in the company parking lot or access road, arriving or leaving' },
  { value: 'other', label: 'Something else' },
];
const MEDICINE = [
  { value: 'none', label: 'No medicine' },
  { value: 'otc', label: 'Over-the-counter medicine (for example ibuprofen)' },
  { value: 'rx', label: 'Prescription medicine, or a doctor said to get one' },
];
const MED_BY = [
  { value: 'physician', label: 'A doctor, nurse or other licensed health professional said to' },
  { value: 'self', label: 'I took it myself' },
  { value: 'other', label: 'A supervisor or first-aider gave it' },
];
const CARE = [
  { value: 'none', label: 'No care beyond what is ticked above' },
  { value: 'onsite', label: 'First aid at work' },
  { value: 'clinic', label: 'A clinic or doctor' },
  { value: 'er', label: 'Emergency room, then home' },
  { value: 'inpatient', label: 'Admitted to hospital (stayed in as an in-patient)' },
];
const MISSED = [
  { value: 'none', label: 'No: back at full duties' },
  { value: 'away', label: 'Yes: off work (or a doctor said to stay off)' },
  { value: 'restricted', label: 'Yes: light or restricted duty, or a different job' },
  { value: 'unknown', label: 'Not known yet' },
];
const SEVERE = [
  { value: 'loc', label: 'Lost consciousness' },
  { value: 'amputation', label: 'Amputation (any part, even a fingertip)' },
  { value: 'eye', label: 'Lost an eye' },
];

const val = (e) => (e?.target ? e.target.value : e?.value ?? e);

const Portal = () => {
  const ctx = useProductContext();
  const typeId = ctx?.extension?.request?.typeId;
  const [form, setForm] = useState(null);
  const [v, setV] = useState({ who: 'self', activity: 'working', medicine: 'none', care: 'onsite', missed: 'none' });
  const timer = useRef(null);

  useEffect(() => {
    if (!ctx) return;
    invoke('portalForm', { requestTypeId: typeId }).then((r) => {
      setForm(r?.error ? { enabled: false } : r);
      if (r?.establishments?.length === 1) setV((x) => ({ ...x, est: r.establishments[0].value }));
    }).catch(() => setForm({ enabled: false }));
  }, [ctx, typeId]);

  // Hand the answers to the request form (debounced). Lists go as comma-separated codes.
  useEffect(() => {
    if (!form) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!form.enabled) {
        view.submit({ fields: [], isValid: true }).catch(() => null);
        return;
      }
      const fields = Object.entries({ v: '1', ...v }).filter(([, x]) => x !== undefined && x !== null && x !== '').map(([key, x]) => ({ key, value: Array.isArray(x) ? x.join(',') : String(x) }));
      const isValid = Boolean(v.date && String(v.employee || '').trim() && String(v.happened || '').trim() && (!form.establishments?.length || v.est));
      view.submit({ fields, isValid }).catch(() => null);
    }, 250);
  }, [v, form]);

  if (!form || !form.enabled) return null;
  const missing = [
    !String(v.employee || '').trim() && (v.who === 'other' ? 'the name of the person hurt or ill' : 'your full name'),
    form.establishments?.length && !v.est && 'the workplace',
    !v.date && 'the date it happened',
    !String(v.happened || '').trim() && 'what happened',
  ].filter(Boolean);
  const touched = Object.keys(v).some((k) => !['who', 'activity', 'medicine', 'care', 'missed', 'est'].includes(k));
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: val(e) }));
  const toggle = (k, code) => setV((x) => {
    const list = (x[k] || []).includes(code) ? x[k].filter((c) => c !== code) : [...(x[k] || []), code];
    return { ...x, [k]: list };
  });
  const sel = (opts, value) => opts.find((o) => o.value === value);

  return (
    <Stack space="space.200">
      <SectionMessage appearance="information">
        <Text>Report every work injury or illness, even small ones. You have the right to report it, and your employer may not retaliate against you for reporting (29 CFR 1904.35).</Text>
      </SectionMessage>

      <Heading size="small">Who and where</Heading>
      <RadioGroup name="rc-who" options={[{ value: 'self', label: 'I was hurt or became ill' }, { value: 'other', label: 'I am reporting for someone else' }]} defaultValue="self" onChange={set('who')} />
      <Stack space="space.050">
        <Label labelFor="rc-employee">{v.who === 'other' ? 'Name of the person hurt or ill' : 'Your full name'}<RequiredAsterisk /></Label>
        <Textfield id="rc-employee" onChange={set('employee')} />
      </Stack>
      <Stack space="space.050">
        <Label labelFor="rc-job">Job title</Label>
        <Textfield id="rc-job" onChange={set('jobTitle')} placeholder="e.g. Press operator" />
      </Stack>
      <Inline space="space.200" shouldWrap>
        <Stack space="space.050"><Label labelFor="rc-dob">Date of birth (optional)</Label><DatePicker id="rc-dob" onChange={set('dob')} placeholder="For the OSHA report" /></Stack>
        <Stack space="space.050"><Label labelFor="rc-hired">Date hired (optional)</Label><DatePicker id="rc-hired" onChange={set('hired')} placeholder="For the OSHA report" /></Stack>
      </Inline>
      {form.establishments?.length ? (
        <Stack space="space.050">
          <Label labelFor="rc-est">Workplace<RequiredAsterisk /></Label>
          <Select inputId="rc-est" options={form.establishments} defaultValue={sel(form.establishments, v.est)} onChange={set('est')} />
        </Stack>
      ) : null}
      <Stack space="space.050">
        <Label labelFor="rc-date">Date it happened (or the illness began)<RequiredAsterisk /></Label>
        <DatePicker id="rc-date" onChange={set('date')} />
      </Stack>
      <Stack space="space.050">
        <Label labelFor="rc-time">Time it happened</Label>
        <TimePicker id="rc-time" onChange={set('time')} />
      </Stack>
      <Stack space="space.050">
        <Label labelFor="rc-start">Time the work day began</Label>
        <TimePicker id="rc-start" onChange={set('startTime')} />
      </Stack>
      <Stack space="space.050">
        <Label labelFor="rc-where">Where exactly</Label>
        <Textfield id="rc-where" onChange={set('where')} placeholder="e.g. Loading dock 3" />
      </Stack>
      <Stack space="space.050">
        <Label labelFor="rc-activity">At the time, you were</Label>
        <RadioGroup name="rc-activity" options={ACTIVITY} defaultValue="working" onChange={set('activity')} />
      </Stack>

      <Heading size="small">What happened</Heading>
      <Stack space="space.050">
        <Label labelFor="rc-doing">What were you doing just before?</Label>
        <TextArea id="rc-doing" onChange={set('doing')} placeholder="e.g. Carrying roofing materials down a ladder" />
      </Stack>
      <Stack space="space.050">
        <Label labelFor="rc-happened">What happened?<RequiredAsterisk /></Label>
        <TextArea id="rc-happened" onChange={set('happened')} placeholder="e.g. The ladder slipped on the wet floor and I fell about 6 feet" />
      </Stack>
      <Stack space="space.050">
        <Label labelFor="rc-object">What object or substance caused it?</Label>
        <Textfield id="rc-object" onChange={set('object')} placeholder="e.g. Concrete floor, box cutter, chlorine" />
      </Stack>

      <Heading size="small">The injury or illness</Heading>
      <Stack space="space.050">
        <Label labelFor="rc-kind">It is</Label>
        <Select inputId="rc-kind" options={form.kinds} defaultValue={form.kinds[0]} onChange={set('kind')} />
      </Stack>
      <Stack space="space.050">
        <Label labelFor="rc-part">Part of the body</Label>
        <Select inputId="rc-part" options={form.bodyParts} onChange={set('bodyPart')} />
      </Stack>
      <Stack space="space.050">
        <Label labelFor="rc-injury">Describe it</Label>
        <Textfield id="rc-injury" onChange={set('injury')} placeholder="e.g. Deep cut on the left palm" />
      </Stack>
      <Checkbox value="sharp" label="A needlestick, or a cut from a used needle or other sharp" isChecked={Boolean(v.sharp)} onChange={() => setV((x) => ({ ...x, sharp: x.sharp ? '' : 'unsure' }))} />
      {v.sharp ? (
        <Box paddingInlineStart="space.300">
          <RadioGroup name="rc-sharp" options={[{ value: 'blood', label: "It had someone else's blood or body fluid on it" }, { value: 'unsure', label: 'Not sure' }]} defaultValue={v.sharp} onChange={set('sharp')} />
        </Box>
      ) : null}
      <Stack space="space.050">
        <Label labelFor="rc-severe">Did any of these happen?</Label>
        {SEVERE.map((s) => <Checkbox key={s.value} value={s.value} label={s.label} isChecked={(v.severe || []).includes(s.value)} onChange={() => toggle('severe', s.value)} />)}
      </Stack>

      <Heading size="small">Care given (by anyone)</Heading>
      <Stack space="space.050">
        {form.treatments.map((t) => <Checkbox key={t.value} value={t.value} label={t.label} isChecked={(v.treatments || []).includes(t.value)} onChange={() => toggle('treatments', t.value)} />)}
        <Checkbox value="none" label="No treatment" isChecked={(v.treatments || []).includes('none')} onChange={() => toggle('treatments', 'none')} />
      </Stack>
      <Stack space="space.050">
        <Label labelFor="rc-medicine">Medicine</Label>
        <RadioGroup name="rc-medicine" options={MEDICINE} defaultValue="none" onChange={set('medicine')} />
      </Stack>
      {v.medicine === 'otc' ? (
        <Box paddingInlineStart="space.300">
          <Stack space="space.100">
            <Stack space="space.050">
              <Label labelFor="rc-drug">Which medicine</Label>
              <Select inputId="rc-drug" options={form.meds} onChange={set('drug')} />
            </Stack>
            <Stack space="space.050">
              <Label labelFor="rc-dose">Dose each time (mg), if you know it</Label>
              <Textfield id="rc-dose" type="number" onChange={set('doseMg')} placeholder="e.g. 400" />
            </Stack>
            <RadioGroup name="rc-medby" options={MED_BY} onChange={set('medBy')} />
          </Stack>
        </Box>
      ) : null}
      <Stack space="space.050">
        <Label labelFor="rc-care">Where care was given</Label>
        <RadioGroup name="rc-care" options={CARE} defaultValue="onsite" onChange={set('care')} />
      </Stack>
      {['clinic', 'er', 'inpatient'].includes(v.care) ? (
        <Box paddingInlineStart="space.300">
          <Stack space="space.100">
            <Stack space="space.050"><Label labelFor="rc-doc">Doctor or health professional</Label><Textfield id="rc-doc" onChange={set('physician')} /></Stack>
            <Stack space="space.050"><Label labelFor="rc-fac">Clinic or hospital, and its address</Label><Textfield id="rc-fac" onChange={set('facility')} /></Stack>
          </Stack>
        </Box>
      ) : null}

      <Heading size="small">Time off</Heading>
      <Stack space="space.050">
        <Label labelFor="rc-missed">After the day it happened, did you miss work or have restricted duty?</Label>
        <RadioGroup name="rc-missed" options={MISSED} defaultValue="none" onChange={set('missed')} />
      </Stack>
      {['away', 'restricted'].includes(v.missed) ? (
        <Box paddingInlineStart="space.300">
          <Stack space="space.050"><Label labelFor="rc-from">Starting</Label><DatePicker id="rc-from" onChange={set('missedFrom')} /></Stack>
        </Box>
      ) : null}
      {v.kind && v.kind !== 'injury' ? (
        <Checkbox value="keepNameOff" label="Please keep my name off the injury and illness log" isChecked={Boolean(v.keepNameOff)} onChange={() => setV((x) => ({ ...x, keepNameOff: x.keepNameOff ? '' : 'yes' }))} />
      ) : null}
      {touched && missing.length ? (
        <SectionMessage appearance="warning">
          <Text>{`To send this report, add ${missing.join(', ')}.`}</Text>
        </SectionMessage>
      ) : null}
      <Text size="small" color="color.text.subtlest">Your answers are saved on this request in Jira and seen by the safety team. The Recordable app keeps only dates and codes, never your name or medical details.</Text>
    </Stack>
  );
};

ForgeReconciler.render(<React.StrictMode><Portal /></React.StrictMode>);
