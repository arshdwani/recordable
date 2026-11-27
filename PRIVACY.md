# Recordable: privacy policy

_Last updated: 25 November 2026_

Recordable is a Forge app for Jira Service Management. It helps employers decide whether work injuries and illnesses
are recordable under OSHA's rule (29 CFR Part 1904), meet the reporting and recording deadlines, and keep the OSHA 300
log, 300A summary and electronic submission files. It runs entirely on Atlassian Forge. This page explains what
Recordable stores, what it writes into your site, and what it never does.

## Nothing leaves Atlassian
Recordable makes no calls outside Atlassian. Its manifest declares no external egress, it has no remote backend, and
it uses no analytics, advertising or outside AI services. Decisions come from a fixed rules engine, not from a
language model. All processing runs in Forge functions on Atlassian's platform.

## What the portal form saves, and where
The "Injury or illness" portal form is part of the Jira request. Its answers are saved on the request in Jira as an
issue property, visible to people who can see the request. They include the employee's name, job title, the
description of what happened, the injury, the care given, the doctor or clinic, and optional dates of birth and hire.
Recordable reads them only to show its panel or build a document (the Form 301, the 300 log, the ITA files), and does
**not** copy them into its own storage.

## What Recordable stores
Recordable keeps its own records in Forge hosted storage, which Atlassian operates for the site where the app is
installed. It stores issue keys, Atlassian account IDs, dates, codes and counts:

- **One record per case:**
  - the issue key and the establishment;
  - the dates and times of the incident and of when it was reported;
  - coded facts: body part, injury or illness type, treatment codes, medicine name and dose, day counts and their
    dates, whether the employee was hospitalized, and the special-case values (for example a hearing shift in dB);
  - the decision's status, the 300 log entry (case number, year, date entered), and the OSHA report (date, method
    and reference);
  - an audit trail of steps (what happened, when, and the account ID of who acted).
- **Establishments:** name, address, NAICS code, industry description, establishment type, legal company name, EIN,
  time zone and the safety lead's account ID. With JSM Assets connected, Assets is the source of truth and Recordable
  keeps a copy for the portal form and scheduled checks. Without Assets, this is Recordable's own register.
- **Year data:** hours worked, the average and peak number of employees, and the year-end steps (prepared,
  certified, posted, submitted) for each establishment and year.
- **Settings and housekeeping:** the service project, request type and company name; records that make each alert
  happen only once; progress of long jobs; and the list of what the sample created. Sample cases use invented names.

Names of Atlassian users are looked up when Recordable displays them and are not stored.

## What Recordable writes into your site
Recordable acts with the signed-in user's permissions for the Recordable page, the request panel and Rovo actions,
and with the app's own permissions for the issue-created trigger and the hourly checks. It:
- creates the "Injury or illness" request type and, when you connect Assets, the "OSHA establishments" schema and its
  objects;
- sets an issue property on cases (for the panel, the badge and JQL);
- posts internal notes on requests: decisions, questions and alerts;
- attaches the Form 301 equivalent to a request when it is entered on the log;
- creates a year-end work item with the 300 log, the 300A summary and the ITA files attached.

## Rovo
When you use the Recordable agent in Rovo, its actions return case details to Rovo, which runs on Atlassian under
Atlassian's terms. Those details are issue keys, establishments, dates, decisions, rates and counts, never employee
names. Actions that change a case (entering it on the log, recording days) run only after you confirm them.

## Account IDs and closed accounts
Every week Recordable reports the Atlassian account IDs it stores to Atlassian through the Forge personal data
reporting API. When Atlassian reports an account as closed, Recordable removes that account ID from its records.

## Retention and deletion
Recordable keeps its records while the app is installed. OSHA requires employers to keep the log, summary and
incident reports for 5 years (29 CFR 1904.33); the documents Recordable attaches stay in Jira under your control.
**Remove sample** deletes everything the sample created. Deleting a request removes its case from Recordable. When the
app is uninstalled, Forge hosted storage is handled under Atlassian's Forge data lifecycle.

## Security
Data at rest and in transit is protected by Atlassian's Forge platform. Recordable's logs hold issue keys, counts and
error messages. Only Jira administrators can change settings, establishments, hours or the sample.

## Contact
Questions or requests: https://github.com/arshdwani/recordable/issues
