# SkillBridge: project write-up

**Hackathon:** ILO mini-hackathon, *Unlocking Displaced Talent: Pathways for Skilled Refugees*
**Track:** 1, Credential recognition and skills validation (with pieces of tracks 2 and 3)
**Live app:** {{LIVE_URL}}
**Repository:** {{REPO_URL}}

## The problem in one paragraph

Skilled refugees arrive with degrees, licences and years of experience, but often without the paperwork to prove them. Systems that only accept certificates push them into underemployment, which wastes talent ("brain waste") and keeps people dependent on aid. Employers are not unwilling; they simply have no trustworthy way to tell what is real.

## The solution

SkillBridge gives a person another way to be believed, and gives employers an honest picture of what has been checked.

1. **Claim.** The person lists qualifications and experience and attaches whatever evidence exists. Lost records are not a dead end: a claim can be sent with no files.
2. **Check.** A reviewer opens the evidence and records *how* the claim was verified (documents reviewed, issuer confirmed, reference checked, or interview). Rejected claims return with a note on what is missing.
3. **Test.** Short skills assessments, scored on the server, show baseline knowledge when paper cannot.
4. **Bridge.** Gaps that cannot be closed with paperwork point to a recognised certification, evaluation or registration, with an optional fee-waiver request.
5. **Connect.** The person publishes a profile that separates **Verified** from **Claimed, not yet verified**. Employers search the directory and send an introduction request without needing an account.

## How it meets the five benchmarks

| Benchmark | What the prototype does |
| --- | --- |
| Credential and skills verification | Every claim has a status and a recorded method. Assessments are scored in the database; the answer key never reaches the browser. Verification levels 0 to 3 summarise the result. |
| Access and compliance readiness | Bridging routes list the certifications, credential evaluations and registrations that unlock formal work. Fee-waiver requests are decided by a reviewer and recorded. |
| Practical and market fit | Public profiles show exactly what is verified and how. The directory filters by field and by whether anything is verified. Employers can introduce themselves directly. |
| Social and SDG impact | Decent work (SDG 8), quality education and upskilling (SDG 4), reduced inequalities (SDG 10), transparent institutions (SDG 16), partnerships (SDG 17). |
| Sustainability and scalability | Reviewers are the only manual step, and any NGO, university or professional body can supply them. Adding a field means adding rows, not code. A static site plus a managed database costs almost nothing to run. |

## Why it can be trusted

- A candidate cannot mark themselves verified; the database refuses it, not just the screen.
- Editing a verified claim sends it back to unverified, so a badge cannot outlive the thing it vouched for.
- Reviewers cannot review their own claims or decide their own requests.
- Evidence files are private and open only for the owner and reviewers, through links that expire after five minutes.
- Reviewer notes, rejections, files and email addresses are never public. A rejected claim looks like a plain unverified one to employers.
- Employers write through a form with limits on repeated messages; the candidate decides whether to reply.

These rules are covered by `supabase/tests/security.test.sql`, which runs against a real PostgreSQL.

## What is real and what is a prototype

**Real:** accounts, claims, evidence upload, reviewer decisions, server-side scoring, public profiles, the talent directory, introductions and fee-waiver requests, all on a live database with row-level security.

**Starter content:** the four assessments are short knowledge screens, not licences or exams. Fee-waiver availability stands in for partner funds that a real programme would provide. Provider costs vary by country, so each step tells people to check. The `demo.sql` profiles are fictional and marked "(demo)".

## Demo script (about 6 minutes)

| Time | Show | Say |
| --- | --- | --- |
| 0:00 | Home page | The problem in one sentence. "Papers get lost; talent does not." |
| 0:30 | Register, then the dashboard | "Start with nothing but a name. The checklist tells you what to do next." |
| 1:00 | Profile, then publish | "You decide what is public." |
| 1:30 | My claims: add a claim, attach a PDF, send for review | "Evidence is optional. If records are lost, send the claim anyway." |
| 2:30 | Switch to the reviewer: Review queue, open the file, approve with a method | "A person checks it and records how. This is the trust step." Show sending one back with a note. |
| 3:30 | Back as the candidate: claim shows Verified and the method | "The badge says how, not just that." |
| 4:00 | Assessments: fail, then pass | "Scoring happens in the database. The answer key never reaches the browser." |
| 4:30 | Bridging: request a fee waiver | "When paperwork cannot close the gap, a recognised route can." |
| 5:00 | Log out. Talent directory, then a public profile | "Verified is separate from claimed. Employers see exactly what was checked." |
| 5:30 | Send an introduction request | "No account needed. The candidate chooses whether to reply." |
| 6:00 | Close | The five benchmarks in one sentence each, and the next steps. |

## Likely questions

- **Who are the reviewers?** Partner organisations (NGOs, universities, professional bodies). The queue and method log are built so more reviewers can join without changing the product.
- **Can the assessments be cheated?** Scoring and the answer key are server-side, results show only the total, and attempts are limited to five per assessment per day. They are a screen, not a licence, and say so.
- **What stops a fake profile?** Nothing shows as verified until a reviewer approves it, and the public page labels everything else as a claim.
- **How would it scale?** More reviewer organisations, more fields as data, translations, and a low-bandwidth mode. The hosting is a static site and a managed database.

## Next steps

Reviewer organisations with their own queues; translations and a low-bandwidth mode; issuer confirmation by secure link; employer accounts; anonymised reporting for partners.
