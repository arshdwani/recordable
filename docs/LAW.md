# Recordable: 29 CFR Part 1904 rules for the decision engine

Read on 2026-11-25. Regulation text is the eCFR edition "up to date as of 2026-11-20". The eCFR version history shows that Part 1904 was last changed substantively by the 2023 rule, effective 2024-01-01. The only 1904 document published in the Federal Register since then, 90 FR 28257 (2025-07-01), withdrew a proposal and did not change the rules.

Sources read for this document:
- eCFR 29 CFR Part 1904 (full XML): https://www.ecfr.gov/api/versioner/v1/full/2026-11-20/title-29.xml?part=1904. This is the same text as https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1904.
- eCFR 29 CFR 1910.95 (STS definition, Appendix F): https://www.ecfr.gov/api/versioner/v1/full/2026-11-20/title-29.xml?section=1910.95
- OSHA recordkeeping: https://www.osha.gov/recordkeeping
- Forms page https://www.osha.gov/recordkeeping/forms, which links to the forms package https://www.osha.gov/sites/default/files/OSHA-RK-Forms-Package.pdf. The package holds Forms 300, 300A and 301 (Rev. 04/2004) and their instructions.
- Severe injury reporting: https://www.osha.gov/report
- ITA: https://www.osha.gov/injuryreporting, with ITA FAQs at https://www.osha.gov/injuryreporting/faqs. The CSV and API specifications are listed in Appendix A.
- Part 1904 FAQs: https://www.osha.gov/laws-regs/interlinking/standards/1904/faq. Each answer is at https://www.osha.gov/faq/<number>, for example /faq/7-8.
- Enforcement directive CPL 02-00-172 (effective 2025-01-13): https://www.osha.gov/sites/default/files/enforcement/directives/CPL-02-00-172.pdf
- Archived directive CPL 02-00-135 (2004, cancelled by CPL 02-00-172): https://www.osha.gov/enforcement/directives/cpl-02-00-135
- Interpretations: https://www.osha.gov/laws-regs/standardinterpretations/2001-10-29 and https://www.osha.gov/laws-regs/standardinterpretations/2024-05-02
- 2001 final rule with preamble, 66 FR 5916-6135: https://www.osha.gov/laws-regs/federalregister/2001-01-19
- 2023 final rule, 88 FR 47254: https://www.govinfo.gov/content/pkg/FR-2023-07-21/html/2023-15091.htm (metadata from https://www.federalregister.gov/api/v1/documents/2023-15091.json)
- BLS: https://www.bls.gov/iif/overview/compute-nonfatal-incidence-rates.htm. The site blocks automated downloads, so this page was read through a fetch tool; see UNVERIFIED.
- Census NAICS code lists, used to check which code vintage each appendix uses: https://www.census.gov/naics/2017NAICS/2-6%20digit_2017_Codes.xlsx and https://www.census.gov/naics/2022NAICS/2-6%20digit_2022_Codes.xlsx

This is a research summary for software design, not legal advice.

**Citation key.**
- `[1904.x(...)]` is 29 CFR.
- `[FAQ n-n]` is an OSHA Part 1904 FAQ.
- `[Forms pkg p.N]` is a page of the OSHA forms package PDF.
- `[ITA 300A dict p.N]` is the Establishment and 300A CSV data dictionary; `[ITA case spec p.N]` is the Case Data CSV Specifications v1.5; `[ITA FAQ]` is the ITA FAQ page.
- `[CPL 02-00-172 §...]` is the current enforcement directive.
- `[66 FR 5916 preamble]` is the 2001 rule preamble; `[88 FR 47254]` is the 2023 rule.

Quotes are verbatim and at most 25 words, and " ... " marks an omission. The form statements in Appendix C are longer because they are printed in full: the app must reproduce them word for word. Rule IDs (for example `DA-3`) are stable handles that the engine can cite in its decision trace.

---

## Corrections to the brief

The sources take precedence over the brief. These points differ from it:

1. **1904.5 numbering.** Significant aggravation is defined in **1904.5(b)(4)**, not (b)(3). Paragraph (b)(3) covers cases where it is unclear whether the event happened in the work environment, and (b)(5) defines a pre-existing condition. [1904.5(b)(3)-(5)]
2. **1904.7 numbering.** (b)(1) lists the six criteria and **(b)(2) is death**. No paragraph of 1904.7 says "how to determine which column". The column rule (choose only the single most serious outcome, from G down to J) comes from the Form 300 instructions and FAQ 7-18. [1904.7(b)(1)-(2)] [Forms pkg p.2] [FAQ 7-18]
3. **OTC prescription-strength numbers have been withdrawn.** The thresholds were ibuprofen > 467 mg, diphenhydramine > 50 mg, naproxen sodium > 220 mg and ketoprofen > 25 mg per single dose. They appear only in the archived directive CPL 02-00-135 (FAQ 7-8, 2004), which CPL 02-00-172 cancelled effective 2025-01-13. The current FAQ 7-8 sets a different test: any single dose greater than the single dose on the OTC label is prescription strength. The engine uses the label test and keeps the old numbers only as a labelled hint. [FAQ 7-8] [CPL 02-00-135 (archived) FAQ 7-8] [CPL 02-00-172 p.1]
4. **Food poisoning from the employer's cafeteria is NOT work-related when the employee bought the food.** Only food "supplied by the employer" counts, for example a meal at a business meeting or company function, even if the employer bought that meal from the cafeteria. Food contaminated by workplace contaminants, such as lead, always counts. [1904.5(b)(2)(iv) Note] [66 FR 5916 preamble, 1904.5(b)(2)(iv)]
5. **Medical removal.** A removal is not recordable only if it happens before the standard's **"medical removal levels"** are reached. The rule does not use the "action level". [1904.9(b)(3)]
6. **Hearing loss.** The age adjustment may be used **only for the STS test, never for the 25 dB test.** [1904.10(b)(3)]
7. **ITA codes.**
   - `change_reason` is free text of up to 100 characters, not a code.
   - `treatment_facility_type` is not a facility type: it is Form 301 field 8, "treated in an emergency room?", coded 1 or 0.
   - `time_unknown` is 1 or blank.
   - The `size` codes changed in 2023 to 1, 21, 22 and 3. Code 2 is no longer valid.
   - `sex` (M or F) is optional.

   [ITA case spec p.6-7] [ITA 300A dict p.5, p.7] [ITA FAQ]
8. **EIN column name.** The 300A data dictionary calls the column `ein_number`, but OSHA's CSV template, its sample file and the API all use **`ein`**. Emit `ein`; see Appendix A. [ITA 300A dict p.4] [osha_ita_summary_data_csv_template-revised.csv]
9. **Rates.**
   - OSHA's forms package computes the total recordable case rate from Form 300A columns **H + I + J**. BLS rates are rates of *nonfatal* cases, so deaths (G) are excluded. The package also says you may instead count the Log's line entries, which would include deaths. The engine uses H+I+J and shows deaths separately.
   - OSHA calls this the "Total recordable case rate". "TRIR" is industry shorthand.

   [Forms pkg p.5] [BLS IIF]
10. **The Subpart E appendices are not all 4-digit codes.** Appendix A to Subpart E has five sector-level entries (11, 22, 23, 31-33, 42) plus 60 four-digit groups. All three appendix lists are short and are included in full in Appendix B. [App. A to Subpart E]
11. **Appendix A to Subpart B uses 2007 NAICS codes.** Some of its codes (5172, 5181, 7221, 7222) do not exist in 2017 NAICS, and 20 do not exist in 2022 NAICS. Establishments in those industries remain exempt. [FAQ 2-3] [FAQ 2-4]
12. **There is no single "case-closing rule".** Two rules cover it. Under 1904.7(b)(3)(viii) you may stop counting when the employee leaves for reasons unrelated to the injury, and you must estimate the days if the employee leaves because of it. Under 1904.7(b)(3)(ix) the case is recorded once, with an estimate at year end that is updated later. [1904.7(b)(3)(viii)-(ix)]
13. **§1904.12 does not appear in the current eCFR.** 1904.4(a)(3) still refers to "1904.8 through 1904.12", but the specific-case rules are 1904.8 to 1904.11, and there is no MSD rule or 300-Log MSD column. OSHA withdrew the MSD-column proposal in 2025. [1904.4(a)(3)] [90 FR 28257]

---

## 1. Scope, recording criteria, partial exemptions (1904.1, 1904.2, 1904.4)

- **SC-1** Record a case only if all three conditions hold: it is work-related, it is a new case, and it meets the general criteria of 1904.7 or a specific-case rule in 1904.8-1904.11. [1904.4(a)]
  Quote: "Meets one or more of the general recording criteria of § 1904.7 or the application to specific cases of §§ 1904.8 through 1904.12."
- **SC-2** An employee's report does not by itself establish that an injury or illness occurred. The employer decides, and may refer the employee to a health care professional (HCP) for evaluation. [FAQ 4-1]
  Quote: "the employer must first decide whether an injury or illness, as defined by the rule, has occurred."
- **SC-3** An injury or illness is any abnormal condition or disorder. [1904.46]
  Quote: "An injury or illness is an abnormal condition or disorder."
- **SC-4** The size exemption depends on the whole company's peak employment. If the company never had more than 10 employees at any time in the last calendar year, it keeps no records unless OSHA or BLS asks in writing. [1904.1(a)(1), (b)(1)-(2)]
  Quote: "If your company had 10 or fewer employees at all times during the last calendar year, you do not need to keep OSHA ... records"
- **SC-5** The industry exemption applies per establishment. An establishment whose NAICS code is in Non-Mandatory Appendix A to Subpart B is partially exempt, while other establishments of the same company may still have to keep records. [1904.2(a)(1)-(2), (b)(1)]
  Quote: "The partial industry classification exemption applies to individual business establishments."
- **SC-6** Neither exemption covers reporting under 1904.39. [1904.1(a)(1)] [1904.2(a)(1)]
  Quote: "all employers must report to OSHA any workplace incident that results in an employee's fatality, in-patient hospitalization, amputation, or loss of an eye"
- **SC-7** A partially exempt employer must keep records if OSHA or BLS informs it in writing (1904.41 or 1904.42). [1904.1(a)(1)] [1904.42(b)(3)]
- **SC-8** The exempt-industry list is **Non-Mandatory Appendix A to Subpart B of Part 1904**, with 82 four-digit codes; the full list is in Appendix B.1 below. Examples:
  - 5112 Software Publishers
  - 5182 Data Processing, Hosting, and Related Services
  - 5415 Computer Systems Design and Related Services
  - 5411 Legal Services
  - 5221 Depository Credit Intermediation
  - 6211 Offices of Physicians
  - 7221 Full-Service Restaurants

  Many JSM customers fall in 5112, 5182 or 5415. The list uses 2007 NAICS codes, and an establishment stays exempt even if its code has no 2017 or 2022 equivalent. [App. A to Subpart B] [FAQ 2-3] [FAQ 2-4]
  Quote: "it is partially exempt for OSHA's recordkeeping requirements, even if a corresponding 2017 or 2022 code does not exist."

## 2. Work-relatedness (1904.5)

- **WR-1** A case is work-related if an event or exposure in the work environment caused or contributed to it, or significantly aggravated a pre-existing condition. Work-relatedness is presumed for events in the work environment unless a (b)(2) exception applies. [1904.5(a)]
  Quote: "Work-relatedness is presumed for injuries and illnesses resulting from events or exposures occurring in the work environment, unless an exception in § 1904.5(b)(2) specifically applies."
- **WR-2** The work environment is the establishment plus any other location where employees work or are present as a condition of employment. It also includes the equipment and materials they use. [1904.5(b)(1)]
  Quote: "the establishment and other locations where one or more employees are working or are present as a condition of their employment."
- **WR-3** Work need not be the main cause: any contribution makes the case work-related. [FAQ 10-4]
  Quote: "It is not necessary for work to be the sole cause, or the predominant cause, or even a substantial cause"
- **WR-4** Whether the employee had clocked in does not matter. An injury after hours from an event at work is still work-related. [FAQ 5-11] [FAQ 5-6]
  Quote: "Punching in and out with a time clock (or signing in and out) does not affect the outcome for determining work-relatedness."
- **WR-5** Where it is not obvious whether the event happened at work, evaluate the employee's duties and environment. [1904.5(b)(3)]

**Exceptions.** The engine applies an exception only if its facts match exactly. Most exceptions say "solely". [1904.5(b)(2)]
- **EX-1** The employee was present as a member of the general public. [1904.5(b)(2)(i)]
  Quote: "the employee was present in the work environment as a member of the general public rather than as an employee."
- **EX-2** Symptoms surface at work but come solely from a non-work event outside the work environment. Example: an epileptic seizure, and a broken arm caused solely by the seizure, are both not recordable. [1904.5(b)(2)(ii)] [FAQ 5-8]
  Quote: "signs or symptoms that surface at work but result solely from a non-work-related event or exposure that occurs outside the work environment."
- **EX-3** Voluntary participation in a wellness program, or in a medical, fitness or recreational activity (blood donation, physical exam, flu shot, exercise class, racquetball, baseball). The exception does not apply if the activity is a condition of work. [1904.5(b)(2)(iii)] [66 FR 5916 preamble, 1904.5(b)(2)(iii)]
  Quote: "results solely from voluntary participation in a wellness program or in a medical, fitness, or recreational activity"
- **EX-4** The case results solely from eating, drinking, or preparing food or drink for personal consumption, whether the food was bought on the premises or brought in. Examples: choking on a sandwich, or a burn from spilled hot coffee. [1904.5(b)(2)(iv)] [66 FR 5916 preamble, §1904.46 discussion]
  Quote: "solely the result of an employee eating, drinking, or preparing food or drink for personal consumption (whether bought on the employer's premises or brought in)."
  - **EX-4a** These cases are back in scope (work-related): illness from food contaminated by workplace contaminants such as lead; food poisoning from food *supplied by the employer*; and a trip or fall caused by a hazard in the lunchroom. [1904.5(b)(2)(iv) Note] [66 FR 5916 preamble, 1904.5(b)(2)(iv)]
    Quote: "gets food poisoning from food supplied by the employer, the case would be considered work-related."
    Quote: "if the employee was injured by a trip or fall hazard present in the employer's lunchroom, the case would be considered work-related."
  - **EX-4b** Food that the employee buys in the company cafeteria is not employer-supplied. Food that the employer buys from the cafeteria for a meeting or company function is. [66 FR 5916 preamble, 1904.5(b)(2)(iv)]
    Quote: "Food provided or supplied by the employer does not include food purchased by the employee from the company cafeteria"
- **EX-5** A personal task, unrelated to the job, done at the establishment outside the employee's assigned working hours. Both conditions must hold. "Assigned working hours" means the hours the employee is actually expected to work, including overtime. [1904.5(b)(2)(v)] [FAQ 5-4] [FAQ 5-5]
  Quote: "solely the result of an employee doing personal tasks (unrelated to their employment) at the establishment outside of the employee's assigned working hours."
- **EX-6** Personal grooming, self-medication for a non-work condition, or an intentionally self-inflicted injury. Showering at work to remove a workplace contaminant is not grooming. [1904.5(b)(2)(vi)] [FAQ 5-3]
  Quote: "solely the result of personal grooming, self medication for a non-work-related condition, or is intentionally self-inflicted."
- **EX-7** A motor vehicle accident on a company parking lot or company access road while the employee is commuting. [1904.5(b)(2)(vii)]
  - A company lot is one where the employer can limit access. A shared or public lot is not a company lot. [FAQ 5-10]
  - A pedestrian struck by a commuting co-worker's car falls under the exception, so neither employee's case is work-related. [FAQ 5-9]
  - Maintenance staff cleaning the lot are working, so their injuries are work-related. [FAQ 5-1]
  - Leaving the property to buy supplies for the employer is work-related. [66 FR 5916 preamble, 1904.5(b)(2)(vii)]

  Quote: "occurs on a company parking lot or company access road while the employee is commuting to or from work."
- **EX-8** The common cold or flu. Contagious diseases such as TB, brucellosis, hepatitis A or plague ARE work-related if the employee was infected at work. [1904.5(b)(2)(viii)]
  Quote: "The illness is the common cold or flu"
- **EX-9** A mental illness, unless the employee voluntarily gives the employer a physician's or other licensed HCP's opinion that it is work-related. Work stress that contributes counts once such an opinion is provided. [1904.5(b)(2)(ix)] [FAQ 5-12]
  Quote: "unless the employee voluntarily provides the employer with an opinion from a physician or other licensed health care professional"

**Aggravation, pre-existing conditions, travel and home work**
- **WR-6** Significant aggravation is defined in (b)(4). A pre-existing condition is significantly aggravated when the work event or exposure causes any one of the following:
  - (i) death or (ii) loss of consciousness that would likely not have happened but for the work event;
  - (iii) one or more days away, restricted or transferred that otherwise would not have occurred;
  - (iv) medical treatment where none was needed before, or a change in treatment.

  [1904.5(b)(4)(i)-(iv)]
  Quote: "Medical treatment in a case where no medical treatment was needed for the injury or illness before the workplace event or exposure"
- **WR-7** A pre-existing condition is one that resulted solely from a non-work event outside the work environment. [1904.5(b)(5)]
- **WR-8** On travel status, a case is work-related if the employee was working "in the interest of the employer". That includes travel to customers, job tasks, and entertainment done at the employer's direction. [1904.5(b)(6)]
  - After checking into a hotel ("home away from home"), judge activities as for a non-traveling employee.
  - Commuting from the temporary residence to a fixed worksite is not work-related.
  - Personal detours are not work-related.

  [1904.5(b)(6)(i)-(ii)]
  Quote: "When the employee checks into the temporary residence, he or she is considered to have left the work environment."
- **WR-9** Working at home is work-related only when the employee is doing paid work and the injury is directly related to that work, not to the home setting. Examples: dropping a box of work files on a foot is work-related; tripping on the family dog or faulty home wiring is not. Voluntarily taking work home, unpaid, is not covered. [1904.5(b)(7)] [FAQ 5-7]
  Quote: "directly related to the performance of work rather than to the general home environment or setting."
- **WR-10 (DERIVED)** Ordinary commuting on public roads happens outside the work environment, so no presumption arises. This follows from WR-2 and from the hotel-commute rule in (b)(6)(i). An errand for the employer is work-related. [1904.5(b)(1)] [1904.5(b)(6)(i)] [66 FR 5916 preamble, 1904.5(b)(2)(vii)]
  Quote: "if an employee was injured in a car accident while leaving the property to purchase supplies for the employer, the case would be work-related."

## 3. New cases (1904.6)

- **NC-1** A case is new in either of two situations [1904.6(a)(1)-(2)]:
  - (a) the employee has no previously recorded injury or illness of the same type affecting the same body part; or
  - (b) the employee had one but recovered completely, and a work event or exposure made the signs or symptoms reappear.

  Quote: "had recovered completely (all signs and symptoms had disappeared) from the previous injury or illness"
- **NC-2** Chronic occupational illnesses whose signs recur without new exposure are recorded once. Examples: occupational cancer, asbestosis, byssinosis, silicosis. [1904.6(b)(1)]
- **NC-3** An episode caused by a new workplace event or exposure is a new case, for example an episode of occupational asthma. [1904.6(b)(2)]
- **NC-4** Consulting a physician or other licensed HCP is optional. If you consult one, follow the recommendation. If two disagree, record on the most authoritative recommendation. [1904.6(b)(3)]
  Quote: "if you do seek such advice, you must follow the physician or other licensed health care professional's recommendation"
- **NC-5** "Recovered completely" means fully healed or cured. Symptoms that vanish for a day and then return are strong evidence the employee has not healed. [FAQ 6-1]
  Quote: "disappear for a day only to reappear the following day, that is strong evidence the injury has not properly healed."
- **NC-6** If a new injury happens while the employee is on restriction for another case, stop the first count and record the new case. Resume the first count if its restriction outlasts the second case's. [FAQ 7-23]

## 4. General recording criteria (1904.7)

- **GC-1** The criteria are death, days away from work, restricted work or job transfer, medical treatment beyond first aid, loss of consciousness, or a significant injury or illness diagnosed by a physician or other licensed HCP. [1904.7(a)] [1904.7(b)(1)]
  Quote: "death, days away from work, restricted work or transfer to another job, medical treatment beyond first aid, or loss of consciousness."
- **GC-2** Mark one outcome column only, the most serious: G Death, then H Days away, then I Job transfer or restriction, then J Other recordable. When the outcome worsens, move the check. [Forms pkg p.2] [Forms pkg p.6] [FAQ 7-18]
  Quote: "Classify the seriousness of the case by recording the most serious outcome associated with the case, with column G (Death) being the most serious"
- **GC-3** For a death, check the death column and report it under 1904.39 within 8 hours.
  - A death after surgery or other complications is recordable; update the earlier entry to death.
  - Enter no day counts for a fatality.

  [1904.7(b)(2)] [FAQ 7-3] [FAQ 7-28]
  Quote: "In the case of a work-related fatality, enter a checkmark in column G (death) on the Form 300."

**Days away from work (1904.7(b)(3))**
- **DA-1** Check days away and enter calendar days. For a long absence, estimate the days and update the entry later. [1904.7(b)(3)]
  Quote: "enter an estimate of the days that the employee will be away, and update the day count when the actual number of days is known."
- **DA-2** Do not count the day of injury; start counting the next day. Count calendar days, not shifts; a shift that crosses midnight follows the calendar. [1904.7(b)(3)(i)] [FAQ 7-29]
  Quote: "you begin counting days away on the day after the injury occurred or the illness began."
- **DA-3** If a physician or other licensed HCP recommends days away and the employee works anyway, record the recommended days. Two recommendations: use the most authoritative. [1904.7(b)(3)(ii)]
  Quote: "the days away must be recorded whether the injured or ill employee follows the physician or licensed health care professional's recommendation or not."
- **DA-4** If the HCP says return to work and the employee stays home, end the count on the recommended return date. [1904.7(b)(3)(iii)]
- **DA-5** Count weekends, holidays, vacation days and other days off if the employee could not have worked them. [1904.7(b)(3)(iv)]
  Quote: "regardless of whether or not the employee was scheduled to work on those day(s)."
- **DA-6** A Friday injury with return on Monday, or an injury the day before a holiday, vacation or plant closing: record days only if an HCP says the employee should not have worked, or should have worked restricted, during the time off. [1904.7(b)(3)(v)-(vi)]
- **DA-7** Days away and restricted or transferred days may be capped at 180 calendar days combined; entering 180 is adequate. [1904.7(b)(3)(vii)] [Forms pkg p.3]
  Quote: "once the total of either or the combination of both reaches 180 days."
- **DA-8** The employee leaves the company. [1904.7(b)(3)(viii)] [FAQ 7-21] [FAQ 7-9]
  - For a reason unrelated to the injury (retirement, plant closing, another job), you may stop counting, but at least one day must have been counted.
  - Because of the injury, estimate the total days.
  - A termination after a post-accident drug test counts as related to the injury, so estimate.
- **DA-9** If the employee never returns (for example after losing an arm), check days away and estimate the recuperation days, up to 180. [FAQ 7-13]
- **DA-10** A case is recorded once, on the log for the year of injury. If the employee is still out when the summary is prepared, estimate the days and update later. [1904.7(b)(3)(ix)]

**Restricted work and job transfer (1904.7(b)(4))**
- **RW-1** Record as restricted or transfer only when there is no death and no days away. Check that box and enter the restricted or transferred days. [1904.7(b)(4)]
- **RW-2** Work is restricted when the employer keeps the employee from, or an HCP recommends against, one or more routine functions of the job, or working the full workday the employee was scheduled to work. [1904.7(b)(4)(i)(A)-(B)]
  Quote: "keep the employee from performing one or more of the routine functions of his or her job, or from working the full workday"
- **RW-3** Routine functions are work activities done at least once per week. [1904.7(b)(4)(ii)] [FAQ 7-4]
  Quote: "an employee's routine functions are those work activities the employee regularly performs at least once per week."
- **RW-4** A restriction or transfer that lasts only on the day of injury is not recorded. [1904.7(b)(4)(iii)]
  Quote: "impose the restriction or transfer only for the day on which the injury occurred or the illness began."
- **RW-5** A recommended restriction is recordable only if it affects routine functions or the full workday. [1904.7(b)(4)(iv)]
- **RW-6** A partial day of work counts as a restricted day, except on the day of injury. A cut from 10 scheduled hours to 8 is a restriction. [1904.7(b)(4)(v)] [FAQ 7-14]
- **RW-7** Producing less while still doing all routine functions is not a restriction. [1904.7(b)(4)(vi)] [FAQ 7-4]
- **RW-8** For vague orders such as "light duty", ask the HCP two questions: can the employee do all routine functions, and work the full shift? If you cannot get answers, record a restricted case. [1904.7(b)(4)(vii)]
  Quote: "If you are unable to obtain this additional information ... record the injury or illness as a case involving restricted work."
- **RW-9** If an HCP recommends a qualifying restriction and the employee does all routine work anyway, it is still a restricted case. [1904.7(b)(4)(viii)]
- **RW-10** Assignment to another job for part of the day, excluding the day of injury, is a job transfer. It goes in the same column (I) as restriction. [1904.7(b)(4)(ix)-(x)]
- **RW-11** Count restricted or transferred days the same way as days away. [1904.7(b)(4)(xi)] [FAQ 7-12]
  - A permanent modification that removes the restricted functions lets you stop the count once it is made permanent, after at least one day.
  - "Permanent" means expected to last for the rest of the employee's career.
- **RW-12** A restriction the employer imposes to protect an injury is recordable. One exception: for minor musculoskeletal discomfort, where an HCP finds the employee fully able, a preventive restriction is not recordable under (b)(4). [CPL 02-00-172 §IX.E.8.a] [FAQ 7-19]
- **RW-13** The HCP recommends restriction but none is available and the employee is sent home: count days away. The employee chooses to stay home instead of doing available restricted work: count restricted days. [CPL 02-00-172 §IX.E.8.b]
- **RW-14** A case with both days away and restricted days gets both totals entered, with column H checked. If restriction reaches 180 days and days away follow, switch the check to H. [Forms pkg p.3] [FAQ 7-18]
  Quote: "involved both days away from work and days of restricted work activity, enter the total number of days for each."

**Medical treatment (1904.7(b)(5))**
- **MT-1** Medical treatment beyond first aid, with no death, days away or restriction, goes in column J (Other recordable cases). [1904.7(b)(5)]
- **MT-2** Medical treatment is defined below. It does NOT include: [1904.7(b)(5)(i)(A)-(C)] [FAQ 7-27]
  - (A) visits solely for observation or counseling;
  - (B) diagnostic procedures, such as x-rays and blood tests, including prescription drugs used solely for diagnosis (for example pupil-dilating eye drops);
  - (C) first aid.

  Quote: "the management and care of a patient to combat disease or disorder."
- **MT-3** First aid is ONLY the following items, A to N, quoted verbatim [1904.7(b)(5)(ii)]:
  - (A) Quote: "Using a non-prescription medication at nonprescription strength". Exception, which is medical treatment: "a recommendation by a physician or other licensed health care professional to use a non-prescription medication at prescription strength is considered medical treatment"
  - (B) Quote: "Administering tetanus immunizations (other immunizations, such as Hepatitis B vaccine or rabies vaccine, are considered medical treatment)"
  - (C) Quote: "Cleaning, flushing or soaking wounds on the surface of the skin"
  - (D) Quote: "Using wound coverings such as bandages, Band-Aids™, gauze pads, etc.; or using butterfly bandages or Steri-Strips". Exception: "(other wound closing devices such as sutures, staples, etc., are considered medical treatment)"
  - (E) Quote: "Using hot or cold therapy"
  - (F) Quote: "Using any non-rigid means of support, such as elastic bandages, wraps, non-rigid back belts, etc." Exception: "(devices with rigid stays or other systems designed to immobilize parts of the body are considered medical treatment"
  - (G) Quote: "Using temporary immobilization devices while transporting an accident victim (e.g., splints, slings, neck collars, back boards, etc.)"
  - (H) Quote: "Drilling of a fingernail or toenail to relieve pressure, or draining fluid from a blister"
  - (I) Quote: "Using eye patches"
  - (J) Quote: "Removing foreign bodies from the eye using only irrigation or a cotton swab"
  - (K) Quote: "Removing splinters or foreign material from areas other than the eye by irrigation, tweezers, cotton swabs or other simple means"
  - (L) Quote: "Using finger guards". A rigid finger guard is still first aid. [FAQ 7-7]
  - (M) Quote: "Using massages (physical therapy or chiropractic treatment are considered medical treatment for recordkeeping purposes)"
  - (N) Quote: "Drinking fluids for relief of heat stress". IV fluids are medical treatment. [FAQ 7-6]
- **MT-4** The list is closed. Anything not on it is medical treatment. [1904.7(b)(5)(iii)] [CPL 02-00-172 §IX.E.10]
  Quote: "this is a complete list of all treatments considered first aid for part 1904 purposes."
- **MT-5** Who gives the treatment does not matter: first aid from a physician is still first aid. [1904.7(b)(5)(iv)]
- **MT-6** Recommended medical treatment that the employee refuses is still recordable. [1904.7(b)(5)(v)]
  Quote: "you must record the case even if the injured or ill employee does not follow the physician or other licensed health care professional's recommendation."
- **MT-7** A prescription counts as medical treatment once it is issued, whether or not it is filled or taken. [FAQ 7-10a] [LOI 2001-10-29]
  Quote: "In the case of prescription medications, OSHA considers that medical treatment is provided once a prescription is issued."
  Quote: "requiring the recording of cases in which a health care professional issues a prescription, whether that prescription is filled or not."
- **MT-8** OTC drugs at prescription strength. [FAQ 7-8] [66 FR 5916 preamble, 1904.7(b)(5)(ii)(A)]
  - Under the current test, prescription strength is a single dose greater than the single dose on the OTC label.
  - An HCP recommending an OTC drug at label strength (for example aspirin) is not medical treatment.

  Quote: "If a physician or licensed health care professional prescribes anything greater than the single dose, as is described on the over-the-counter medication label"
  Quote: "The final rule does not consider the prescribing of non-prescription medications, such as aspirin or over-the-counter skin creams, as medical treatment."
- **MT-9** Repeating a first-aid treatment does not turn it into medical treatment. Each criterion is still checked on its own, so first aid plus a restriction is recordable. [CPL 02-00-172 §IX.E.10] [Memo 2024-05-02]
  Quote: "regardless of the number of times the treatment is applied."
- **MT-10** Oxygen given only as a precaution to an employee with no symptoms is not recordable. Oxygen given for symptoms is. [FAQ 7-15]
- **MT-11** Conflicting HCP opinions given at the same time: you may record on the most authoritative only while no treatment has been given and no days have been lost. Once treatment, days away or restriction has happened, the case is recordable, and a year-end review cannot delete it. [FAQ 7-10a] [FAQ 7-10]

**Loss of consciousness and significant diagnoses**
- **LC-1** Any loss of consciousness from a work-related injury or illness is recordable, however brief. [1904.7(b)(6)]
  Quote: "regardless of the length of time the employee remains unconscious."
- **SD-1** Record at diagnosis by a physician or other licensed HCP: cancer, chronic irreversible disease, a fractured or cracked bone, or a punctured eardrum. This includes fractured or chipped teeth. The list is exhaustive. [1904.7(b)(7)] [FAQ 7-17] [CPL 02-00-172 §IX.E.11]
  Quote: "Work-related cases involving cancer, chronic irreversible disease, a fractured or cracked bone, or a punctured eardrum must always be recorded"

## 5. Needlesticks and sharps (1904.8)

- **NS-1** Record every work-related needlestick, and every cut from a sharp object, contaminated with another person's blood or other potentially infectious material (OPIM). Enter it as an injury, and do not enter the employee's name (privacy case). [1904.8(a)]
  Quote: "needlestick injuries and cuts from sharp objects that are contaminated with another person's blood or other potentially infectious material"
- **NS-2** OPIM is defined in 29 CFR 1910.1030(b). It covers human bodily fluids, tissues and organs, and materials infected with HIV or HBV. [1904.8(b)(1)]
- **NS-3** A cut from a clean object, or from a contaminant other than blood or OPIM, is recorded only if it meets 1904.7. [1904.8(b)(2)]
- **NS-4** If the employee later develops a bloodborne disease (seroconverts), update the outcome when there is death, days away, restriction or transfer. Rewrite the description and reclassify the case from injury to illness. [1904.8(b)(3)]
  Quote: "You must also update the description to identify the infectious disease and change the classification of the case from an injury to an illness."
- **NS-5** A splash or exposure without a cut is recorded as an illness only if a bloodborne illness (HIV, hepatitis B or C) is diagnosed or 1904.7 is met. [1904.8(b)(4)]

## 6. Medical removal (1904.9)

- **MR-1** Record every medical removal made under the medical surveillance requirements of an OSHA standard. [1904.9(a)]
- **MR-2** Classify it as days away or as restricted work, depending on how the employer complies. A removal caused by a chemical exposure goes in the poisoning column, M(4). [1904.9(b)(1)]
  Quote: "If the medical removal is the result of a chemical exposure, you must enter the case ... by checking the “poisoning” column."
- **MR-3** Standards with medical removal include lead, cadmium, methylene chloride, formaldehyde and benzene. The bloodborne pathogens and noise standards have none. [1904.9(b)(2)]
- **MR-4** A voluntary removal made before the standard's removal levels are reached is not recordable. [1904.9(b)(3)]
  Quote: "if the case involves voluntary medical removal before the medical removal levels required by an OSHA standard, you do not need to record the case"

## 7. Occupational hearing loss (1904.10)

- **HL-1** Record when both conditions hold in the same ear: a work-related STS in that ear, and a total hearing level of 25 dB or more above audiometric zero, averaged at 2000, 3000 and 4000 Hz. [1904.10(a)]
  Quote: "total hearing level is 25 decibels (dB) or more above audiometric zero (averaged at 2000, 3000, and 4000 Hz) in the same ear(s)"
- **HL-2** An STS is an average shift of 10 dB or more at 2000, 3000 and 4000 Hz, relative to the baseline, in either ear. [1904.10(b)(1)] [1910.95(g)(10)(i)]
  Quote: "relative to the baseline audiogram of an average of 10 dB or more at 2000, 3000, and 4000 Hz in either ear."
- **HL-3** Compare the audiogram with the baseline. After an earlier recordable loss, compare with the revised baseline, which is the one used under 1910.95. Revise the baseline only in the ear that had the STS. [1904.10(b)(2)(i)] [FAQ 10-1] [FAQ 10-2]
- **HL-4** The 25 dB test uses the absolute levels on the current audiogram. [1904.10(b)(2)(ii)]
- **HL-5** An age adjustment (Tables F-1 and F-2 of 1910.95 Appendix F) may be used for the STS test only, never for the 25 dB test. [1904.10(b)(3)]
  Quote: "You may not use an age adjustment when determining whether the employee's total hearing level is 25 dB or more above audiometric zero."
- **HL-6** Age-correction method. Appendix F is non-mandatory, but if it is used the procedure is fixed. [1910.95 App. F]
  1. For each frequency, take the correction value for the employee's age at the current audiogram and subtract the value for the age at the baseline audiogram.
  2. Subtract that difference from the current threshold.
  3. Compute the shift from the adjusted thresholds.

  Tables are by sex and are reproduced for 2, 3 and 4 kHz in Appendix D.
  Quote: "allowance may be made for the contribution of aging (presbycusis) to the change in hearing level by correcting the annual audiogram"
- **HL-7** Retesting within 30 days. [1904.10(b)(4)]
  - If the retest does not confirm the STS, do not record.
  - If it does, record within 7 calendar days of the retest.
  - If later testing shows the STS is not persistent, you may erase or line out the entry.

  Quote: "If the retest confirms the recordable STS, you must record the hearing loss illness within seven (7) calendar days of the retest."
- **HL-8** Work-relatedness follows 1904.5. A physician or other licensed HCP may find the loss not work-related, but only by applying 1904.5. [1904.10(b)(5)-(6)] [FAQ 10-4]
- **HL-9** Check the hearing loss column, M(5). [1904.10(b)(7)] [FAQ 10-3]

## 8. Tuberculosis (1904.11)

- **TB-1** Record if the employee was occupationally exposed to someone with known active TB and then develops a TB infection (positive skin test or HCP diagnosis). Check the respiratory condition column, M(3). [1904.11(a)]
  Quote: "occupationally exposed to anyone with a known case of active tuberculosis (TB), and that employee subsequently develops a tuberculosis infection"
- **TB-2** A positive skin test at a pre-employment physical is not recordable. [1904.11(b)(1)]
- **TB-3** You may line out or erase the case in any of three situations [1904.11(b)(2)(i)-(iii)]:
  - (i) the worker lives with someone diagnosed with active TB;
  - (ii) the Public Health Department identifies the worker as a contact of a non-workplace case;
  - (iii) a medical investigation shows the infection came from outside work.
- **TB-4** TB is a privacy concern case. [1904.29(b)(7)(iv)]

## 9. Forms, timing, privacy (1904.29)

- **FM-1** Use Forms 300, 300-A and 301, or equivalents. [1904.29(a)] [1904.29(b)(4)-(5)]
  - An equivalent form has the same information, is as readable, and follows the same instructions.
  - Computer records are fine if they can produce equivalent forms on demand.
- **FM-2** Enter each case on the 300 and the 301 within 7 calendar days of learning that it is recordable. [1904.29(b)(3)] [Forms pkg p.10]
  Quote: "within seven (7) calendar days of receiving information that a recordable injury or illness has occurred."
- **FM-3** Complete a 301 for every case on the 300. [1904.29(b)(2)]
- **FM-4** For a privacy concern case, do not enter the name. Write "privacy case" instead, and keep a separate confidential list of case numbers and names. [1904.29(b)(6)]
  Quote: "enter “privacy case” in the space normally used for the employee's name."
- **FM-5** The privacy concern cases are a closed list, and the employer decides whether a case is one: [1904.29(b)(7)(i)-(vi)] [1904.29(b)(8)] [FAQ 29-2]
  - (i) an injury or illness to an intimate body part or the reproductive system;
  - (ii) an injury or illness resulting from sexual assault;
  - (iii) mental illnesses;
  - (iv) HIV infection, hepatitis or TB;
  - (v) needlesticks or sharps cuts contaminated with another person's blood or OPIM;
  - (vi) other **illnesses** (not injuries), if the employee voluntarily asks for the name to be left off.

  Quote: "Other illnesses, if the employee voluntarily requests that his or her name not be entered on the log."
- **FM-6** If the case could still identify the employee, describe it with discretion. Give enough to show the cause and general severity, for example "injury from assault" or "lower abdominal injury". In unusual cases the job title, date and location may also be left blank. [1904.29(b)(9)] [FAQ 29-3]
- **FM-7** Voluntary disclosure to anyone other than the government, employees, former employees or authorized representatives requires removing names and personal identifiers. Three exceptions [1904.29(b)(10)(i)-(iii)]:
  - (i) the employer's safety auditor or consultant;
  - (ii) processing workers' compensation or insurance claims;
  - (iii) a public health authority or law enforcement, under 45 CFR 164.512.
- **FM-8** If the date of onset is unknown, record on the log for the year the case was reported or treated. A case discovered after the employee leaves is still recordable during the 5-year retention period, on the log for the year of injury or the last date of employment. [FAQ 29-5] [FAQ 7-20]
- **FM-9** To choose between injury and an illness category, use the examples in the Forms package, otherwise the closest fit (definitions in Appendix C.4). [FAQ 29-1] [Forms pkg p.3-4]

## 10. Establishments and covered employees (1904.30, 1904.31, 1904.34, 1904.46)

- **ES-1** Keep a separate 300 Log for each establishment expected to operate for one year or longer. [1904.30(a)]
  Quote: "You must keep a separate OSHA 300 Log for each establishment that is expected to be in operation for one year or longer."
- **ES-2** Short-term establishments still keep records, but they may share one log, which may cover a division or region. [1904.30(b)(1)]
- **ES-3** Records may be kept centrally if case information reaches the central location within 7 calendar days and the records can be produced within the 1904.35 and 1904.40 deadlines. [1904.30(b)(2)]
- **ES-4** Link every employee to one establishment. [1904.30(b)(3)-(4)]
  - An injury at another of the employer's establishments goes on that establishment's log.
  - An injury away from all establishments goes on the log of the employee's home establishment.
- **ES-5** An establishment is a single physical location; for dispersed work, it is the base office. [1904.46]
  - Two businesses at one location may be split only if all 4 tests in 1904.46(1) are met.
  - Separate locations may be combined only if all 3 tests in 1904.46(2) are met.
  - A telecommuter's home is not an establishment.
- **CE-1** Record cases for all employees on the payroll, and for non-payroll workers that you supervise day-to-day. Sole proprietors and partners are not employees, and self-employed people are not covered. [1904.31(a)] [1904.31(b)(1)]
  Quote: "whether they are labor, executive, hourly, salary, part-time, seasonal, or migrant workers."
- **CE-2** Temporary and leased workers: whoever supervises them day-to-day records the case, and each case is recorded only once. [1904.31(b)(2)-(4)] [FAQ 31-1]
  Quote: "the employer supervises the details, means, methods and processes by which the work is to be accomplished."
- **CE-3** When ownership changes, each owner records its own period. The prior owner's records transfer to the new owner, who keeps them but need not correct them. [1904.34]

## 11. Annual summary, retention, employee access (1904.32, 1904.33, 1904.35)

- **AS-1** At year end, review the log, create the summary, certify it and post it. [1904.32(a)]
- **AS-2** Total the columns (enter zeros if there were no cases). Enter the calendar year, company name, establishment name and address, annual average employees, and total hours worked. [1904.32(b)(2)(i)-(ii)]
  The paper 300A has no company-name box, so the app's equivalent form adds one.
- **AS-3** An equivalent 300A must include the employee access and employer penalty statements. The text is in Appendix C.2. [1904.32(b)(2)(iii)] [FAQ 32-4]
- **AS-4** A company executive certifies the summary. That must be one of: [1904.32(b)(3)-(4)]
  - an owner (sole proprietorship or partnership only);
  - a corporate officer;
  - the highest-ranking company official at the establishment;
  - that official's immediate supervisor.

  Quote: "reasonably believes, based on his or her knowledge of the process by which the information was recorded, that the annual summary is correct and complete."
- **AS-5** Post the summary at each establishment, in a conspicuous place and unaltered, by February 1 of the following year, and keep it up until April 30. [1904.32(b)(5)-(6)] [FAQ 32-2] [FAQ 32-3]
  - Posting it electronically does not satisfy the rule.
  - Posting is required even with zero cases.

  Quote: "no later than February 1 of the year following the year covered by the records and keep the posting in place until April 30."
- **AS-6** Hours worked include salaried, hourly, part-time and seasonal employees and supervised temps. Exclude vacation, sick leave, holidays and any other non-work time, even if it was paid. [FAQ 32-1] [Forms pkg p.9]
- **AS-7** Annual average employees: add the number paid in each pay period, divide by the number of pay periods, and round up to the next whole number. For example, 830 ÷ 26 = 31.92, which rounds to 32. Total hours are also rounded up. [Forms pkg p.9]
- **RT-1** Keep the 300 Log, the privacy case list, the 300A and the 301s for 5 years after the end of the year they cover. [1904.33(a)]
  Quote: "for five (5) years following the end of the calendar year that these records cover."
- **RT-2** During those 5 years, update stored 300 Logs with newly discovered cases and changes in classification, lining out the old entry. Updating the 300A and 301 is optional. [1904.33(b)(1)-(3)]
- **EA-1** Employees must be told how to report injuries, the procedure must not deter reporting, and employees must be told of their right to report and of the ban on retaliation. [1904.35(a)] [1904.35(b)(1)(i)-(iv)] [1904.36]
- **EA-2** Give a 300 Log copy to an employee, former employee, personal representative or authorized employee representative by the end of the next business day. Names stay on, except for privacy cases. [1904.35(b)(2)(iii)-(iv)]
  Quote: "you must give the requester a copy of the relevant OSHA 300 Log(s) by the end of the next business day."
- **EA-3** Access to the 301. [1904.35(b)(2)(v)(A)-(B)]
  - The employee, former employee or personal representative gets that employee's own 301 by the end of the next business day.
  - An authorized employee representative (a union) gets 301s for the establishment within 7 calendar days, limited to the "Tell us about the case" section.
  - The current 301 has no section with that title; see UNVERIFIED.
- **EA-4** The first copy is free; additional copies may carry a reasonable charge. [1904.35(b)(2)(vi)]
- **EA-5** An authorized employee representative is a collective bargaining agent. A personal representative is someone the employee designates in writing, or the legal representative of a deceased or incapacitated employee. [1904.35(b)(2)(i)-(ii)]

## 12. Reporting to OSHA (1904.39)

- **RP-1** Report a fatality within 8 hours after the death. [1904.39(a)(1)]
  Quote: "Within eight (8) hours after the death of any employee as a result of a work-related incident, you must report the fatality"
- **RP-2** Report an in-patient hospitalization, an amputation or a loss of an eye within 24 hours after it happens. [1904.39(a)(2)]
- **RP-3** Reporting windows from the incident: a death must occur within 30 days of it, and a hospitalization, amputation or eye loss within 24 hours of it. Outside those windows the event is not reportable but is still recordable. [1904.39(b)(6)] [FAQ 39-1]
  Quote: "You must only report a fatality to OSHA if the fatality occurs within thirty (30) days of the work-related incident."
- **RP-4** If the employer learns of the event late, or learns late that it was work-related, the 8 or 24 hours run from when the employer or its agent learns. [1904.39(b)(7)-(8)]
- **RP-5** How to report: [1904.39(a)(3)] [1904.39(b)(1)] [osha.gov/report]
  - by phone or in person to the nearest OSHA Area Office;
  - on 1-800-321-OSHA (1-800-321-6742);
  - online with the reporting application on osha.gov. The "Report online" link on osha.gov/report goes to https://www.osha.gov/form/ser.

  When the Area Office is closed, use the 800 number or the online form only: no voicemail, fax or email.
- **RP-6** OSHA requires eight items: [1904.39(b)(2)(i)-(viii)]
  - (i) establishment name;
  - (ii) location of the incident;
  - (iii) time of the incident;
  - (iv) type of event (fatality, in-patient hospitalization, amputation or loss of an eye);
  - (v) number of employees affected;
  - (vi) their names;
  - (vii) contact person and phone number;
  - (viii) a brief description.
- **RP-7** These events are not reported, though they are still recorded [1904.39(b)(3), (b)(4), (b)(10)] [FAQ 39-2]:
  - a motor vehicle accident on a public street or highway, unless it happened in a construction work zone (defined in FAQ 39-2);
  - an event on a commercial or public transportation system (plane, train, subway, bus);
  - a hospitalization only for observation or diagnostic testing.

  Quote: "you do not have to report an in-patient hospitalization that involves only observation or diagnostic testing."
- **RP-8** Heart attacks are reportable. [1904.39(b)(5)]
  Quote: "Yes, your local OSHA Area Office director will decide whether to investigate the event, depending on the circumstances of the heart attack."
- **RP-9** In-patient hospitalization means a formal admission to the in-patient service for care or treatment. [1904.39(b)(9)] [FAQ 39-6] [FAQ 39-8] [FAQ 39-10] [FAQ 39-11] [osha.gov/report]
  - An emergency room visit alone is not one.
  - The hospital decides whether there was an admission.
  - An overnight stay is irrelevant.
  - Any treatment counts, even first aid.

  Quote: "a formal admission to the in-patient service of a hospital or clinic for care or treatment."
- **RP-10** Amputation includes: [1904.39(b)(11)]
  - fingertip losses, with or without bone loss;
  - medical amputations resulting from irreparable damage;
  - body parts that were later reattached.

  It excludes avulsions, enucleations, deglovings, scalpings, severed ears, and broken or chipped teeth.
- **RP-11** Loss of an eye means physical removal (enucleation or evisceration). Loss of sight alone is not reportable unless it leads to an in-patient admission within 24 hours. [FAQ 39-3] [FAQ 39-4]
- **RP-12** For a temporary worker, the employer that supervises day-to-day makes the report. Every employer under OSHA jurisdiction must report, including partially exempt ones. [osha.gov/report]

## 13. Providing records to the government (1904.40)

- **GV-1** Give copies to an authorized government representative within 4 business hours of the request. [1904.40(a)] [1904.40(b)(1)-(2)]
  - Authorized representatives are DOL inspectors or investigators, HHS or NIOSH under section 20(b), and State Plan agencies.
  - The business hours may be those of the location where the records are kept.

  Quote: "you must provide copies of the records within four (4) business hours."

## 14. Electronic submission (1904.41)

- **EL-1** An establishment with 20-249 employees at any time in the previous calendar year, in an industry listed in Appendix A to Subpart E, submits 300A data. [1904.41(a)(1)(i)]
- **EL-2** An establishment with 250 or more employees at any time in the previous year that must keep records submits 300A data. "Must keep records" means it is not partially exempt. [1904.41(a)(1)(ii)] [ITA FAQ]
  Quote: "If your establishment had 250 or more employees at any time during the previous calendar year, and this part requires your establishment to keep records"
- **EL-3** An establishment with 100 or more employees at any time in the previous year, in an Appendix B industry, submits 300 and 301 data in addition to 300A data. [1904.41(a)(2)] [1904.41(b)(1)] [ITA FAQ]
- **EL-4** Size is the establishment's peak employment, not the firm's. Each individual counts as one person, whether full-time, part-time, seasonal or temporary. Industry is also judged per establishment. [1904.41(b)(2)] [ITA FAQ]
  Quote: "each individual employed in the establishment at any time during the calendar year counts as one employee"
- **EL-5** When OSHA notifies an employer, it submits whatever OSHA requests. Each submitting establishment provides its EIN. [1904.41(a)(3)-(4)]
- **EL-6** Partially exempt establishments make no routine submission. State Plan states are included. A corporate office may submit for its establishments. [1904.41(b)(6)-(8)]
- **EL-7** Do not submit: [1904.41(b)(9)(i)-(ii)] [ITA FAQ] [ITA case spec p.4]
  - Form 300 column B (employee name);
  - Form 301 field 1 (name), field 2 (address), field 6 (physician or HCP name) and field 7 (treatment facility name and address).

  Also strip names, SSNs, phone numbers, addresses, emails and provider details from narrative fields.
- **EL-8** The establishment name may be a code, but the submission must include a legal company name. [1904.41(b)(10)] [88 FR 47254]
  Quote: "the submission must include a legal company name, either as part of the establishment name or separately as the company name."
- **EL-9** The deadline is March 2 of the year after the year covered. [1904.41(c)] [ITA FAQ]
  - The window opens on January 2.
  - Late submissions are accepted through December 31.
  - With zero cases, the 300A is still required but 300/301 data is not.

  Quote: "by March 2 of the year after the calendar year covered by the form(s)"
- **EL-10** The 2023 rule (88 FR 47254) was published 2023-07-21 and took effect 2024-01-01. Its first 300/301 deadline was March 2, 2024, for 2023 data. [88 FR 47254]
  Quote: "because this final rule becomes effective on January 1, 2024, OSHA intends for March 2, 2024 to be the first submission deadline"
- **EL-11** The ITA will not process 300/301 data until the 300A for that establishment has been processed, and the establishment names must match exactly. [ITA FAQ] [ITA case spec p.5]
- **EL-12** The ITA requires a 6-digit 2012, 2017 or 2022 NAICS code. The ITA FAQ says Appendix B is "based on 2012 NAICS codes" and that later recoding "does not change its reporting status". Every code in both Subpart E appendices exists in 2017 NAICS, but some do not exist in 2022 NAICS; see Appendix B. [ITA 300A dict p.5] [ITA FAQ]
- **EL-13** Where the appendices live: **Appendix A to Subpart E of Part 1904** (65 entries) and **Appendix B to Subpart E of Part 1904** (104 entries). Both are reproduced in full in Appendix B.2 and B.3.
  - Appendix A examples: 23 Construction; 31-33 Manufacturing; 4451 Grocery Stores; 4841 General Freight Trucking; 4931 Warehousing and Storage; 6221 General Medical and Surgical Hospitals; 6231 Nursing Care Facilities; 7211 Traveler Accommodation.
  - Appendix B examples: 2381 Foundation, Structure, and Building Exterior Contractors; 3116 Animal Slaughtering and Processing; 3361 Motor Vehicle Manufacturing; 4441 Building Material and Supplies Dealers; 4841 General Freight Trucking; 4931 Warehousing and Storage; 6221 General Medical and Surgical Hospitals; 6231 Nursing Care Facilities.

  [App. A to Subpart E] [App. B to Subpart E]

## 15. ITA CSV formats

The full headers, in order, with codes and validations, are in **Appendix A**. In summary:

- **CSV-1** The 300A file (with establishment data) has 28 columns, starting with `establishment_name,ein,company_name,...` and ending with `change_reason`. Its source is OSHA's template `osha_ita_summary_data_csv_template-revised.csv` and its data dictionary. [ITA 300A dict p.4-7]
- **CSV-2** The 300/301 case file has 24 columns, starting with `establishment_name,year_of_filing,case_number,...` and ending with `date_of_death`. Its source is the template `ita_template_form_300-301_csv_data.csv` and the Case Data CSV Specifications v1.5 (2025-01-29). [ITA case spec p.5-7]
- **CSV-3** The first row is the header row. Each later row is one establishment (300A file) or one case (case file). Values containing commas or quotes must be quoted. Numbers must be whole numbers with no commas. Keep leading zeros in ZIP and EIN. [ITA 300A dict p.1-2, p.4] [ITA case spec p.5] [ITA FAQ]
- **CSV-4** OSHA offers a test sandbox at https://preview.osha.gov/injuryreporting/ita, which validates files but does not count as a submission. [ITA 300A dict p.2]

## 16. Incidence rates

- **RATE-1** Total recordable case rate = (H + I + J) × 200,000 ÷ total hours worked by all employees. H, I and J are the Form 300A totals; deaths (G) are not included. [Forms pkg p.5] [BLS IIF]
  Quote: "Total number of injuries and illnesses X 200,000 ÷ Number of hours worked by all employees = Total recordable case rate"
- **RATE-2** DART rate = (H + I) × 200,000 ÷ total hours worked. [Forms pkg p.5] [CPL 02-00-172 §XI.A] [BLS IIF]
  Quote: "(Number of entries in column H + Number of entries in column I) X 200,000 ÷ Number of hours worked by all employees"
- **RATE-3** The 200,000 is 100 employees × 40 hours a week × 50 weeks a year. [Forms pkg p.5] [CPL 02-00-172 §XI.A] [BLS IIF]
  Quote: "represents the number of hours 100 employees working 40 hours per week, 50 weeks per year would work"
- **RATE-4** The same formula works for any single total, for example column I or M(2). Hours are hours actually worked; paid leave is excluded. [Forms pkg p.5] [BLS IIF]
- **RATE-5** CPL 02-00-172 gives a worked example: 22 cases and 645,089 hours give (22 ÷ 645,089) × 200,000 = 6.8. Use it as a test fixture. [CPL 02-00-172 §XI.A]

## 17. Forms 300, 300A, 301

The exact field lists are in **Appendix C**, taken from the Rev. 04/2004 forms in the OSHA package. In short:

- **Form 300** has a header (Year, establishment name, city, state) and columns A-F (identify and describe the case).
  - G-J are outcome circles; choose one.
  - K-L are day counts.
  - M(1)-M(6) is the case type; choose one.
- **Form 300A** has the year and establishment information (name, street, city, state, ZIP, industry description, NAICS), employment information (annual average employees, total hours), totals G-J, K-L and M(1)-M(6), and the certification block (company executive, title, phone, date).
- **Form 301** has fields 1-18 plus "Completed by", title, phone and date.

[Forms pkg p.7-10]

---

## Edge cases and how the engine decides

| # | Facts | Decision | Rule IDs and citations |
|---|---|---|---|
| E1 | Laceration closed with **sutures or staples** | Medical treatment, so recordable (column J unless a more serious outcome applies). | MT-3(D) [1904.7(b)(5)(ii)(D)] [FAQ 7-26] |
| E2 | Laceration closed with **butterfly bandages or Steri-Strips** only | First aid, so not recordable on this basis. | MT-3(D) [1904.7(b)(5)(ii)(D)] |
| E3 | **Surgical glue** (for example Dermabond) | A wound-closing device, so medical treatment and recordable. | [FAQ 7-5] |
| E4 | An HCP recommends an **OTC drug at a stated dose** | Recordable if the recommended single dose exceeds the single dose on the product label. If the label dose is unknown, ASK. The archived thresholds (ibuprofen > 467 mg, diphenhydramine > 50 mg, naproxen sodium > 220 mg, ketoprofen > 25 mg per single dose) may be shown only as a "legacy guidance" hint, never as the deciding rule. Self-treatment at label dose is first aid. | MT-8 [FAQ 7-8] [CPL 02-00-135 (archived) FAQ 7-8] [1904.7(b)(5)(ii)(A)] |
| E5 | A **prescription is written** but never filled or taken | Medical treatment, so recordable. A prescription drug used solely for diagnosis (pupil-dilating drops) is not medical treatment. | MT-7, MT-2 [FAQ 7-10a] [LOI 2001-10-29] [1904.7(b)(5)(i)(B)] |
| E6 | **Restricted duty only on the day of injury** | Not a restriction and not recordable on this basis. A restriction continuing the next day counts from that day. | RW-4, DA-2 [1904.7(b)(4)(iii)] [1904.7(b)(3)(i)] |
| E7 | **HCP recommends days away but the employee comes back** | Days-away case with the number of days recommended. If instead the employee stays home past the HCP's return date, stop at that date. | DA-3, DA-4 [1904.7(b)(3)(ii)-(iii)] |
| E8 | **Weekends or holidays inside a days-away stretch** | Count them: calendar days the employee could not work. Friday injury with return Monday: count weekend days only if an HCP says the employee could not have worked them. | DA-5, DA-6 [1904.7(b)(3)(iv)-(v)] |
| E9 | **Job transfer** to another job for part of the day (after the day of injury) | Column I, same as restriction. Count days like days away, up to 180 combined. A permanent reassignment may stop the count after at least 1 day. | RW-10, RW-11, DA-7 [1904.7(b)(4)(ix)-(xi)] [FAQ 7-12] |
| E10 | **Needlestick** from a needle contaminated with another person's blood or OPIM | Always recordable as an injury, M(1), as a privacy case. A clean needle falls back to the 1904.7 criteria. If the employee later seroconverts, update to an illness. Bloodborne diseases belong under "All other illnesses", M(6). | NS-1, NS-4, FM-5 [1904.8(a)] [1904.8(b)(3)] [1904.29(b)(7)(v)] [Forms pkg p.4] |
| E11 | **Hearing STS, with and without age adjustment** (fixture built from the Appendix F example) | Male, baseline at age 27 of 0/0/5 dB at 2/3/4 kHz; current audiogram at age 32 of 10/10/25 dB. **Raw** shifts are 10/10/20, an average of 13.3, so an STS. **Age-adjusted** (F-1 differences 1/1/3) shifts are 9/9/17, an average of 11.7, still an STS. The **25 dB test** uses unadjusted current levels: (10+10+25)/3 = 15 dB, below 25, so **NOT recordable**. Age adjustment never applies to the 25 dB test. | HL-1, HL-2, HL-5, HL-6 [1904.10(a)] [1904.10(b)(3)] [1910.95 App. F] |
| E12 | **Commuting car crash in the company lot** | Not work-related. Exception (vii) covers only motor vehicle accidents while commuting, on a lot the employer controls. A slip or fall on foot in the same lot is not a motor vehicle accident, so the presumption applies (DERIVED). | EX-7 [1904.5(b)(2)(vii)] [FAQ 5-9] [FAQ 5-10] |
| E13 | **Commuting car crash on a public road** | Not work-related, because it happens outside the work environment (DERIVED). If the employee was driving for work (an errand, travel to a customer), it is work-related and recordable. If it was also fatal or led to hospitalization, it is NOT reportable unless it happened in a construction work zone. | WR-10, WR-8, RP-7 [1904.5(b)(1)] [1904.5(b)(6)] [1904.39(b)(3)] [FAQ 39-2] |
| E14 | **Fall during the lunch break in the cafeteria** (wet floor, trip hazard) | Work-related. The food exception covers only harm solely from eating, drinking or preparing food, such as choking or spilled hot coffee. | EX-4, EX-4a [1904.5(b)(2)(iv)] [66 FR 5916 preamble, 1904.5(b)(2)(iv)] |
| E15 | **Food poisoning from employer cafeteria food** | If the employee bought the food, not work-related. If the employer provided it (meeting or company function, even if bought from the cafeteria), work-related. If the food was contaminated by a workplace contaminant, work-related. | EX-4a, EX-4b [1904.5(b)(2)(iv) Note] [66 FR 5916 preamble, 1904.5(b)(2)(iv)] |
| E16 | **Death 31 days after the incident** | Not reportable, because of the 30-day limit. Still recordable: update the existing entry to Death, column G, line out the day counts, and complete 301 field 18. If the death occurred within 30 days, report within 8 hours of the death or of learning of it. | RP-3, RP-4, GC-3 [1904.39(b)(6)] [FAQ 39-1] [FAQ 7-3] [FAQ 7-28] [1904.33(b)(1)] |
| E17 | **Hospital admission for observation or tests only** | Not reportable. Recordable only if another criterion applies; an observation visit is not medical treatment. An ER visit without admission is not reportable. An admission where only first aid was given IS reportable. | RP-7, RP-9, MT-2 [1904.39(b)(10)] [FAQ 39-6] [FAQ 39-11] [1904.7(b)(5)(i)(A)] |
| E18 | Mental illness | Not work-related unless the employee voluntarily gives a PLHCP opinion. If it is recorded, it is a privacy case. | EX-9, FM-5 [1904.5(b)(2)(ix)] [1904.29(b)(7)(iii)] |
| E19 | Cold or flu, compared with TB, hepatitis A, brucellosis or plague caught at work | Cold or flu is never work-related. The listed contagious diseases are work-related if the employee was infected at work. TB has its own rule (TB-1 to TB-3). | EX-8, TB-1 [1904.5(b)(2)(viii)] [1904.11] |
| E20 | Chipped or broken tooth | A significant injury, recordable when diagnosed by an HCP. Not an "amputation" for reporting. | SD-1, RP-10 [FAQ 7-17] [1904.39(b)(11)] |
| E21 | Splint or sling | Used only while transporting the victim: first aid. A rigid device to immobilize the body part: medical treatment. A rigid finger guard: first aid. | MT-3(F), (G), (L) [1904.7(b)(5)(ii)(F)-(G)] [FAQ 7-7] |
| E22 | Two HCPs disagree | Use the most authoritative only while no treatment has been given and no days have been lost. After that the case is recordable and cannot be deleted later. | MT-11 [FAQ 7-10a] [FAQ 7-10] |
| E23 | Recurrence before full recovery, same body part and same type | Not a new case: update the original entry if the outcome worsens. After full recovery plus a new work event, it is a new case. | NC-1, NC-5, RT-2 [1904.6(a)] [FAQ 6-1] [1904.33(b)(1)] |
| E24 | Fired after a post-accident drug test while on days away | Termination counts as related to the injury, so estimate the full days away. | DA-8 [FAQ 7-9] |
| E25 | Telecommuter injury at home | Recordable only if the employee was doing paid work and the injury is directly related to the work, not to the house. | WR-9 [1904.5(b)(7)] [FAQ 5-7] |
| E26 | Precautionary oxygen after a chemical exposure, no symptoms | Not recordable. With symptoms, recordable. | MT-10 [FAQ 7-15] |
| E27 | Positive TB skin test at a pre-employment physical | Not recordable. | TB-2 [1904.11(b)(1)] |

---

## What the engine must ASK rather than guess

Ask the user when any of these facts is unknown. Each question names the rule that needs the answer.

**Work-relatedness**
1. Was the person present as an employee or as a member of the public? (EX-1)
2. Did the symptoms come *solely* from a non-work event outside work, such as a personal medical condition? (EX-2, WR-7)
3. Was the wellness, fitness or recreational activity voluntary, or a condition of work? (EX-3)
4. Food cases: Was the harm solely from eating or drinking? Who supplied the food: the employee (including cafeteria purchases) or the employer? Was any workplace contaminant involved? (EX-4, EX-4a, EX-4b)
5. Was the employee doing a personal task, and was it outside the hours they were expected to work, including overtime? (EX-5)
6. Parking lot: Was a motor vehicle involved, was the employee commuting, and does the employer control access to the lot? (EX-7, FAQ 5-10)
7. Travel: Had the employee checked into lodging? Were they on a personal detour, or doing something at the employer's direction? (WR-8)
8. Home work: Was it paid work, and was the injury caused by the work itself or by the home? (WR-9)
9. Mental illness: Did the employee voluntarily provide an opinion from a qualified HCP? (EX-9)
10. Pre-existing condition: Did the work event cause death, loss of consciousness, days away or restriction, or new or changed medical treatment that would not otherwise have occurred? (WR-6)

**New case**
11. Was there a previously *recorded* case of the same type and body part? Had the employee fully recovered from it? Did an HCP give an opinion? (NC-1, NC-4, NC-5)

**Treatment and diagnosis**
12. Which exact treatments were given or recommended? Map each to items A-N or flag it as medical treatment. (MT-3, MT-4)
13. Was a prescription issued, even if never filled? Was any prescription drug used solely for diagnosis? (MT-7, MT-2)
14. OTC drug: Was it recommended by an HCP, what single dose was recommended, and what single dose does the product label give? (MT-8)
15. Did the employee refuse or skip treatment that was recommended? (MT-6)
16. Did an HCP diagnose a fracture or cracked bone (including teeth), a punctured eardrum, cancer, or a chronic irreversible disease? (SD-1)
17. Was there any loss of consciousness? (LC-1)

**Days away and restrictions**
18. What did the HCP recommend: days off, return date, specific restrictions? Was a vague "light duty" order clarified? (DA-3, DA-4, RW-8)
19. What are the job's routine functions (done at least weekly), and what is the scheduled workday? Does the restriction affect either? (RW-2, RW-3, RW-5)
20. Was the restriction or transfer only on the day of injury? (RW-4)
21. Friday or pre-holiday injury: did an HCP say the employee could not work during the time off? (DA-6)
22. Did the employee leave the company, and was the departure related to the injury? Is the employee still out at year end? (DA-8, DA-10)
23. Is a restriction or reassignment permanent, meaning for the rest of the employee's career? (RW-11)
24. Was restricted work available, or was the employee sent home? (RW-13)

**Specific-case rules**
25. Sharps: was the object contaminated with another person's blood or OPIM? Was there seroconversion later? (NS-1, NS-4)
26. Medical removal: was it required by an OSHA standard's medical surveillance provisions, or voluntary before the removal level? Was it caused by a chemical? (MR-1 to MR-4)
27. Hearing:
    - per-ear thresholds at 2, 3 and 4 kHz on the current audiogram and on the baseline or revised baseline;
    - age at each audiogram and sex, if age correction is wanted;
    - whether there was a retest within 30 days;
    - whether there was an HCP finding of no work relation.

    (HL-1 to HL-8) The rule does not say how to round the averages. The engine computes exactly and does not round; this is a design choice.
28. TB: was there occupational exposure to a known active case? Does any line-out circumstance apply? (TB-1, TB-3)

**Privacy**
29. Which privacy category applies? For an "other illness", did the employee voluntarily ask to omit the name? Could the description still identify the person? (FM-5, FM-6)

**Reporting**
30. Hospitalization: was there a formal in-patient admission for care or treatment, or only observation, diagnostics or ER treatment? (RP-7, RP-9)
31. Amputation or eye: was there an amputation as defined in the rule, or was the eye physically removed? (RP-10, RP-11)
32. Vehicles: was it on a public street or highway, and inside a construction work zone? Was it on a commercial or public transportation system? (RP-7)
33. Timing: when did the incident happen, when did the death or admission happen, and when did the employer learn of the event and of its work-relatedness? (RP-1 to RP-4)

**Coverage**
34. Who supervises the injured worker day to day: you, a staffing agency, or a contractor? Is the person self-employed, a sole proprietor or a partner? (CE-1, CE-2)
35. Which establishment is the employee linked to, and is it expected to operate for at least a year? (ES-1, ES-4)

**ITA and summary data**
36. For each establishment:
    - peak headcount last year, counting individuals including part-time, seasonal and temporary;
    - 6-digit NAICS code and its vintage (2012, 2017 or 2022);
    - EIN;
    - legal company name;
    - government type.

    (EL-1 to EL-12) For 2022 codes, ASK, or map through the Census concordance, before testing them against the appendices.
37. Annual average employees and total hours actually worked; pay-period counts if no exact figures exist. (AS-6, AS-7)
38. The certifier's role: owner (sole proprietorship or partnership only), corporate officer, highest-ranking official at the establishment, or that official's immediate supervisor. (AS-4)
39. ITA narrative fields: does any text contain names or other personal identifiers that must be removed? (EL-7)

---

## UNVERIFIED and limits

- **BLS rate page.** bls.gov returned "Access Denied" to direct download, so the page was read through a fetch tool and its quotes were not checked byte for byte. Nothing depends on BLS alone: the 200,000 constant and both formulas are verified in OSHA's forms package and in CPL 02-00-172.
- **Mapping 2022 NAICS codes to the appendices.** UNVERIFIED. The check found that 20 Subpart B codes, 8 Appendix A (Subpart E) codes and 5 Appendix B codes do not exist in 2022 NAICS. Use the official 2017-2022 concordance; it was not fetched.
- **ITA format tolerance.** UNVERIFIED, because no file was uploaded.
  - Will a blank `nar_object_substance` be accepted? The spec marks it required, but Form 301 field 17 says to leave it blank if it does not apply.
  - Will dates and times without leading zeros be accepted? The OSHA sample uses `9/2/2024` and `8:00`, while the spec says `mm/dd/yyyy` and `hh:mm`.

  Test both in the ITA sandbox at https://preview.osha.gov/injuryreporting/ita.
- **`dafw_num_away` and `djtr_num_tr` for fatal cases.** The spec does not say. The engine emits 0 for both, an INFERENCE from FAQ 7-28.
- **1904.35(b)(2)(v)(B).** The rule refers to a 301 section titled "Tell us about the case", which does not exist on the Rev. 04/2004 form. The engine maps it to "Information about the case", fields 10-18. This is an INFERENCE.
- **Not read:** the decision-tree figure in 1904.4(b)(2), which is an image; State Plan variations (1904.37 lets State Plans add stricter reporting rules); federal-agency rules (29 CFR 1960).
- Everything else above was checked against the primary text on 2026-11-25.

---

## Appendix A: ITA CSV formats

Sources:
- 300A (establishment and summary) file:
  - template: https://www.osha.gov/sites/default/files/osha_ita_summary_data_csv_template-revised.csv
  - sample: https://www.osha.gov/sites/default/files/osha_ita_summary_data_csv_sample_data-revised.csv
  - data dictionary: https://www.osha.gov/sites/default/files/osha_ita-estab-and-summary-csv-documentation_revised.pdf (changelog last entry 2023-10-17)
- 300/301 (case) file:
  - template: https://www.osha.gov/sites/default/files/ita_template_form_300-301_csv_data.csv
  - sample: https://www.osha.gov/sites/default/files/ita_sample_form_300-301_csv_data.csv
  - specification: https://www.osha.gov/sites/default/files/ita_case_data_csv_specifications.pdf (v1.5, 2025-01-29)
- Cross-checked against:
  - https://www.osha.gov/sites/default/files/osha_ita_api_documentation_revised.pdf
  - https://www.osha.gov/sites/default/files/ita_case_data_api_specifications.pdf
  - the ITA FAQ

### A.1 Form 300A file: exact header row (28 columns)

```
establishment_name,ein,company_name,street_address,city,state,zip,naics_code,industry_description,size,establishment_type,year_filing_for,annual_average_employees,total_hours_worked,no_injuries_illnesses,total_deaths,total_dafw_cases,total_djtr_cases,total_other_cases,total_dafw_days,total_djtr_days,total_injuries,total_skin_disorders,total_respiratory_conditions,total_poisonings,total_hearing_loss,total_other_illnesses,change_reason
```

| # | Column | Form source | Format, max length | Required | Allowed values and validation |
|---|---|---|---|---|---|
| 1 | establishment_name | 300A establishment name | Character, 100 | Yes | Must be unique per establishment. The ITA matches records by name. A code is allowed only if a legal company name is also given [1904.41(b)(10)]. |
| 2 | ein | (none) | Character, 9 | Yes | Nine digits, no dashes, keep leading zeros. The data dictionary labels this column `ein_number`; the template, sample and API use `ein`. |
| 3 | company_name | 1904.32(b)(2)(ii) | Character, 100 | No per dictionary | Legal company name. The engine always fills it [1904.41(b)(10)]. |
| 4 | street_address | 300A street | Character, 100 | Yes | No PO Box. |
| 5 | city | 300A city | Character, 100 | Yes | |
| 6 | state | 300A state | Character, 2 | Yes | Two-letter postal code of the US state or territory. |
| 7 | zip | 300A ZIP | Text, 9 | Yes | 5 or 9 digits (the sample uses `200011234`); keep leading zeros. |
| 8 | naics_code | 300A NAICS | Integer, 6 | Yes | A 6-digit 2012, 2017 or 2022 NAICS code. |
| 9 | industry_description | 300A industry description | Character, 300 | No | |
| 10 | size | (none) | Integer, 2 | Yes | `1` = under 20 employees; `21` = 20-99; `22` = 100-249; `3` = 250 or more. Based on the maximum employees at any point in the year. |
| 11 | establishment_type | (none) | Integer, 1 | No | `1` = not a government entity; `2` = State Government entity; `3` = Local Government entity. |
| 12 | year_filing_for | 300A year | Integer, 4 | Yes | The calendar year in which the injuries and illnesses occurred. |
| 13 | annual_average_employees | 300A | Integer, 10 | Yes | Greater than 0, whole number, should be under 25,000. |
| 14 | total_hours_worked | 300A | Integer, 10 | Yes | Greater than 0. Hours ÷ average employees must be under 8760 and should be over 500. |
| 15 | no_injuries_illnesses | (none) | Integer, 1 | Yes | `1` = had injuries or illnesses; `2` = had none. |
| 16 | total_deaths | G | Integer, 10 | Yes | 0 or more |
| 17 | total_dafw_cases | H | Integer, 10 | Yes | 0 or more |
| 18 | total_djtr_cases | I | Integer, 10 | Yes | 0 or more |
| 19 | total_other_cases | J | Integer, 10 | Yes | 0 or more |
| 20 | total_dafw_days | K | Integer, 10 | Yes | 0 or more |
| 21 | total_djtr_days | L | Integer, 10 | Yes | 0 or more |
| 22 | total_injuries | M(1) | Integer, 10 | Yes | 0 or more |
| 23 | total_skin_disorders | M(2) | Integer, 10 | Yes | 0 or more |
| 24 | total_respiratory_conditions | M(3) | Integer, 10 | Yes | 0 or more |
| 25 | total_poisonings | M(4) | Integer, 10 | Yes | 0 or more |
| 26 | total_hearing_loss | M(5) | Integer, 10 | Yes | 0 or more |
| 27 | total_other_illnesses | M(6) | Integer, 10 | Yes | 0 or more |
| 28 | change_reason | (none) | Character, 100 | No | Free text: why a submitted summary was changed. The OSHA sample uses "Correction of prior submission". Not coded. |

**Cross-field checks** run by the ITA [ITA 300A dict p.8] [ITA FAQ]:
- G+H+I+J must equal M1+M2+M3+M4+M5+M6.
- Average employees should be greater than G+H+I+J.
- H greater than 0 requires K greater than 0, and K greater than 0 requires H greater than 0.
- K must be at least H.
- I greater than 0 requires L greater than 0.
- L greater than 0 requires H or I greater than 0.

No decimals or thousands separators are allowed in any number.

### A.2 Form 300/301 case file: exact header row (24 columns)

```
establishment_name,year_of_filing,case_number,job_title,date_of_incident,incident_location,incident_description,incident_outcome,dafw_num_away,djtr_num_tr,type_of_incident,date_of_birth,date_of_hire,sex,treatment_facility_type,treatment_in_patient,time_started_work,time_of_incident,time_unknown,nar_before_incident,nar_what_happened,nar_injury_illness,nar_object_substance,date_of_death
```

| # | Column | Form source | Format, max length | Required | Allowed values and validation |
|---|---|---|---|---|---|
| 1 | establishment_name | 300 header | Character, 100 | Yes | Must match the 300A establishment name **exactly**. |
| 2 | year_of_filing | 300 year | Integer, 4 | Yes | The calendar year the injuries occurred, which must be the current collection's reference year. |
| 3 | case_number | 300 col A / 301 field 10 | Character, 100 | Yes | Unique within the establishment; any format. |
| 4 | job_title | 300 col C | Character, 255 | Yes | |
| 5 | date_of_incident | 300 col D / 301 field 11 | `mm-dd-yyyy` or `mm/dd/yyyy`, 10 | Yes | |
| 6 | incident_location | 300 col E | Character, 255 | Yes | |
| 7 | incident_description | 300 col F | Character, 255 | Yes | No personal identifiers. |
| 8 | incident_outcome | 300 cols G-J | Integer, 1 | Yes | `1` = Death (G); `2` = Days away from work (H); `3` = Job transfer or restricted work activity (I); `4` = Other recordable cases (J). |
| 9 | dafw_num_away | 300 col K | Integer, 3 | Yes (since spec v1.4) | Days away when outcome is 2; otherwise 0. |
| 10 | djtr_num_tr | 300 col L | Integer, 3 | Yes (since spec v1.4) | Transfer or restriction days when outcome is 2 or 3. Must be greater than 0 when outcome is 3; may be 0 when outcome is 2 [ITA FAQ]. |
| 11 | type_of_incident | 300 col M | Integer, 1 | Yes | `1` = Injury; `2` = Skin disorder; `3` = Respiratory condition; `4` = Poisoning; `5` = Hearing loss; `6` = Other illnesses. |
| 12 | date_of_birth | 301 field 3 | `mm-dd-yyyy` or `mm/dd/yyyy`, 10 | Yes | The ITA stores it as month/1/year. |
| 13 | date_of_hire | 301 field 4 | `mm-dd-yyyy` or `mm/dd/yyyy`, 10 | Yes | |
| 14 | sex | 301 field 5 | Character, 1 | No | `M` or `F`. Renamed from `gender` in v1.5; a blank is not rejected. |
| 15 | treatment_facility_type | 301 field 8 | Integer, 1 | Yes | Treated in an emergency room? `1` = yes, `0` = no. |
| 16 | treatment_in_patient | 301 field 9 | Integer, 1 | Yes | Hospitalized as an in-patient? `1` = yes, `0` = no. |
| 17 | time_started_work | 301 field 12 | `hh:mm`, 24-hour, 5 | No | For example `17:30`. |
| 18 | time_of_incident | 301 field 13 | `hh:mm`, 24-hour, 5 | No | |
| 19 | time_unknown | 301 field 13 checkbox | Integer, 1 | Yes if the time is unknown | `1` if the time is unknown, otherwise blank. |
| 20 | nar_before_incident | 301 field 14 | Text | Yes | What was the employee doing just before? |
| 21 | nar_what_happened | 301 field 15 | Text | Yes | How did the injury happen? |
| 22 | nar_injury_illness | 301 field 16 | Text | Yes | Body part and how it was affected. |
| 23 | nar_object_substance | 301 field 17 | Text | Yes | What object or substance harmed the employee? See UNVERIFIED about blanks. |
| 24 | date_of_death | 301 field 18 | `mm-dd-yyyy` or `mm/dd/yyyy`, 10 | Yes if a death is recorded | |

These are never in the file: 300 column B; 301 fields 1, 2, 6 and 7; the "Completed by" block. The narrative fields must contain no names, SSNs, phone numbers, addresses, emails or provider details. [1904.41(b)(9)] [ITA FAQ] [ITA case spec p.4]

---

## Appendix B: Appendix NAICS lists, in full

### B.1 Non-Mandatory Appendix A to Subpart B: partially exempt industries (no routine recordkeeping)

Source: [1904.2(a)(1); App. A to Subpart B]. 82 entries, copied from eCFR. Code basis: 2007 NAICS; still exempt even if the code no longer exists in 2017/2022 NAICS [FAQ 2-3] [FAQ 2-4]. Match an establishment by the leading digits of its 6-digit NAICS code (a 2-digit entry matches the whole sector; `31-33` matches 31, 32 or 33).

| NAICS | Industry | In 2017 NAICS | In 2022 NAICS |
|---|---|---|---|
| 4412 | Other Motor Vehicle Dealers | yes | yes |
| 4431 | Electronics and Appliance Stores | yes | no |
| 4461 | Health and Personal Care Stores | yes | no |
| 4471 | Gasoline Stations | yes | no |
| 4481 | Clothing Stores | yes | no |
| 4482 | Shoe Stores | yes | no |
| 4483 | Jewelry, Luggage, and Leather Goods Stores | yes | no |
| 4511 | Sporting Goods, Hobby, and Musical Instrument Stores | yes | no |
| 4512 | Book, Periodical, and Music Stores | yes | no |
| 4531 | Florists | yes | no |
| 4532 | Office Supplies, Stationery, and Gift Stores | yes | no |
| 4812 | Nonscheduled Air Transportation | yes | yes |
| 4861 | Pipeline Transportation of Crude Oil | yes | yes |
| 4862 | Pipeline Transportation of Natural Gas | yes | yes |
| 4869 | Other Pipeline Transportation | yes | yes |
| 4879 | Scenic and Sightseeing Transportation, Other | yes | yes |
| 4885 | Freight Transportation Arrangement | yes | yes |
| 5111 | Newspaper, Periodical, Book, and Directory Publishers | yes | no |
| 5112 | Software Publishers | yes | no |
| 5121 | Motion Picture and Video Industries | yes | yes |
| 5122 | Sound Recording Industries | yes | yes |
| 5151 | Radio and Television Broadcasting | yes | no |
| 5172 | Wireless Telecommunications Carriers (except Satellite) | no | no |
| 5173 | Telecommunications Resellers | yes | no |
| 5179 | Other Telecommunications | yes | no |
| 5181 | Internet Service Providers and Web Search Portals | no | no |
| 5182 | Data Processing, Hosting, and Related Services | yes | yes |
| 5191 | Other Information Services | yes | no |
| 5211 | Monetary Authorities—Central Bank | yes | yes |
| 5221 | Depository Credit Intermediation | yes | yes |
| 5222 | Nondepository Credit Intermediation | yes | yes |
| 5223 | Activities Related to Credit Intermediation | yes | yes |
| 5231 | Securities and Commodity Contracts Intermediation and Brokerage | yes | yes |
| 5232 | Securities and Commodity Exchanges | yes | yes |
| 5239 | Other Financial Investment Activities | yes | yes |
| 5241 | Insurance Carriers | yes | yes |
| 5242 | Agencies, Brokerages, and Other Insurance Related Activities | yes | yes |
| 5251 | Insurance and Employee Benefit Funds | yes | yes |
| 5259 | Other Investment Pools and Funds | yes | yes |
| 5312 | Offices of Real Estate Agents and Brokers | yes | yes |
| 5331 | Lessors of Nonfinancial Intangible Assets (except Copyrighted Works) | yes | yes |
| 5411 | Legal Services | yes | yes |
| 5412 | Accounting, Tax Preparation, Bookkeeping, and Payroll Services | yes | yes |
| 5413 | Architectural, Engineering, and Related Services | yes | yes |
| 5414 | Specialized Design Services | yes | yes |
| 5415 | Computer Systems Design and Related Services | yes | yes |
| 5416 | Management, Scientific, and Technical Consulting Services | yes | yes |
| 5417 | Scientific Research and Development Services | yes | yes |
| 5418 | Advertising and Related Services | yes | yes |
| 5511 | Management of Companies and Enterprises | yes | yes |
| 5611 | Office Administrative Services | yes | yes |
| 5614 | Business Support Services | yes | yes |
| 5615 | Travel Arrangement and Reservation Services | yes | yes |
| 5616 | Investigation and Security Services | yes | yes |
| 6111 | Elementary and Secondary Schools | yes | yes |
| 6112 | Junior Colleges | yes | yes |
| 6113 | Colleges, Universities, and Professional Schools | yes | yes |
| 6114 | Business Schools and Computer and Management Training | yes | yes |
| 6115 | Technical and Trade Schools | yes | yes |
| 6116 | Other Schools and Instruction | yes | yes |
| 6117 | Educational Support Services | yes | yes |
| 6211 | Offices of Physicians | yes | yes |
| 6212 | Offices of Dentists | yes | yes |
| 6213 | Offices of Other Health Practitioners | yes | yes |
| 6214 | Outpatient Care Centers | yes | yes |
| 6215 | Medical and Diagnostic Laboratories | yes | yes |
| 6244 | Child Day Care Services | yes | yes |
| 7114 | Agents and Managers for Artists, Athletes, Entertainers, and Other Public Figures | yes | yes |
| 7115 | Independent Artists, Writers, and Performers | yes | yes |
| 7213 | Rooming and Boarding Houses | yes | yes |
| 7221 | Full-Service Restaurants | no | no |
| 7222 | Limited-Service Eating Places | no | no |
| 7224 | Drinking Places (Alcoholic Beverages) | yes | yes |
| 8112 | Electronic and Precision Equipment Repair and Maintenance | yes | yes |
| 8114 | Personal and Household Goods Repair and Maintenance | yes | yes |
| 8121 | Personal Care Services | yes | yes |
| 8122 | Death Care Services | yes | yes |
| 8131 | Religious Organizations | yes | yes |
| 8132 | Grantmaking and Giving Services | yes | yes |
| 8133 | Social Advocacy Organizations | yes | yes |
| 8134 | Civic and Social Organizations | yes | yes |
| 8139 | Business, Professional, Labor, Political, and Similar Organizations | yes | yes |

### B.2 Appendix A to Subpart E: Form 300A submission by establishments with 20-249 employees

Source: [1904.41(a)(1)(i); App. A to Subpart E]. 65 entries, copied from eCFR. Code basis: every 4-digit code exists in 2017 NAICS (checked against the Census 2017 code list). Match an establishment by the leading digits of its 6-digit NAICS code (a 2-digit entry matches the whole sector; `31-33` matches 31, 32 or 33).

| NAICS | Industry | In 2017 NAICS | In 2022 NAICS |
|---|---|---|---|
| 11 | Agriculture, Forestry, Fishing and Hunting | yes | yes |
| 22 | Utilities | yes | yes |
| 23 | Construction | yes | yes |
| 31-33 | Manufacturing | yes | yes |
| 42 | Wholesale Trade | yes | yes |
| 4413 | Automotive Parts, Accessories, and Tire Stores | yes | yes |
| 4421 | Furniture Stores | yes | no |
| 4422 | Home Furnishings Stores | yes | no |
| 4441 | Building Material and Supplies Dealers | yes | yes |
| 4442 | Lawn and Garden Equipment and Supplies Stores | yes | yes |
| 4451 | Grocery Stores | yes | yes |
| 4452 | Specialty Food Stores | yes | yes |
| 4522 | Department Stores | yes | no |
| 4523 | General Merchandise Stores, including Warehouse Clubs and Supercenters | yes | no |
| 4533 | Used Merchandise Stores | yes | no |
| 4542 | Vending Machine Operators | yes | no |
| 4543 | Direct Selling Establishments | yes | no |
| 4811 | Scheduled Air Transportation | yes | yes |
| 4841 | General Freight Trucking | yes | yes |
| 4842 | Specialized Freight Trucking | yes | yes |
| 4851 | Urban Transit Systems | yes | yes |
| 4852 | Interurban and Rural Bus Transportation | yes | yes |
| 4853 | Taxi and Limousine Service | yes | yes |
| 4854 | School and Employee Bus Transportation | yes | yes |
| 4855 | Charter Bus Industry | yes | yes |
| 4859 | Other Transit and Ground Passenger Transportation | yes | yes |
| 4871 | Scenic and Sightseeing Transportation, Land | yes | yes |
| 4881 | Support Activities for Air Transportation | yes | yes |
| 4882 | Support Activities for Rail Transportation | yes | yes |
| 4883 | Support Activities for Water Transportation | yes | yes |
| 4884 | Support Activities for Road Transportation | yes | yes |
| 4889 | Other Support Activities for Transportation | yes | yes |
| 4911 | Postal Service | yes | yes |
| 4921 | Couriers and Express Delivery Services | yes | yes |
| 4922 | Local Messengers and Local Delivery | yes | yes |
| 4931 | Warehousing and Storage | yes | yes |
| 5152 | Cable and Other Subscription Programming | yes | no |
| 5311 | Lessors of Real Estate | yes | yes |
| 5321 | Automotive Equipment Rental and Leasing | yes | yes |
| 5322 | Consumer Goods Rental | yes | yes |
| 5323 | General Rental Centers | yes | yes |
| 5617 | Services to Buildings and Dwellings | yes | yes |
| 5621 | Waste Collection | yes | yes |
| 5622 | Waste Treatment and Disposal | yes | yes |
| 5629 | Remediation and Other Waste Management Services | yes | yes |
| 6219 | Other Ambulatory Health Care Services | yes | yes |
| 6221 | General Medical and Surgical Hospitals | yes | yes |
| 6222 | Psychiatric and Substance Abuse Hospitals | yes | yes |
| 6223 | Specialty (except Psychiatric and Substance Abuse) Hospitals | yes | yes |
| 6231 | Nursing Care Facilities (Skilled Nursing Facilities) | yes | yes |
| 6232 | Residential Intellectual and Developmental Disability, Mental Health, and Substance Abuse Facilities | yes | yes |
| 6233 | Continuing Care Retirement Communities and Assisted Living Facilities for the Elderly | yes | yes |
| 6239 | Other Residential Care Facilities | yes | yes |
| 6242 | Community Food and Housing, and Emergency and Other Relief Services | yes | yes |
| 6243 | Vocational Rehabilitation Services | yes | yes |
| 7111 | Performing Arts Companies | yes | yes |
| 7112 | Spectator Sports | yes | yes |
| 7121 | Museums, Historical Sites, and Similar Institutions | yes | yes |
| 7131 | Amusement Parks and Arcades | yes | yes |
| 7132 | Gambling Industries | yes | yes |
| 7211 | Traveler Accommodation | yes | yes |
| 7212 | RV (Recreational Vehicle) Parks and Recreational Camps | yes | yes |
| 7223 | Special Food Services | yes | yes |
| 8113 | Commercial and Industrial Machinery and Equipment (except Automotive and Electronic) Repair and Maintenance | yes | yes |
| 8123 | Drycleaning and Laundry Services | yes | yes |

### B.3 Appendix B to Subpart E: Forms 300 and 301 submission by establishments with 100+ employees

Source: [1904.41(a)(2); App. B to Subpart E]. 104 entries, copied from eCFR. Code basis: every code exists in 2017 NAICS (checked against the Census 2017 code list). Match an establishment by the leading digits of its 6-digit NAICS code (a 2-digit entry matches the whole sector; `31-33` matches 31, 32 or 33).

| NAICS | Industry | In 2017 NAICS | In 2022 NAICS |
|---|---|---|---|
| 1111 | Oilseed and Grain Farming | yes | yes |
| 1112 | Vegetable and Melon Farming | yes | yes |
| 1113 | Fruit and Tree Nut Farming | yes | yes |
| 1114 | Greenhouse, Nursery, and Floriculture Production | yes | yes |
| 1119 | Other Crop Farming | yes | yes |
| 1121 | Cattle Ranching and Farming | yes | yes |
| 1122 | Hog and Pig Farming | yes | yes |
| 1123 | Poultry and Egg Production | yes | yes |
| 1129 | Other Animal Production | yes | yes |
| 1133 | Logging | yes | yes |
| 1141 | Fishing | yes | yes |
| 1142 | Hunting and Trapping | yes | yes |
| 1151 | Support Activities for Crop Production | yes | yes |
| 1152 | Support Activities for Animal Production | yes | yes |
| 1153 | Support Activities for Forestry | yes | yes |
| 2213 | Water, Sewage and Other Systems | yes | yes |
| 2381 | Foundation, Structure, and Building Exterior Contractors | yes | yes |
| 3111 | Animal Food Manufacturing | yes | yes |
| 3113 | Sugar and Confectionery Product Manufacturing | yes | yes |
| 3114 | Fruit and Vegetable Preserving and Specialty Food Manufacturing | yes | yes |
| 3115 | Dairy Product Manufacturing | yes | yes |
| 3116 | Animal Slaughtering and Processing | yes | yes |
| 3117 | Seafood Product Preparation and Packaging | yes | yes |
| 3118 | Bakeries and Tortilla Manufacturing | yes | yes |
| 3119 | Other Food Manufacturing | yes | yes |
| 3121 | Beverage Manufacturing | yes | yes |
| 3161 | Leather and Hide Tanning and Finishing | yes | yes |
| 3162 | Footwear Manufacturing | yes | yes |
| 3211 | Sawmills and Wood Preservation | yes | yes |
| 3212 | Veneer, Plywood, and Engineered Wood Product Manufacturing | yes | yes |
| 3219 | Other Wood Product Manufacturing | yes | yes |
| 3261 | Plastics Product Manufacturing | yes | yes |
| 3262 | Rubber Product Manufacturing | yes | yes |
| 3271 | Clay Product and Refractory Manufacturing | yes | yes |
| 3272 | Glass and Glass Product Manufacturing | yes | yes |
| 3273 | Cement and Concrete Product Manufacturing | yes | yes |
| 3279 | Other Nonmetallic Mineral Product Manufacturing | yes | yes |
| 3312 | Steel Product Manufacturing from Purchased Steel | yes | yes |
| 3314 | Nonferrous Metal (except Aluminum) Production and Processing | yes | yes |
| 3315 | Foundries | yes | yes |
| 3321 | Forging and Stamping | yes | yes |
| 3323 | Architectural and Structural Metals Manufacturing | yes | yes |
| 3324 | Boiler, Tank, and Shipping Container Manufacturing | yes | yes |
| 3325 | Hardware Manufacturing | yes | yes |
| 3326 | Spring and Wire Product Manufacturing | yes | yes |
| 3327 | Machine Shops; Turned Product; and Screw, Nut, and Bolt Manufacturing | yes | yes |
| 3328 | Coating, Engraving, Heat Treating, and Allied Activities | yes | yes |
| 3331 | Agriculture, Construction, and Mining Machinery Manufacturing | yes | yes |
| 3335 | Metalworking Machinery Manufacturing | yes | yes |
| 3361 | Motor Vehicle Manufacturing | yes | yes |
| 3362 | Motor Vehicle Body and Trailer Manufacturing | yes | yes |
| 3363 | Motor Vehicle Parts Manufacturing | yes | yes |
| 3366 | Ship and Boat Building | yes | yes |
| 3371 | Household and Institutional Furniture and Kitchen Cabinet Manufacturing | yes | yes |
| 3372 | Office Furniture (including Fixtures) Manufacturing | yes | yes |
| 3379 | Other Furniture Related Product Manufacturing | yes | yes |
| 4231 | Motor Vehicle and Motor Vehicle Parts and Supplies Merchant Wholesalers | yes | yes |
| 4233 | Lumber and Other Construction Materials Merchant Wholesalers | yes | yes |
| 4235 | Metal and Mineral (except Petroleum) Merchant Wholesalers | yes | yes |
| 4239 | Miscellaneous Durable Goods Merchant Wholesalers | yes | yes |
| 4244 | Grocery and Related Product Merchant Wholesalers | yes | yes |
| 4248 | Beer, Wine, and Distilled Alcoholic Beverage Merchant Wholesalers | yes | yes |
| 4413 | Automotive Parts, Accessories, and Tire Stores | yes | yes |
| 4422 | Home Furnishings Stores | yes | no |
| 4441 | Building Material and Supplies Dealers | yes | yes |
| 4442 | Lawn and Garden Equipment and Supplies Stores | yes | yes |
| 4451 | Grocery Stores | yes | yes |
| 4522 | Department Stores | yes | no |
| 4523 | General Merchandise Stores, including Warehouse Clubs and Supercenters | yes | no |
| 4533 | Used Merchandise Stores | yes | no |
| 4543 | Direct Selling Establishments | yes | no |
| 4811 | Scheduled Air Transportation | yes | yes |
| 4841 | General Freight Trucking | yes | yes |
| 4842 | Specialized Freight Trucking | yes | yes |
| 4851 | Urban Transit Systems | yes | yes |
| 4852 | Interurban and Rural Bus Transportation | yes | yes |
| 4853 | Taxi and Limousine Service | yes | yes |
| 4854 | School and Employee Bus Transportation | yes | yes |
| 4859 | Other Transit and Ground Passenger Transportation | yes | yes |
| 4871 | Scenic and Sightseeing Transportation, Land | yes | yes |
| 4881 | Support Activities for Air Transportation | yes | yes |
| 4883 | Support Activities for Water Transportation | yes | yes |
| 4889 | Other Support Activities for Transportation | yes | yes |
| 4911 | Postal Service | yes | yes |
| 4921 | Couriers and Express Delivery Services | yes | yes |
| 4931 | Warehousing and Storage | yes | yes |
| 5322 | Consumer Goods Rental | yes | yes |
| 5621 | Waste Collection | yes | yes |
| 5622 | Waste Treatment and Disposal | yes | yes |
| 6219 | Other Ambulatory Health Care Services | yes | yes |
| 6221 | General Medical and Surgical Hospitals | yes | yes |
| 6222 | Psychiatric and Substance Abuse Hospitals | yes | yes |
| 6223 | Specialty (except Psychiatric and Substance Abuse) Hospitals | yes | yes |
| 6231 | Nursing Care Facilities (Skilled Nursing Facilities) | yes | yes |
| 6232 | Residential Intellectual and Developmental Disability, Mental Health, and Substance Abuse Facilities | yes | yes |
| 6233 | Continuing Care Retirement Communities and Assisted Living Facilities for the Elderly | yes | yes |
| 6239 | Other Residential Care Facilities | yes | yes |
| 6243 | Vocational Rehabilitation Services | yes | yes |
| 7111 | Performing Arts Companies | yes | yes |
| 7112 | Spectator Sports | yes | yes |
| 7131 | Amusement Parks and Arcades | yes | yes |
| 7211 | Traveler Accommodation | yes | yes |
| 7212 | RV (Recreational Vehicle) Parks and Recreational Camps | yes | yes |
| 7223 | Special Food Services | yes | yes |

---

## Appendix C: Form 300 / 300A / 301 fields

Source: OSHA forms package, Forms 300, 300A and 301 (Rev. 04/2004), OMB no. 1218-0176. [Forms pkg p.7-10]

### C.1 Form 300: Log of Work-Related Injuries and Illnesses
- **Header:** Year 20__; Establishment name; City; State.
- **Step 1, Identify the person:**
  - (A) Case no.
  - (B) Employee's name ("privacy case" for privacy concern cases)
  - (C) Job title (e.g., Welder)
- **Step 2, Describe the case:**
  - (D) Date of injury or onset of illness (month/day)
  - (E) Where the event occurred (e.g., Loading dock north end)
  - (F) Describe injury or illness, parts of body affected, and object/substance that directly injured or made person ill (e.g., Second degree burns on right forearm from acetylene torch)
- **Step 3, Classify the case** (select ONLY ONE, the most serious outcome):
  - (G) Death
  - (H) Days away from work
  - (I) Job transfer or restriction ("Remained at Work")
  - (J) Other recordable cases ("Remained at Work")
- **Step 4, Enter the number of days the injured or ill worker was:**
  - (K) Away from work (days)
  - (L) On job transfer or restriction (days)
- **Step 5, Select one column, (M):**
  - (1) Injury
  - (2) Skin disorder
  - (3) Respiratory condition
  - (4) Poisoning
  - (5) Hearing loss
  - (6) All other illnesses
- **Page totals** for G-M, transferred to the 300A.
- **Form text to print:** "Attention: This form contains information relating to employee health and must be used in a manner that protects the confidentiality of employees to the extent possible while the information is being used for occupational safety and health purposes."

### C.2 Form 300A: Summary of Work-Related Injuries and Illnesses
- **Year** 20__.
- **Number of Cases:**
  - (G) Total number of deaths
  - (H) Total number of cases with days away from work
  - (I) Total number of cases with job transfer or restriction
  - (J) Total number of other recordable cases
- **Number of Days:**
  - (K) Total number of days away from work
  - (L) Total number of days of job transfer or restriction
- **Injury and Illness Types, (M) Total number of ...:**
  - (1) Injuries
  - (2) Skin disorders
  - (3) Respiratory conditions
  - (4) Poisonings
  - (5) Hearing loss
  - (6) All other illnesses
- **Establishment information:** Your establishment name; Street; City; State; Zip; Industry description (e.g., Manufacture of motor truck trailers); North American Industrial Classification (NAICS), if known (e.g., 336212). The app adds a company name field, which 1904.32(b)(2)(ii) requires.
- **Employment information:** Annual average number of employees; Total hours worked by all employees last year.
- **Sign here:** Company executive; Title; Phone; Date.
- **Statements to print verbatim.** An equivalent form must carry the access and penalty statements [1904.32(b)(2)(iii)]:
  - "All establishments covered by Part 1904 must complete this Summary page, even if no work-related injuries or illnesses occurred during the year."
  - "Employees, former employees, and their representatives have the right to review the OSHA Form 300 in its entirety. They also have limited access to the OSHA Form 301 or its equivalent. See 29 CFR Part 1904.35, in OSHA's recordkeeping rule, for further details on the access provisions for these forms."
  - "Knowingly falsifying this document may result in a fine."
  - "I certify that I have examined this document and that to the best of my knowledge the entries are true, accurate, and complete."
  - "Post this Summary page from February 1 to April 30 of the year following the year covered by the form."

### C.3 Form 301: Injury and Illness Incident Report
- **Information about the employee:**
  1. Full name
  2. Street, City, State, ZIP
  3. Date of birth
  4. Date hired
  5. Male / Female
- **Information about the physician or other health care professional:**
  6. Name of physician or other health care professional
  7. If treatment was given away from the worksite, where was it given? (Facility, Street, City, State, ZIP)
  8. Was employee treated in an emergency room? (Yes/No)
  9. Was employee hospitalized overnight as an in-patient? (Yes/No)
- **Information about the case:**
  10. Case number from the Log
  11. Date of injury or illness
  12. Time employee began work (HH:MM AM/PM)
  13. Time of event (HH:MM AM/PM), with a "Check if time cannot be determined" box
  14. What was the employee doing just before the incident occurred? Describe the activity, as well as the tools, equipment, or material the employee was using.
  15. What happened? Tell us how the injury occurred.
  16. What was the injury or illness? Tell us the part of the body that was affected and how it was affected.
  17. What object or substance directly harmed the employee? (Leave blank if it does not apply.)
  18. If the employee died, when did death occur? Date of death
- **Completed by:** Completed by; Title; Phone; Date.
- **Form text to print** for fields 14-17: "Please do not include any personally identifiable information (PII) pertaining to worker(s) involved in the incident (e.g., no names, phone numbers, or Social Security numbers)."
- **Timing and retention:** the 301 is due within 7 calendar days and kept for 5 years. [1904.29(b)(3)] [1904.33(a)]
- **Field 9 and reporting:** this field asks about an "overnight" in-patient stay, but reportability under 1904.39 depends on formal admission, not on an overnight stay. [FAQ 39-10]

### C.4 Injury and illness categories (Form 300 column M) [Forms pkg p.3-4]
- **Injury:** any wound or damage to the body from an event in the work environment. Examples: cut, puncture, laceration, abrasion, fracture, bruise, contusion, chipped tooth, amputation, insect bite, electrocution, burns. Sprains and strains from slips, trips or falls are injuries.
- **Skin disorder:** caused by work exposure to chemicals, plants or other substances. Examples: contact dermatitis, eczema, rash, oil acne, friction blisters, chrome ulcers.
- **Respiratory condition:** from breathing hazardous biological agents, chemicals, dust, gases, vapors or fumes. Examples: silicosis, asbestosis, pneumonitis, occupational asthma, RADS, COPD, metal fume fever, tuberculosis.
- **Poisoning:** abnormal concentrations of toxic substances in blood, tissues, fluids or breath. Examples: lead, mercury, cadmium, arsenic, carbon monoxide, hydrogen sulfide, benzene, carbon tetrachloride, insecticides, formaldehyde.
- **Hearing loss:** the 1904.10 definition (STS plus 25 dB in the same ear).
- **All other illnesses:** examples are heat stroke and other heat effects, frostbite, decompression sickness, ionizing and nonionizing radiation effects, anthrax, bloodborne pathogenic diseases (AIDS, HIV, hepatitis B and C), brucellosis, malignant or benign tumors, histoplasmosis and coccidioidomycosis.

---

## Appendix D: Age-correction values at 2000, 3000 and 4000 Hz (29 CFR 1910.95 Appendix F)

Tables F-1 (males) and F-2 (females) are reproduced here, in dB, for the three STS frequencies only. Appendix F is non-mandatory. Use the tables only for the STS test (HL-5, HL-6), never for the 25 dB test. [1910.95 App. F] [1904.10(b)(3)]

Use: for each frequency, find the value for the employee's age at the current audiogram and subtract the value for the age at the baseline audiogram. Subtract that difference from the current threshold, then compute the shift. Appendix F's own worked example (male, ages 27 to 32, 4000 Hz) gives 10 − 7 = 3 dB, which turns a raw 20 dB shift into 17 dB.

| Age | Male 2000 | Male 3000 | Male 4000 | Female 2000 | Female 3000 | Female 4000 |
|---|---|---|---|---|---|---|
| 20 or younger | 3 | 4 | 5 | 4 | 3 | 3 |
| 21 | 3 | 4 | 5 | 4 | 4 | 3 |
| 22 | 3 | 4 | 5 | 4 | 4 | 4 |
| 23 | 3 | 4 | 6 | 5 | 4 | 4 |
| 24 | 3 | 5 | 6 | 5 | 4 | 4 |
| 25 | 3 | 5 | 7 | 5 | 4 | 4 |
| 26 | 4 | 5 | 7 | 5 | 5 | 4 |
| 27 | 4 | 6 | 7 | 5 | 5 | 5 |
| 28 | 4 | 6 | 8 | 5 | 5 | 5 |
| 29 | 4 | 6 | 8 | 5 | 5 | 5 |
| 30 | 4 | 6 | 9 | 6 | 5 | 5 |
| 31 | 4 | 7 | 9 | 6 | 6 | 5 |
| 32 | 5 | 7 | 10 | 6 | 6 | 6 |
| 33 | 5 | 7 | 10 | 6 | 6 | 6 |
| 34 | 5 | 8 | 11 | 6 | 6 | 6 |
| 35 | 5 | 8 | 11 | 6 | 7 | 7 |
| 36 | 5 | 9 | 12 | 7 | 7 | 7 |
| 37 | 6 | 9 | 12 | 7 | 7 | 7 |
| 38 | 6 | 9 | 13 | 7 | 7 | 7 |
| 39 | 6 | 10 | 14 | 7 | 8 | 8 |
| 40 | 6 | 10 | 14 | 7 | 8 | 8 |
| 41 | 6 | 10 | 14 | 8 | 8 | 8 |
| 42 | 7 | 11 | 16 | 8 | 9 | 9 |
| 43 | 7 | 12 | 16 | 8 | 9 | 9 |
| 44 | 7 | 12 | 17 | 8 | 9 | 9 |
| 45 | 7 | 13 | 18 | 8 | 10 | 10 |
| 46 | 8 | 13 | 19 | 9 | 10 | 10 |
| 47 | 8 | 14 | 19 | 9 | 10 | 11 |
| 48 | 8 | 14 | 20 | 9 | 11 | 11 |
| 49 | 9 | 15 | 21 | 9 | 11 | 11 |
| 50 | 9 | 16 | 22 | 10 | 11 | 12 |
| 51 | 9 | 16 | 23 | 10 | 12 | 12 |
| 52 | 10 | 17 | 24 | 10 | 12 | 13 |
| 53 | 10 | 18 | 25 | 10 | 13 | 13 |
| 54 | 10 | 18 | 26 | 11 | 13 | 14 |
| 55 | 11 | 19 | 27 | 11 | 14 | 14 |
| 56 | 11 | 20 | 28 | 11 | 14 | 15 |
| 57 | 11 | 21 | 29 | 11 | 15 | 15 |
| 58 | 12 | 22 | 31 | 12 | 15 | 16 |
| 59 | 12 | 22 | 32 | 12 | 16 | 16 |
| 60 or older | 13 | 23 | 33 | 12 | 16 | 17 |
