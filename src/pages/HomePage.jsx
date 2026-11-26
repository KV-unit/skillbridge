import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiData } from '../lib/useApiData.js';
import { getPlatformStats } from '../lib/api.js';

export default function HomePage() {
  const { user } = useAuth();
  const { data: stats } = useApiData(getPlatformStats, []); // quietly hidden if it cannot load

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>Prove what you know, even when your papers are lost.</h1>
          <p className="lead">
            SkillBridge turns the skills, degrees and experience of refugees into evidence that employers can trust:
            reviewed by people, tested by assessments, and honest about what is still unproven.
          </p>
          <div className="row">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg">Go to my dashboard</Link>
            ) : (
              <Link to="/register" className="btn btn-primary btn-lg">Create my profile</Link>
            )}
            <Link to="/talent" className="btn btn-secondary btn-lg">Browse verified talent</Link>
          </div>
          {stats && (
            <div className="stats" aria-label="Platform activity">
              <div className="stat"><strong>{stats.public_profiles}</strong><span>public profiles</span></div>
              <div className="stat"><strong>{stats.verified_credentials}</strong><span>credentials verified</span></div>
              <div className="stat"><strong>{stats.assessments_passed}</strong><span>assessments passed</span></div>
              <div className="stat"><strong>{stats.bridging_steps}</strong><span>bridging routes listed</span></div>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>How it works</h2>
          <ol className="steps">
            <li><h3>Tell your story</h3><p className="muted">List your degrees, certificates, licences and work. Attach scans or photos if you have them. If you have nothing, that is fine too.</p></li>
            <li><h3>Get it checked</h3><p className="muted">A reviewer looks at your evidence and records how each claim was verified: documents, the issuer, a reference or an interview.</p></li>
            <li><h3>Show your skills</h3><p className="muted">Take short assessments in your field. They are scored on the server, so a pass means something even without paperwork.</p></li>
            <li><h3>Meet employers</h3><p className="muted">Publish a profile that clearly separates what is verified from what is claimed. Employers send you an introduction request.</p></li>
          </ol>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <h2>Built around the three barriers</h2>
          <div className="grid">
            <article className="card"><h3>Credential recognition</h3><p className="muted">Evidence upload, reviewer verification and skills assessments replace the missing certificate.</p><div className="chips"><span className="chip">SDG 4</span><span className="chip">SDG 8</span></div></article>
            <article className="card"><h3>Legal and financial access</h3><p className="muted">Bridging routes list the certifications and registrations that unlock formal work, with fee-waiver requests for the costs.</p><div className="chips"><span className="chip">SDG 8</span><span className="chip">SDG 10</span><span className="chip">SDG 16</span></div></article>
            <article className="card"><h3>Local experience and networks</h3><p className="muted">A public, verified profile and an introduction inbox connect talent with hiring partners.</p><div className="chips"><span className="chip">SDG 8</span><span className="chip">SDG 10</span><span className="chip">SDG 17</span></div></article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid">
          <div className="card">
            <h3>For skilled refugees</h3>
            <p className="muted">Build a profile in minutes. You control what is public.</p>
            <Link to={user ? '/dashboard' : '/register'} className="btn btn-primary">{user ? 'Open dashboard' : 'Get started'}</Link>
          </div>
          <div className="card">
            <h3>For employers and partners</h3>
            <p className="muted">Search verified talent. No account needed to send an introduction request.</p>
            <Link to="/talent" className="btn btn-secondary">Search talent</Link>
          </div>
          <div className="card">
            <h3>For reviewers</h3>
            <p className="muted">Check claims and evidence, decide fee-waiver requests, and keep a clear record.</p>
            <Link to="/impact" className="btn btn-secondary">Read how verification works</Link>
          </div>
        </div>
      </section>
    </>
  );
}
