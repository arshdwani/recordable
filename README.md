# Recordable: OSHA injury and illness recordkeeping in Jira Service Management

Recordable turns Jira Service Management into an OSHA recordkeeping desk. An employee reports a work injury or
illness on the portal with a structured form. Recordable decides whether it is **recordable under 29 CFR Part 1904**
and shows the rule behind every step: work-relatedness and its exceptions, new case, first aid versus medical
treatment, days away and restricted work, needlesticks, hearing loss and TB. It runs the **8- and 24-hour OSHA
reporting clocks** and the **7-day recording clock**. It keeps each establishment's **OSHA 300 log**, **300A
summary** and **Form 301 incident reports**, and writes the **electronic submission (ITA) files** in OSHA's exact
CSV format. Establishments live in **JSM Assets**. A **Rovo agent** answers "Is this recordable?" and "What's our
DART rate at Plant 2?" with citations.

It runs entirely on Atlassian: no data leaves Jira, and names and medical details never leave the request.

Built for Atlassian Codegeist 2026 (Apps for Specialized Industries: workplace safety).

## Why

- **Millions of cases, each needing a call.** US private employers reported 2.4 million nonfatal workplace injuries
  and illnesses in 2025, a total recordable case rate of 2.3 per 100 full-time workers ([BLS, Employer-Reported
  Workplace Injuries and Illnesses, 2025, released Nov 18, 2026](https://www.bls.gov/news.release/osh.nr0.htm)).
  Each one needs the same questions answered. Is it work-related? Is it first aid or medical treatment? Which column
  does it go in, and how many days?
- **Short, unforgiving clocks.** Federal OSHA received 9,034 severe injury reports in 2024, about 25 a day,
  including 2,426 amputations and 7,327 in-patient hospitalizations ([OSHA, 2024 Annual Report of Fed OSHA
  SIRs](https://www.osha.gov/sites/default/files/2024_Annual_Report_of_Fed_OSHA_SIRs.pdf)). Each had to be reported
  within 24 hours, or within 8 for a death.
- **Year-end filing at scale.** OSHA estimates 52,092 establishments must submit 300 and 301 case data every year,
  and about 463,000 must submit 300A summaries ([88 FR 47254, 2023](https://www.govinfo.gov/content/pkg/FR-2023-07-21/html/2023-15091.htm)).
- **Mistakes cost money.** Penalties reach $16,550 per serious violation and $165,514 per willful or repeated
  violation ([OSHA penalties](https://www.osha.gov/penalties)).
- **Accuracy is a known weak spot.** GAO found that over a third of the US occupational health practitioners it
  surveyed had been pressured, by employers or workers, to provide insufficient medical treatment so that an injury
  would not have to be recorded ([GAO-10-10](https://www.gao.gov/products/gao-10-10)). The line between first aid
  and medical treatment is exactly what Recordable makes explicit, and it cites the rule.
- **Who it's for:** safety and EHS managers, HR teams and plant leads at multi-site employers already on Jira Service
  Management. There are about 143,100 occupational health and safety specialists in the US alone
  ([BLS Occupational Outlook Handbook](https://www.bls.gov/ooh/healthcare/occupational-health-and-safety-specialists-and-technicians.htm)).

## What it does

1. **A structured report on the portal.** Setup adds an **"Injury or illness"** request type. Its portal form is a
   Forge **JSM portal request create property panel** (UI Kit). It asks what happened, when and where, and which
   establishment. It lists treatment in plain words ("Stitches or staples", "Butterfly strips", "Ice pack"), asks
   about medicine and its dose, where care was given, time off, and severe outcomes. The answers are saved on the
   request as an issue property, so they stay in Jira. The form tells employees they have a right to report
   without retaliation (29 CFR 1904.35).
2. **A decision with the rule for every step.** When the request arrives, a deterministic engine applies
   29 CFR 1904:
   - work-relatedness and the nine exceptions (1904.5): commuting in the company lot, eating, cold or flu,
     voluntary wellness, and the rest;
   - whether it is a new case (1904.6);
   - the general criteria (1904.7): death, days away, restricted work or transfer, medical treatment beyond first
     aid (the closed list of 14 first-aid items), loss of consciousness, significant diagnoses;
   - the specific cases: contaminated needlesticks (1904.8), medical removal (1904.9), hearing STS of 10 dB plus
     25 dB (1904.10), and TB (1904.11);
   - privacy concern cases (1904.29(b)(7)).

   Each step shows its citation. **Anything the rules need but the request doesn't say becomes a question, never a
   guess**: what dose of ibuprofen did the clinic recommend? Had the earlier back injury fully healed? Was the
   needle contaminated? Answer it in the panel and Recordable decides again.
3. **Clocks.**
   - A fatality must be reported to OSHA within 8 hours, and an in-patient hospitalization, amputation or loss of an
     eye within 24 hours. The clock runs from when you learned of it, in the establishment's time zone. Recordable
     applies the 30-day and 24-hour windows and the exceptions for public roads, public transport and
     observation-only admissions.
   - The panel shows OSHA's call checklist, filled in with what the request already says, and records how and when
     you reported.
   - Recordable alerts before the 7-day recording deadline.
   - Days away and restricted are counted in calendar days, starting the day after the injury and stopping at 180.
4. **The 300 log, 300A and 301.**
   - **Enter on the 300 log** gives the case the next number on its establishment's log (for example 2026-004) and
     attaches a **Form 301 equivalent** PDF to the request.
   - The log is computed live from the cases. Privacy cases show "Privacy case" instead of the name.
   - **Prepare 300, 300A and ITA files** creates a year-end work item with these attached: the 300 log (landscape
     PDF), the 300A summary with OSHA's required statements, and the **ITA CSVs**.
   - The ITA CSVs use OSHA's exact 28-column and 24-column headers. Names are scrubbed from the narratives, and
     the file runs the ITA's cross-field checks.
   - The year-end item is due February 1 and assigned to the establishment's safety lead.
5. **Who must submit electronically.** Recordable checks each establishment's NAICS code and peak headcount against
   Appendix A and Appendix B to Subpart E (all 169 entries are bundled) and against the partially exempt industries
   (82 entries). It then says what to submit by March 2: nothing, the 300A, or the 300A plus the 300/301 case data.
6. **Establishments in JSM Assets.** Setup creates an **OSHA establishments** schema with an *Establishment* object
   type: address, NAICS, industry, legal company name, EIN, time zone and safety lead. Without Assets, Recordable
   keeps its own register.
7. **A board** shows:
   - events to report to OSHA now, recordable cases not yet logged, and open questions;
   - the 300 log per establishment and year;
   - the **total recordable case rate and DART rate** per establishment, from the hours worked;
   - year-end steps (prepare, certify, post Feb 1 to Apr 30, submit by Mar 2);
   - the rules reference and settings.
8. **A Rovo agent** answers questions from the same engine. Rovo asks you to confirm before any change runs.
   - "Is this recordable? He got 3 stitches and went back to work the same day."
   - "What's our DART rate at Plant 2?"
   - "What must we report to OSHA or log this week?"
   - Actions: check recordability, get rates, get open cases, enter a case on the log, and record days away. A
     skill, *osha-week*, runs a weekly review.
9. **Sample in one click.** Load sample adds two Ohio plants and twelve reports covering the edge cases:
   - sutures (recordable) versus butterfly strips (first aid);
   - a clinic-recommended ibuprofen 800 mg dose;
   - restricted duty with a job transfer;
   - a contaminated needlestick (a privacy case);
   - a hearing STS;
   - a car crash in the company lot while commuting (not work-related);
   - a fingertip amputation with a live 24-hour clock;
   - a forklift fracture;
   - a shoulder injury past the 180-day cap;
   - two cases that need answers.

   Remove sample deletes all of it.

## The law, with citations

Every rule is in [`docs/LAW.md`](docs/LAW.md). It was read on 2026-11-25 from the eCFR text of 29 CFR Part 1904,
OSHA's recordkeeping FAQs, the current enforcement directive (CPL 02-00-172), the OSHA forms package and the ITA
file specifications. It holds 112 quotes, each checked against the source, plus edge cases and the questions the
engine asks. Two corrections to common practice are built in:
- the old fixed "prescription strength" thresholds (ibuprofen over 467 mg and so on) came from a directive that was
  cancelled in January 2025, so Recordable uses OSHA's current test: more than the single dose on the OTC label;
- the total recordable case rate uses columns H + I + J (deaths are counted separately), as the OSHA forms package
  does.

Recordable gives operational guidance from the regulation, not legal advice.

## Privacy by design

- The employee's name, job title, narrative and medical details are saved **on the Jira request** by the portal
  form. Recordable reads them only to show a panel or build a form, and never stores them.
- Forge storage holds issue keys, Atlassian account IDs, dates, codes (body part, treatment, outcome) and counts.
- Privacy concern cases show "Privacy case" on the 300 log. Names are never written into the ITA case file, and
  employee names are scrubbed from its narratives (29 CFR 1904.41(b)(9)).
- Recordable reports the account IDs it stores through Forge's personal data reporting API every week, and erases
  closed accounts.
- There is no egress, so the app is eligible for **Runs on Atlassian**.

## Architecture

```
Portal form (JSM create property panel, UI Kit) ─┐  answers saved as an issue property (stays in Jira)
                                                 ▼
avi:jira:created:issue trigger ──► rules engine (src/core/engine.js, pure, 29 CFR 1904) ──► decision + citations
                                                 │                                         + questions + clocks
Request panel (jira:issueContext + issuePanel) ◄─┤   answer questions, edit facts, report to OSHA, log the case
"Treat as injury or illness" (jira:issueAction) ─┘
Board (jira:globalPage): cases · 300 logs · rates · year-end · establishments (JSM Assets) · rules · settings
Hourly trigger: OSHA report clock, 7-day recording clock, day counts · weekly: personal data reporting
Rovo agent + 5 actions + skill ──► same engine and storage, every answer with its source
Year-end: 300 log + 300A PDFs + ITA CSVs attached to a work item (src/core/forms.js, log.js, ita.js, naics.js)
```

- `app/src/core/`: pure, deterministic and unit-tested:
  - `engine.js`: the decision;
  - `catalog.js`: the closed lists (first aid, exceptions, privacy, severe events);
  - `facts.js`: validated edits;
  - `intake.js`: portal answers and free text to facts;
  - `log.js`: the 300 log, 300A totals and rates;
  - `ita.js` and `naics.js`: electronic submission;
  - `forms.js` and `pdf.js`: the 301, 300 and 300A documents;
  - `sample.js`: the sample data.
- `app/src/`: the Forge layer:
  - `service.js`: case operations;
  - `establishments.js` and `assets.js`: JSM Assets, or the register;
  - `jira.js`: REST;
  - `triggers.js`;
  - `actions.js`: Rovo;
  - `sample.js`;
  - `resolvers/`.
- Tests: `npm test`. That runs 41 tests: the engine's edge cases plus an offline end-to-end test against a fake
  Jira/JSM site, covering setup, the sample, questions, the OSHA report, logging, the year-end package with exact
  ITA headers, the Rovo actions, the portal trigger, alerts, personal data reporting and sample removal.

## Try it

1. Install the app on a site with Jira Service Management (Assets optional). Open **Apps > Recordable**.
2. Press **Set up Recordable**. It picks a safety, HR or facilities service project, creates the "Injury or illness"
   request type, and creates the OSHA establishments schema in Assets. Then press **Load sample** (about a minute).
3. Follow **Try the sample** on the board:
   1. The amputation report: the 24-hour clock, the call checklist, and **Record the report**.
   2. The case with a missing ibuprofen dose: answer 800 mg and it becomes recordable.
   3. Sutures versus butterfly strips, the needlestick privacy case, the hearing shift, and the commuting crash.
   4. **OSHA 300 logs** tab: pick Plant 2 and **Prepare 300, 300A and ITA files**.
   5. **Rovo**: pick the Recordable agent and ask "What's our DART rate at Plant 2?"
4. Optional: to let employees report on the help center, add "Injury or illness" to a portal group in the service
   project's request type settings (Jira's API can't do this step; the board links there). Everything above works
   without it.

## Development

```
cd app
npm install
npm test
../bin/forge deploy -e development
../bin/forge install --site <your-site>.atlassian.net --product jira -e development
```

`bin/forge` runs the Forge CLI on Node 24. Licence: MIT.
