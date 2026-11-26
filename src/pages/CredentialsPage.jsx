import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiData } from '../lib/useApiData.js';
import {
  listMyCredentials, createCredential, updateCredential, submitCredential, withdrawCredential, deleteCredential, uploadEvidence, deleteEvidence,
} from '../lib/api.js';
import Loading from '../components/Loading.jsx';
import Notice from '../components/Notice.jsx';
import EmptyState from '../components/EmptyState.jsx';
import CredentialForm from '../components/CredentialForm.jsx';
import ClaimCard from '../components/ClaimCard.jsx';

export default function CredentialsPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApiData(() => listMyCredentials(user.id), [user.id]);
  const [mode, setMode] = useState(null); // null, 'add' or a claim being edited
  const [flash, setFlash] = useState({ tone: 'success', text: '' });
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Loading label="Loading your claims" />;
  if (error) return <div className="container page"><Notice tone="error">{error}</Notice><button className="btn btn-secondary" onClick={reload}>Try again</button></div>;

  const say = (text, tone = 'success') => setFlash({ tone, text });
  const guard = async (work, doneMessage) => {
    setBusy(true);
    setFlash({ tone: 'success', text: '' });
    try {
      await work();
      await reload();
      if (doneMessage) say(doneMessage);
    } catch (e) {
      say(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const add = async (form) => { await createCredential(user.id, form); setMode(null); await reload(); say('Claim added. Attach evidence, then send it for review.'); };
  const edit = async (form) => { await updateCredential(mode.id, form); setMode(null); await reload(); say('Claim updated.'); };
  const upload = async (claim, file, count) => {
    await uploadEvidence({ userId: user.id, credentialId: claim.id, file, existingCount: count });
    await reload();
    say(`Added ${file.name}.`);
  };
  const remove = (claim) => {
    if (!window.confirm(`Delete "${claim.title}" and its files? This cannot be undone.`)) return;
    guard(() => deleteCredential(claim.id, data.evidenceByCredential[claim.id] || []), 'Claim deleted.');
  };

  return (
    <div className="container page" style={{ maxWidth: 820 }}>
      <div className="page-header row between">
        <div>
          <h1>My claims</h1>
          <p>Add each qualification or job you want to be recognised. A reviewer checks it and records how. Anything not yet checked is shown honestly as a claim.</p>
        </div>
        {mode === null && <button type="button" className="btn btn-primary" onClick={() => { setFlash({ tone: 'success', text: '' }); setMode('add'); }}>Add a claim</button>}
      </div>

      <Notice tone={flash.tone}>{flash.text}</Notice>

      {mode === 'add' && <CredentialForm onSubmit={add} onCancel={() => setMode(null)} submitLabel="Add claim" />}
      {mode && mode !== 'add' && (
        <CredentialForm initial={mode} onSubmit={edit} onCancel={() => setMode(null)} resetsReview={mode.status === 'verified' || mode.status === 'pending'} />
      )}

      <div className="stack" style={{ marginTop: 20 }}>
        {data.credentials.length === 0 && mode === null && (
          <EmptyState title="No claims yet" action={<button type="button" className="btn btn-primary" onClick={() => setMode('add')}>Add your first claim</button>}>
            Start with the most important degree, certificate or job. You do not need documents to begin.
          </EmptyState>
        )}
        {data.credentials.map((c) => (
          <ClaimCard
            key={c.id}
            claim={c}
            evidence={data.evidenceByCredential[c.id]}
            busy={busy}
            onEdit={(claim) => { setFlash({ tone: 'success', text: '' }); setMode(claim); window.scrollTo && window.scrollTo(0, 0); }}
            onSubmit={(claim) => guard(() => submitCredential(claim.id), 'Sent for review. You will see the decision on this page.')}
            onWithdraw={(claim) => guard(() => withdrawCredential(claim.id), 'Withdrawn from review.')}
            onDelete={remove}
            onUpload={upload}
            onRemoveFile={(file) => guard(() => deleteEvidence(file), 'File removed.')}
          />
        ))}
      </div>
    </div>
  );
}
