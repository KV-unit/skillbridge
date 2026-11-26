import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiData } from '../lib/useApiData.js';
import {
  listMyCredentials, listMyAttempts, listMyIntroductions, listBridgingSteps, listMyWaivers, markIntroductionRead,
} from '../lib/api.js';
import { profileCompleteness, suggestBridging, summarise } from '../lib/trust.js';
import { formatDate, plural } from '../lib/format.js';
import Loading from '../components/Loading.jsx';
import Notice from '../components/Notice.jsx';
import TrustLevel from '../components/TrustLevel.jsx';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [actionError, setActionError] = useState('');
  const { data, error, loading, reload } = useApiData(async () => {
    const [mine, attempts, intros, steps, waivers] = await Promise.all([
      listMyCredentials(user.id), listMyAttempts(user.id), listMyIntroductions(user.id), listBridgingSteps(), listMyWaivers(user.id),
    ]);
    return { ...mine, attempts, intros, steps, waivers };
  }, [user.id]);

  if (loading && !data) return <Loading label="Loading your dashboard" />;
  if (error) return <div className="container page"><Notice tone="error">{error}</Notice><button className="btn btn-secondary" onClick={reload}>Try again</button></div>;

  const summary = summarise(data.credentials, data.attempts);
  const progress = profileCompleteness({ profile, credentials: data.credentials, evidenceByCredential: data.evidenceByCredential, attempts: data.attempts });
  const suggestions = suggestBridging(data.credentials, data.steps, profile.field).slice(0, 3);
  const unread = data.intros.filter((i) => !i.is_read);
  const firstName = (profile.full_name || 'there').split(' ')[0];

  const markRead = async (id) => {
    setActionError('');
    try { await markIntroductionRead(id); await reload(); } catch (e) { setActionError(e.message); }
  };

  return (
    <div className="container page">
      <div className="page-header">
        <h1>Welcome, {firstName}</h1>
        <p>Here is where your profile stands and what to do next.</p>
      </div>
      <Notice tone="error">{actionError}</Notice>

      <div className="grid-2">
        <div className="stack">
          <section className="card" aria-labelledby="next-steps">
            <div className="row between">
              <h2 id="next-steps" style={{ marginBottom: 0 }}>Your next steps</h2>
              <span className="muted small">{progress.doneCount} of {progress.items.length} done</span>
            </div>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-label="Profile progress" style={{ margin: '12px 0 16px' }}>
              <span style={{ width: `${progress.percent}%` }} />
            </div>
            <ul className="checklist">
              {progress.items.map((item) => (
                <li key={item.key} className={item.done ? 'done' : ''}>
                  <span className="tick" aria-hidden="true">{item.done ? '✓' : ''}</span>
                  <div>
                    <strong>{item.done ? <>{item.label} <span className="visually-hidden">(done)</span></> : <Link to={item.to}>{item.label}</Link>}</strong>
                    {!item.done && <div className="muted small">{item.hint}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card" aria-labelledby="claims-heading">
            <div className="row between">
              <h2 id="claims-heading" style={{ marginBottom: 0 }}>Your claims</h2>
              <Link to="/credentials" className="btn btn-secondary btn-sm">Manage claims</Link>
            </div>
            <div className="kpis" style={{ marginTop: 14 }}>
              <div className="kpi"><strong>{summary.totalClaims}</strong><span>claims</span></div>
              <div className="kpi"><strong>{summary.verifiedCredentials}</strong><span>verified</span></div>
              <div className="kpi"><strong>{summary.pending}</strong><span>in review</span></div>
              <div className="kpi"><strong>{summary.needsChanges}</strong><span>need changes</span></div>
              <div className="kpi"><strong>{summary.passedAssessments}</strong><span>assessments passed</span></div>
            </div>
            {summary.needsChanges > 0 && (
              <p className="notice notice-warning" style={{ marginTop: 14, marginBottom: 0 }}>
                A reviewer asked for changes on {plural(summary.needsChanges, 'claim')}. <Link to="/credentials">See what is missing</Link>.
              </p>
            )}
          </section>

          {suggestions.length > 0 && (
            <section className="card" aria-labelledby="bridge-heading">
              <div className="row between">
                <h2 id="bridge-heading" style={{ marginBottom: 0 }}>Routes to close the gap</h2>
                <Link to="/bridging" className="btn btn-secondary btn-sm">See all</Link>
              </div>
              <ul className="stack-sm" style={{ paddingLeft: 18 }}>
                {suggestions.map(({ step, reasons }) => (
                  <li key={step.id}>
                    <strong>{step.title}</strong> <span className="muted">({step.provider})</span>
                    {reasons.length > 0 && <div className="muted small">Helps with: {reasons.join(', ')}</div>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="stack">
          <section className="card" aria-labelledby="level-heading">
            <h2 id="level-heading" style={{ fontSize: '1.1rem' }}>Verification level</h2>
            <TrustLevel level={summary.level} />
          </section>

          <section className="card" aria-labelledby="public-heading">
            <h2 id="public-heading" style={{ fontSize: '1.1rem' }}>Your public profile</h2>
            {profile.is_public && profile.slug ? (
              <>
                <p className="muted small">Employers can see it. Only verified items are marked verified.</p>
                <Link className="btn btn-primary btn-sm" to={`/p/${profile.slug}`}>View my public profile</Link>
              </>
            ) : (
              <>
                <p className="muted small">Your profile is private. Publish it when you are ready for employers to find you.</p>
                <Link className="btn btn-secondary btn-sm" to="/profile">Open profile settings</Link>
              </>
            )}
          </section>

          <section className="card" aria-labelledby="intro-heading">
            <h2 id="intro-heading" style={{ fontSize: '1.1rem' }}>Introduction requests {unread.length > 0 && <span className="badge badge-info">{unread.length} new</span>}</h2>
            {data.intros.length === 0 ? (
              <p className="muted small">Nothing yet. When an employer asks to be introduced, it appears here.</p>
            ) : (
              <ul className="stack-sm" style={{ listStyle: 'none', padding: 0 }}>
                {data.intros.slice(0, 5).map((i) => (
                  <li key={i.id} className="card card-flat">
                    <strong>{i.from_name}</strong>{i.from_org ? `, ${i.from_org}` : ''}
                    <div className="muted small">{formatDate(i.created_at)}</div>
                    <p style={{ margin: '6px 0' }}>{i.message}</p>
                    <div className="actions">
                      <a className="btn btn-secondary btn-sm" href={`mailto:${i.from_email}?subject=${encodeURIComponent('Your message on SkillBridge')}`}>Reply by email</a>
                      {!i.is_read && <button type="button" className="btn btn-ghost btn-sm" onClick={() => markRead(i.id)}>Mark as read</button>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
