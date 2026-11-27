// Pieces shared by the Recordable page, the request panel, the portal form and the issue action (Atlassian UI Kit components only).
import React from 'react';
import { invoke } from '@forge/bridge';
import { Box, Heading, Inline, Lozenge, Stack, Text } from '@forge/react';

// invoke() that always resolves: a failed or timed-out call becomes { error } with a message people can act on.
export const call = (name, payload) =>
  invoke(name, payload).catch((e) => {
    console.error(name, e);
    return { error: 'Recordable took too long to respond. Please try again.' };
  });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
export const fmtWhen = (ms) => (ms ? new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
export const today = () => new Date().toISOString().slice(0, 10);
export const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// A lozenge that keeps its full text in a narrow column.
export const Pill = ({ appearance, children, bold }) => (
  <Box xcss={{ minWidth: 'max-content' }}>
    <Lozenge appearance={appearance} isBold={bold}>{children}</Lozenge>
  </Box>
);

export const ClockPill = ({ badge }) => (badge ? <Pill appearance={badge.type} bold={badge.type === 'removed'}>{badge.label}</Pill> : null);

const STATUS_LOOK = { open: 'inprogress', logged: 'success', closed: 'default', merged: 'default' };
export const StatusPill = ({ status, label }) => <Pill appearance={STATUS_LOOK[status] || 'default'}>{label || status}</Pill>;

const DECISION = { recordable: ['Recordable', 'moved'], 'not-recordable': ['Not recordable', 'success'], 'needs-info': ['Needs answers', 'new'], 'existing-case': ['Same as an earlier case', 'default'] };
export const DecisionPill = ({ code }) => <Pill appearance={(DECISION[code] || [])[1] || 'default'}>{(DECISION[code] || [code])[0]}</Pill>;

/** "29 CFR 1904.7(b)(5)(ii)(D)" as a small grey reference. */
export const citeText = (c) => (!c ? '' : /^\d/.test(String(c)) ? `29 CFR ${c}` : String(c));
export const Cite = ({ cite }) => (cite ? <Text size="small" color="color.text.subtlest">{citeText(cite)}</Text> : null);

export const hoursText = (h) => (h === null || h === undefined ? '' : h < 0 ? `${Math.ceil(-h)}h overdue` : h < 1 ? `${Math.max(1, Math.round(h * 60))} min left` : `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m left`);

// One number on the board.
export const Kpi = ({ label, value, tone }) => (
  <Box
    xcss={{
      padding: 'space.200',
      borderRadius: 'border.radius.200',
      backgroundColor: tone === 'danger' ? 'color.background.danger' : tone === 'warning' ? 'color.background.warning' : tone === 'info' ? 'color.background.information' : 'color.background.neutral',
      minWidth: '140px',
    }}
  >
    <Stack space="space.050">
      <Heading size="large">{String(value)}</Heading>
      <Text>{label}</Text>
    </Stack>
  </Box>
);

const HEAT = ['color.background.neutral', 'color.background.accent.yellow.subtlest', 'color.background.accent.orange.subtler', 'color.background.accent.red.subtler', 'color.background.accent.red.subtle'];
export const HeatCell = ({ level, children }) => (
  <Box xcss={{ backgroundColor: HEAT[level] || HEAT[0], paddingInline: 'space.150', paddingBlock: 'space.075', borderRadius: 'border.radius', minWidth: '48px' }}>
    <Inline alignInline="center"><Text>{children}</Text></Inline>
  </Box>
);

// Small grey caption.
export const Caption = ({ children }) => <Text size="small" color="color.text.subtlest">{children}</Text>;
