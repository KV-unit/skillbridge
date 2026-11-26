import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiData } from '../lib/useApiData.js';
import { listPublicProfiles } from '../lib/api.js';
import { FIELDS } from '../lib/constants.js';
import { initials, plural } from '../lib/format.js';
import Loading from '../components/Loading.jsx';
import Notice from '../components/Notice.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function TalentPage() {
  const [field, setField] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const { data, error, loading, reload } = useApiData(() => listPublicProfiles({ field, verifiedOnly }), [field, verifiedOnly]);

  return (
    <div className="container page">
      <div className="page-header">
        <h1>Talent directory</h1>
        <p>People who chose to publish their profile. Verified items were checked by a reviewer or passed an assessment; everything else is clearly marked as a claim.</p>
      </div>

      <form className="card form" style={{ marginBottom: 20 }} onSubmit={(e) => e.preventDefault()} aria-label="Filters">
        <div className="form-row">
          <div className="field">
            <label htmlFor="field-filter">Field</label>
            <select id="field-filter" value={field} onChange={(e) => setField(e.target.value)}>
              <option value="">All fields</option>
              {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="field" style={{ alignContent: 'end' }}>
            <label className="check" style={{ minHeight: 44, alignItems: 'center' }}>
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
              <span>Only people with something verified</span>
            </label>
          </div>
        </div>
      </form>

      {loading && <Loading label="Searching" />}
      {error && <><Notice tone="error">{error}</Notice><button className="btn btn-secondary" onClick={reload}>Try again</button></>}
      {!loading && !error && data && data.length === 0 && (
        <EmptyState title="No profiles match yet">Try another field, or turn off the verified filter.</EmptyState>
      )}
      {!loading && !error && data && data.length > 0 && (
        <>
          <p className="muted" aria-live="polite">{plural(data.length, 'profile')} found</p>
          <div className="grid">
            {data.map((p) => (
              <article className="card talent-card" key={p.slug} aria-label={p.full_name}>
                <div className="row">
                  <div className="avatar" aria-hidden="true">{initials(p.full_name)}</div>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', marginBottom: 0 }}>{p.full_name}</h2>
                    <div className="muted small">{[p.field, p.current_country].filter(Boolean).join(' · ')}</div>
                  </div>
                </div>
                {p.headline && <p style={{ margin: 0 }}>{p.headline}</p>}
                <div className="chips">
                  <span className={`badge ${p.verified_credentials > 0 ? 'badge-success' : 'badge-neutral'}`}>{p.verified_credentials} of {plural(p.total_credentials, 'claim')} verified</span>
                  <span className={`badge ${p.passed_assessments > 0 ? 'badge-success' : 'badge-neutral'}`}>{plural(p.passed_assessments, 'assessment')} passed</span>
                </div>
                <Link className="btn btn-secondary btn-sm" to={`/p/${p.slug}`}>View profile</Link>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
