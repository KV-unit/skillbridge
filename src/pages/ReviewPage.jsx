import { useState } from 'react';
import { useApiData } from '../lib/useApiData.js';
import { getReviewerQueue, reviewCredential, decideWaiver, getEvidenceUrl } from '../lib/api.js';
import { VERIFICATION_METHODS } from '../lib/constants.js';
import { formatDate, kindLabel, plural } from '../lib/format.js';
import Loading from '../components/Loading.jsx';
import Notice from '../components/Notice.jsx';
import EmptyState from '../components/EmptyState.jsx';

function CredentialReview({ item, onDone }) {
  const [decision, setDecision] = useState('approve');
  const [method, setMethod] = useState('document_review');
  const [note, setNote] = useState('');
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);

  const open = async (file) => {
    setFailure('');
    try {
      const url = await getEvidenceUrl(file.file_path);
      const win = window.open(url, '_blank');
      if (win) { try { win.opener = null; } catch { /* ignore */ } } else setFailure(`Your browser blocked the new tab. Open it here: ${url}`);
    } catch (e) { setFailure(e.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setFailure('');
    if (decision === 'reject' && note.trim().length < 5) { setFailure('Please explain what is missing so the candidate can fix it.'); return; }
    setBusy(true);
    try {
      await reviewCredential({ id: item.id, decision, method: decision === 'approve' ? method : null, note });
      await onDone(`${decision === 'approve' ? 'Approved' : 'Sent back'}: ${item.title} (${item.owner_name}).`);
    } catch (err) {
      setFailure(err.message);
      setBusy(false);
    }
  };

  return (
    <article className="card stack-sm" aria-label={`${item.title} by ${item.owner_name}`}>
      <div className="row between">
        <h3 style={{ marginBottom: 0 }}>{item.title}</h3>
        <span className="muted small">Sent {formatDate(item.updated_at)}</span>
      </div>
      <div className="muted">{item.owner_name} · {[kindLabel(item.kind), item.institution, item.country, item.year, item.field].filter(Boolean).join(' · ')}</div>
      {item.description && <p style={{ margin: 0 }}>{item.description}</p>}
      <div>
        <strong className="small">Evidence ({item.evidence.length})</strong>
        {item.evidence.length === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>No files. Consider a reference check or an interview.</p>
        ) : (
          <ul className="files">
            {item.evidence.map((f) => (
              <li key={f.id}><span>{f.file_name}</span><button type="button" className="btn btn-ghost btn-sm" onClick={() => open(f)} aria-label={`Open ${f.file_name}`}>Open</button></li>
            ))}
          </ul>
        )}
      </div>
      <form className="form" onSubmit={submit} noValidate>
        <Notice tone="error">{failure}</Notice>
        <fieldset className="row">
          <legend className="visually-hidden">Decision</legend>
          <label className="check"><input type="radio" name={`d-${item.id}`} checked={decision === 'approve'} onChange={() => setDecision('approve')} /> Approve</label>
          <label className="check"><input type="radio" name={`d-${item.id}`} checked={decision === 'reject'} onChange={() => setDecision('reject')} /> Ask for changes</label>
        </fieldset>
        {decision === 'approve' && (
          <div className="field">
            <label htmlFor={`m-${item.id}`}>How was it verified?</label>
            <select id={`m-${item.id}`} value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(VERIFICATION_METHODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor={`n-${item.id}`}>{decision === 'approve' ? 'Note (optional)' : 'What is missing? (required)'}</label>
          <textarea id={`n-${item.id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
        </div>
        <div><button className="btn btn-primary btn-sm" type="submit" disabled={busy}>{busy ? 'Saving...' : decision === 'approve' ? 'Approve claim' : 'Send back with note'}</button></div>
      </form>
    </article>
  );
}

function WaiverReview({ item, onDone }) {
  const [note, setNote] = useState('');
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);

  const decide = async (decision) => {
    setBusy(true);
    setFailure('');
    try {
      await decideWaiver({ id: item.id, decision, note });
      await onDone(`${decision === 'approve' ? 'Approved' : 'Declined'} the fee waiver for ${item.owner_name}.`);
    } catch (err) {
      setFailure(err.message);
      setBusy(false);
    }
  };

  return (
    <article className="card stack-sm" aria-label={`Fee waiver for ${item.owner_name}`}>
      <h3 style={{ marginBottom: 0 }}>{item.step_title}</h3>
      <div className="muted">{item.owner_name} · {item.provider} · requested {formatDate(item.created_at)}</div>
      {item.message && <p style={{ margin: 0 }}>&ldquo;{item.message}&rdquo;</p>}
      <Notice tone="error">{failure}</Notice>
      <div className="field">
        <label htmlFor={`wn-${item.id}`}>Note to the candidate (optional)</label>
        <textarea id={`wn-${item.id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
      </div>
      <div className="actions">
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => decide('approve')}>Approve waiver</button>
        <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => decide('decline')}>Decline</button>
      </div>
    </article>
  );
}

export default function ReviewPage() {
  const { data, error, loading, reload } = useApiData(getReviewerQueue, []);
  const [tab, setTab] = useState('credentials');
  const [flash, setFlash] = useState('');

  if (loading && !data) return <Loading label="Loading the review queue" />;
  if (error) return <div className="container page"><Notice tone="error">{error}</Notice><button className="btn btn-secondary" onClick={reload}>Try again</button></div>;

  const done = async (message) => { setFlash(message); await reload(); };

  return (
    <div className="container page" style={{ maxWidth: 820 }}>
      <div className="page-header">
        <h1>Review queue</h1>
        <p>Check each claim and its evidence, then record how it was verified. Candidates see your decision and note. You cannot review your own claims.</p>
      </div>
      <Notice tone="success">{flash}</Notice>
      <div className="tabs" role="tablist" aria-label="Queues">
        <button className="tab" role="tab" aria-selected={tab === 'credentials'} onClick={() => setTab('credentials')}>Claims ({data.credentials.length})</button>
        <button className="tab" role="tab" aria-selected={tab === 'waivers'} onClick={() => setTab('waivers')}>Fee waivers ({data.waivers.length})</button>
      </div>
      <div className="stack" role="tabpanel">
        {tab === 'credentials' && (data.credentials.length === 0
          ? <EmptyState title="Nothing waiting">No claims are waiting for review.</EmptyState>
          : <>
              <p className="muted" aria-live="polite">{plural(data.credentials.length, 'claim')} waiting, oldest first.</p>
              {data.credentials.map((c) => <CredentialReview key={c.id} item={c} onDone={done} />)}
            </>)}
        {tab === 'waivers' && (data.waivers.length === 0
          ? <EmptyState title="Nothing waiting">No fee-waiver requests are waiting.</EmptyState>
          : data.waivers.map((w) => <WaiverReview key={w.id} item={w} onDone={done} />))}
      </div>
    </div>
  );
}
