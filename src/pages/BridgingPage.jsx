import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiData } from '../lib/useApiData.js';
import { listBridgingSteps, listMyWaivers, listMyCredentials, requestWaiver, cancelWaiver } from '../lib/api.js';
import { suggestBridging } from '../lib/trust.js';
import { FIELDS } from '../lib/constants.js';
import Loading from '../components/Loading.jsx';
import Notice from '../components/Notice.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

function StepCard({ step, waiver, user, onRequest, onCancel, reasons }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');

  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFailure('');
    try { await onRequest(step, message); setOpen(false); setMessage(''); } catch (err) { setFailure(err.message); } finally { setBusy(false); }
  };

  return (
    <article className="card stack-sm" aria-label={step.title}>
      <div className="row between">
        <span className="chip">{step.field}</span>
        {step.waiver_available && <span className="badge badge-info">Fee waiver possible</span>}
      </div>
      <h3 style={{ marginBottom: 0 }}>{step.title}</h3>
      <div className="muted small">{step.provider}</div>
      <p style={{ margin: 0 }}>{step.description}</p>
      {reasons && reasons.length > 0 && <p className="small" style={{ margin: 0 }}>Helps with: {reasons.join(', ')}</p>}
      <p className="muted small" style={{ margin: 0 }}>{step.cost_note}</p>
      <div className="actions">
        {step.url && <a className="btn btn-secondary btn-sm" href={step.url} target="_blank" rel="noopener noreferrer">Visit provider</a>}
        {step.waiver_available && !waiver && user && !open && <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>Request fee waiver</button>}
        {step.waiver_available && !user && <Link className="btn btn-ghost btn-sm" to="/login" state={{ from: '/bridging' }}>Log in to request a fee waiver</Link>}
      </div>
      {waiver && (
        <div className="callout small">
          Fee waiver <StatusBadge kind="waiver" status={waiver.status} />
          {waiver.reviewer_note ? <> Note: {waiver.reviewer_note}</> : null}
          {waiver.status === 'requested' && <> <button type="button" className="btn btn-ghost btn-sm" onClick={() => onCancel(waiver)}>Cancel request</button></>}
        </div>
      )}
      {open && (
        <form className="form" onSubmit={send}>
          <Notice tone="error">{failure}</Notice>
          <div className="field">
            <label htmlFor={`waiver-${step.id}`}>Why would this help you? (optional)</label>
            <textarea id={`waiver-${step.id}`} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
          </div>
          <div className="row">
            <button className="btn btn-primary btn-sm" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send request'}</button>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
    </article>
  );
}

export default function BridgingPage() {
  const { user, profile } = useAuth();
  const userId = user ? user.id : null;
  const { data, error, loading, reload } = useApiData(async () => {
    const steps = await listBridgingSteps();
    if (!userId) return { steps, waivers: [], credentials: [] };
    const [waivers, mine] = await Promise.all([listMyWaivers(userId), listMyCredentials(userId)]);
    return { steps, waivers, credentials: mine.credentials };
  }, [userId]);
  const [flash, setFlash] = useState({ tone: 'success', text: '' });

  if (loading && !data) return <Loading label="Loading bridging steps" />;
  if (error) return <div className="container page"><Notice tone="error">{error}</Notice><button className="btn btn-secondary" onClick={reload}>Try again</button></div>;

  const waiverFor = (stepId) => data.waivers.find((w) => w.bridging_step_id === stepId);
  const suggestions = user ? suggestBridging(data.credentials, data.steps, profile ? profile.field : '') : [];

  const request = async (step, message) => {
    await requestWaiver({ userId, stepId: step.id, message });
    await reload();
    setFlash({ tone: 'success', text: `Fee-waiver request sent for ${step.title}. A reviewer will decide.` });
  };
  const cancel = async (waiver) => {
    try { await cancelWaiver(waiver.id); await reload(); setFlash({ tone: 'success', text: 'Request cancelled.' }); } catch (e) { setFlash({ tone: 'error', text: e.message }); }
  };

  return (
    <div className="container page">
      <div className="page-header">
        <h1>Bridging steps</h1>
        <p>
          When a qualification cannot be verified, these routes can close the gap: certifications, credential evaluations and registrations that employers and regulators recognise.
          Costs vary by country, so check with each provider. Fee waivers are requests to partner funds and are decided by a reviewer.
        </p>
      </div>
      <Notice tone={flash.tone}>{flash.text}</Notice>

      {suggestions.length > 0 && (
        <section className="stack" aria-labelledby="suggested">
          <h2 id="suggested">Suggested for your claims</h2>
          <div className="grid">
            {suggestions.map(({ step, reasons }) => (
              <StepCard key={step.id} step={step} reasons={reasons} waiver={waiverFor(step.id)} user={user} onRequest={request} onCancel={cancel} />
            ))}
          </div>
        </section>
      )}

      {FIELDS.map((field) => {
        const steps = data.steps.filter((s) => s.field === field);
        if (steps.length === 0) return null;
        return (
          <section key={field} className="stack" style={{ marginTop: 32 }} aria-label={field}>
            <h2>{field === 'Other' ? 'Any field' : field}</h2>
            <div className="grid">
              {steps.map((s) => <StepCard key={s.id} step={s} waiver={waiverFor(s.id)} user={user} onRequest={request} onCancel={cancel} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
