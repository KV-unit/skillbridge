import { Link } from 'react-router-dom';

const BENCHMARKS = [
  {
    name: 'Credential and skills verification',
    how: 'Every claim carries a status and, once checked, the method: documents reviewed, issuer confirmed, reference checked or interview. Skills assessments are scored on the server, so a pass cannot be faked in the browser. Lost paperwork is not a dead end: a claim can be sent with no files and checked another way.',
  },
  {
    name: 'Access and compliance readiness',
    how: 'The bridging page lists the certifications, credential evaluations and regulator registrations that unlock formal work, and candidates can request a fee waiver for the ones with partner funding. Reviewers decide each request and the decision is recorded.',
  },
  {
    name: 'Practical and market fit',
    how: 'Public profiles separate "Verified" from "Claimed, not yet verified" so employers can judge for themselves. The talent directory filters by field and by whether anything is verified, and each profile shows the evidence behind it without exposing the files.',
  },
  {
    name: 'Social and SDG impact',
    how: 'Decent work (SDG 8), quality education and upskilling (SDG 4), reduced inequalities (SDG 10), strong institutions through transparent verification (SDG 16) and partnerships between refugees, reviewers and employers (SDG 17).',
  },
  {
    name: 'Sustainability and scalability',
    how: 'Reviewers are the only manual step, and the queue is oldest-first with a recorded method, so more reviewers (NGOs, universities, professional bodies) can join without changing the product. Assessments are data, not code: adding a field means adding rows. The stack is a static site plus a managed database, so it costs almost nothing to run.',
  },
];

export default function ImpactPage() {
  return (
    <div className="container page" style={{ maxWidth: 860 }}>
      <div className="page-header">
        <h1>How SkillBridge works</h1>
        <p>
          Skilled refugees often arrive with degrees, licences and years of experience but no way to prove them. Systems built around paper records push them into
          underemployment. SkillBridge gives them another way to be believed, and gives employers a clear picture of what has been checked.
        </p>
      </div>

      <div className="stack">
        <section className="card">
          <h2>The pathway</h2>
          <ol>
            <li><strong>Claim.</strong> The candidate lists qualifications and experience and attaches whatever evidence exists.</li>
            <li><strong>Check.</strong> A reviewer opens the evidence, decides, and records <em>how</em> the claim was verified. A rejected claim returns with a note on what is missing.</li>
            <li><strong>Test.</strong> The candidate takes skills assessments. Scoring happens in the database; the answer key never reaches the browser; attempts are limited per day.</li>
            <li><strong>Bridge.</strong> Gaps that cannot be closed with paperwork point to a recognised certification or registration, with an optional fee-waiver request.</li>
            <li><strong>Connect.</strong> The candidate publishes a profile. Employers search it and send an introduction request without needing an account. The candidate chooses whether to reply.</li>
          </ol>
        </section>

        <section className="card">
          <h2>What the five benchmarks look like here</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Benchmark</th><th scope="col">How SkillBridge addresses it</th></tr></thead>
              <tbody>
                {BENCHMARKS.map((b) => (
                  <tr key={b.name}><th scope="row" style={{ textTransform: 'none', letterSpacing: 0, fontSize: '0.95rem', color: 'inherit', background: 'transparent' }}>{b.name}</th><td>{b.how}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2>Trust and privacy by design</h2>
          <ul>
            <li>Candidates cannot mark themselves verified. The database refuses it, not just the screen.</li>
            <li>Editing a verified claim sends it back to unverified, so a badge cannot outlive the thing it vouched for.</li>
            <li>Evidence files live in a private bucket and open only for the owner and reviewers, through links that expire after five minutes.</li>
            <li>Profiles are private until the candidate publishes them. Reviewer notes, rejections, evidence files and email addresses are never shown publicly.</li>
            <li>Employers write to a candidate through a form. The candidate sees the message and decides whether to share contact details.</li>
            <li>Reviewers cannot review their own claims or decide their own requests.</li>
          </ul>
        </section>

        <section className="card">
          <h2>What is real, and what is still a prototype</h2>
          <ul>
            <li><strong>Real:</strong> accounts, claims, evidence upload, reviewer decisions, server-side scoring, public profiles, the talent directory, introductions, and fee-waiver requests all run against a live database with row-level security.</li>
            <li><strong>Starter content:</strong> the four assessments are short knowledge screens, not licences or exams. Fee-waiver availability stands in for partner funds that a real programme would supply. Provider costs vary by country, so each step tells people to check.</li>
            <li><strong>Next:</strong> reviewer organisations with their own queues, translations and low-bandwidth mode, issuer confirmation by secure link, employer accounts, and anonymised reporting for partners.</li>
          </ul>
        </section>

        <div className="row">
          <Link to="/register" className="btn btn-primary">Create a profile</Link>
          <Link to="/talent" className="btn btn-secondary">Browse the talent directory</Link>
        </div>
      </div>
    </div>
  );
}
