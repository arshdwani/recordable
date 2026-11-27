---
name: osha-week
description: Review the week's OSHA recordkeeping - events that must be reported to OSHA, recordable cases not yet entered on the 300 log within 7 days, cases waiting for answers, employees still away or restricted, and each establishment's incidence rates. Use when a safety manager plans the week, asks what is at risk, or prepares a status update for plant leadership.
---

# OSHA recordkeeping weekly review

Use the Recordable actions; never guess a case, a deadline, a count or a rate.

## Tools
- `get-open-cases` (Get open cases): optional `establishment`. Returns `reportToOsha` (event, local deadline, hours
  left), `toEnterOnLog`, `needAnswers`, `stillAway`, plus a `source`.
- `get-rates` (Get incidence rates): optional `establishment` and `year`. Returns per establishment the total recordable
  case rate, DART rate, the case counts (H, I, J) and hours, plus the formula and a `source`.
- `check-recordable` (Check recordability): input `issueKey` for one case's reasons and questions.

## Steps
1. Call `get-open-cases` (with the establishment if one was named).
2. For each case in `needAnswers`, call `check-recordable` with its key to get the open questions.
3. Call `get-rates` for the current year.
4. Report in this order, one line each:
   - **Report to OSHA now**: request, event, deadline and hours left (29 CFR 1904.39).
   - **Enter on the 300 log**: request and the date it is due (7 calendar days, 29 CFR 1904.29(b)(3)).
   - **Waiting for answers**: request and the question.
   - **Still away or restricted**: request, days so far, and whether the 180-day cap is reached.
   - **Rates**: each establishment's total recordable case rate and DART rate, year to date.
5. End with one line: how many cases are open, how many must be reported, and how many are due on the log this week.

Quote the `source` returned by the actions. If an action returns an error, say what failed and stop.
