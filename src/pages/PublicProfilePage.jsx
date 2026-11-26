import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApiData } from '../lib/useApiData.js';
import { getPublicProfile, requestIntroduction } from '../lib/api.js';
import { verificationLevel } from '../lib/trust.js';
import { VERIFICATION_METHODS } from '../lib/constants.js';
import { formatDate, initials, kindLabel } from '../lib/format.js';
import { validateIntroduction, hasErrors } from '../lib/validation.js';
import Loading from '../components/Loading.jsx';
import Notice from '../components/Notice.jsx';
import TrustLevel from '../components/TrustLevel.jsx';
import Field from '../components/Field.jsx';

function IntroductionForm({ slug, name }) {
  const [form, setForm] = useState({ name: '', org: '', email: '', message: '' });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = validateIntroduction(form);
    setErrors(found);
    setFailure('');
    if (hasErrors(found)) return;
    setBusy(true);
    try {
      await requestIntroduction({ slug, ...form });
      setSent(true);
    } catch (err) {
      setFailure(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return <Notice tone="success">Your message was sent to {name}. If they are interested they will reply to {form.email}. Your email is not shown anywhere else.</Notice>;
  }

  return (
    <form className="card form no-print" onSubmit={submit} noValidate aria-label={`Request an introduction to ${name}`}>
      <h2 style={{ fontSize: '1.2rem' }}>Request an introduction</h2>
      <p className="muted small" style={{ margin: 0 }}>You do not need an account. {name} will see your name, organisation, email and message, and decides whether to reply.</p>
      <Notice tone="error">{failure}</Notice>
      <div className="form-row">
        <Field label="Your name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
        <Field label="Organisation (optional)" value={form.org} onChange={set('org')} autoComplete="organization" />
      </div>
      <Field label="Your email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
      <Field as="textarea" label="Message" hint="Say who you are and what role or opportunity you have in mind." value={form.message} onChange={set('message')} error={errors.message} />
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send request'}</button>
    </form>
  );
}

export default function PublicProfilePage() {
  const { slug } = useParams();
  const { data: p, error, loading, reload } = useApiData(() => getPublicProfile(slug), [slug]);

  if (loading) return <Loading label="Loading profile" />;
  if (error) return <div className="container page"><Notice tone="error">{error}</Notice><button className="btn btn-secondary" onClick={reload}>Try again</button></div>;
  if (!p) {
    return (
      <div className="container page">
        <div className="card center stack">
          <h1>Profile not found</h1>
          <p className="muted">It may have been made private, or the link may be mistyped.</p>
          <div><Link className="btn btn-primary" to="/talent">Browse the talent directory</Link></div>
        </div>
      </div>
    );
  }

  const verified = p.credentials.filter((c) => c.status === 'verified');
  const claimed = p.credentials.filter((c) => c.status !== 'verified');
  const passed = p.assessments.filter((a) => a.passed);
  const level = verificationLevel({ verifiedCredentials: verified.length, passedAssessments: passed.length, unprovenClaims: claimed.length });

  return (
    <div className="container page" style={{ maxWidth: 860 }}>
      <div className="stack">
        <section className="card">
          <div className="profile-head">
            <div className="avatar" aria-hidden="true">{initials(p.full_name)}</div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h1 style={{ marginBottom: 4 }}>{p.full_name}</h1>
              {p.headline && <p style={{ fontSize: '1.1rem', margin: '0 0 4px' }}>{p.headline}</p>}
              <div className="muted">
                {[p.field, p.current_country ? `Based in ${p.current_country}` : '', p.origin_country ? `From ${p.origin_country}` : ''].filter(Boolean).join(' · ')}
              </div>
            </div>
            <button type="button" className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>Print or save as PDF</button>
          </div>
          {p.bio && <p style={{ marginTop: 16, marginBottom: 0 }}>{p.bio}</p>}
        </section>

        <section className="card" aria-labelledby="trust-heading">
          <h2 id="trust-heading" style={{ fontSize: '1.1rem' }}>Verification level</h2>
          <TrustLevel level={level} />
        </section>

        <section className="card" aria-labelledby="verified-heading">
          <h2 id="verified-heading">Verified</h2>
          {verified.length === 0 && passed.length === 0 && <p className="muted">Nothing has been verified yet.</p>}
          <ul className="timeline">
            {verified.map((c) => (
              <li key={c.id} className="verified">
                <div className="row between">
                  <strong>{c.title}</strong>
                  <span className="badge badge-success">Verified</span>
                </div>
                <div className="muted small">{[kindLabel(c.kind), c.institution, c.country, c.year].filter(Boolean).join(' · ')}</div>
                <div className="small">{VERIFICATION_METHODS[c.verification_method] || 'Checked by a reviewer'}{c.has_evidence ? ', with supporting documents on file' : ', without documents'}</div>
              </li>
            ))}
            {passed.map((a) => (
              <li key={a.assessment_id} className="verified">
                <div className="row between">
                  <strong>{a.title}</strong>
                  <span className="badge badge-success">Assessment passed</span>
                </div>
                <div className="small">Best score {a.best_percent}% (pass mark {a.pass_mark}%) in {a.attempts} {a.attempts === 1 ? 'attempt' : 'attempts'}. Last attempt {formatDate(a.last_attempt)}.</div>
              </li>
            ))}
          </ul>
        </section>

        {(claimed.length > 0 || p.assessments.length > passed.length) && (
          <section className="card" aria-labelledby="claimed-heading">
            <h2 id="claimed-heading">Claimed, not yet verified</h2>
            <p className="muted small">These are the person&apos;s own statements. They may be true but nobody has checked them yet.</p>
            <ul className="timeline">
              {claimed.map((c) => (
                <li key={c.id}>
                  <div className="row between">
                    <strong>{c.title}</strong>
                    <span className="badge badge-neutral">Not yet verified</span>
                  </div>
                  <div className="muted small">{[kindLabel(c.kind), c.institution, c.country, c.year].filter(Boolean).join(' · ')}</div>
                </li>
              ))}
              {p.assessments.filter((a) => !a.passed).map((a) => (
                <li key={a.assessment_id}>
                  <div className="row between">
                    <strong>{a.title}</strong>
                    <span className="badge badge-neutral">Not passed yet</span>
                  </div>
                  <div className="small">Best score {a.best_percent}% in {a.attempts} {a.attempts === 1 ? 'attempt' : 'attempts'}.</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <IntroductionForm slug={p.slug} name={p.full_name} />
      </div>
    </div>
  );
}
