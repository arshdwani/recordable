// "Treat as injury or illness" (jira:issueAction): start tracking any request as an OSHA case.
import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Button, DatePicker, ErrorMessage, Inline, Label, SectionMessage, Select, Spinner, Stack, Text } from '@forge/react';
import { view } from '@forge/bridge';
import { call } from './common.jsx';

const Action = () => {
  const [d, setD] = useState(null);
  const [f, setF] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  useEffect(() => {
    call('getIntake').then((r) => {
      if (r?.error) setErr(r.error);
      else { setD(r); setF(r.suggestion); }
    });
  }, []);
  if (!d) return err ? <ErrorMessage>{err}</ErrorMessage> : <Spinner label="Reading the request" />;
  if (d.isSubtask) return <Stack space="space.100"><Text>Treat the request itself as the injury or illness, not one of its sub-tasks.</Text><Inline><Button onClick={() => view.close()}>Close</Button></Inline></Stack>;
  if (d.existing || done) {
    return (
      <Stack space="space.100">
        <SectionMessage appearance="success"><Text>{done ? `Recordable is tracking ${d.issueKey}. Open its Recordable panel to answer the questions and see the decision.` : `${d.issueKey} is already a Recordable case.`}</Text></SectionMessage>
        <Inline><Button appearance="primary" onClick={() => view.close()}>Close</Button></Inline>
      </Stack>
    );
  }
  const start = async () => {
    setBusy(true);
    setErr('');
    const r = await call('openCase', f);
    setBusy(false);
    if (r?.error) setErr(r.error);
    else setDone(r);
  };
  return (
    <Stack space="space.150">
      <Text>Recordable will decide whether this is OSHA-recordable (29 CFR Part 1904) and run the reporting and recording clocks. You confirm the facts in its panel; anything unclear becomes a question.</Text>
      {d.matched.length ? <Text>{`Found in the request: ${d.matched.join(', ')}.`}</Text> : null}
      <Stack space="space.050"><Label labelFor="a-est">Establishment</Label><Select inputId="a-est" options={d.establishments} defaultValue={d.establishments.find((o) => o.value === f.est)} onChange={(o) => setF({ ...f, est: o?.value })} placeholder={d.establishments.length ? 'Choose' : 'Add establishments on the Recordable page'} /></Stack>
      <Stack space="space.050"><Label labelFor="a-date">Date of the injury or illness</Label><DatePicker id="a-date" defaultValue={f.incidentDate} onChange={(v) => setF({ ...f, incidentDate: v })} /></Stack>
      {err ? <ErrorMessage>{err}</ErrorMessage> : null}
      <Inline space="space.100">
        <Button appearance="primary" isDisabled={busy} onClick={start}>{busy ? 'Starting…' : 'Treat as injury or illness'}</Button>
        <Button appearance="subtle" onClick={() => view.close()}>Cancel</Button>
      </Inline>
    </Stack>
  );
};

ForgeReconciler.render(<React.StrictMode><Action /></React.StrictMode>);
