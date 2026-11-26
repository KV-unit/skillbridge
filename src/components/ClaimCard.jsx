import { useState } from 'react';
import { VERIFICATION_METHODS, MAX_EVIDENCE_PER_CLAIM, EVIDENCE_TYPES } from '../lib/constants.js';
import { formatBytes, kindLabel } from '../lib/format.js';
import { getEvidenceUrl } from '../lib/api.js';
import StatusBadge from './StatusBadge.jsx';
import Notice from './Notice.jsx';

export default function ClaimCard({ claim, evidence, onEdit, onSubmit, onWithdraw, onDelete, onUpload, onRemoveFile, busy }) {
  const [problem, setProblem] = useState('');
  const [openLink, setOpenLink] = useState('');
  const files = evidence || [];
  const canUpload = files.length < MAX_EVIDENCE_PER_CLAIM;

  const open = async (file) => {
    setProblem('');
    setOpenLink('');
    try {
      const url = await getEvidenceUrl(file.file_path);
      // Not 'noopener' in the features string: that makes window.open() return null even when the tab opened,
      // so we could not tell a blocked pop-up from a success. We cut the link to this page ourselves instead.
      const win = window.open(url, '_blank');
      if (win) { try { win.opener = null; } catch { /* ignore */ } } else setOpenLink(url);
    } catch (e) {
      setProblem(e.message);
    }
  };

  const pick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setProblem('');
    try { await onUpload(claim, file, files.length); } catch (err) { setProblem(err.message); }
  };

  return (
    <article className="card claim" aria-label={claim.title}>
      <div className="claim-head">
        <div>
          <h3 style={{ marginBottom: 2 }}>{claim.title}</h3>
          <div className="claim-meta">
            {kindLabel(claim.kind)}
            {claim.institution ? ` · ${claim.institution}` : ''}
            {claim.country ? ` · ${claim.country}` : ''}
            {claim.year ? ` · ${claim.year}` : ''}
            {claim.field ? ` · ${claim.field}` : ''}
          </div>
        </div>
        <StatusBadge status={claim.status} />
      </div>

      {claim.description && <p style={{ margin: 0 }}>{claim.description}</p>}

      {claim.status === 'verified' && (
        <Notice tone="success">
          Verified: {VERIFICATION_METHODS[claim.verification_method] || 'checked by a reviewer'}.
          {claim.reviewer_note ? ` Reviewer note: ${claim.reviewer_note}` : ''}
        </Notice>
      )}
      {claim.status === 'rejected' && (
        <Notice tone="warning">A reviewer asked for changes: {claim.reviewer_note || 'please add more evidence.'} Fix it, then send it again.</Notice>
      )}
      {claim.status === 'pending' && <Notice tone="info">A reviewer will look at this soon. You will see the decision here.</Notice>}

      <div>
        <h4 style={{ fontSize: '0.95rem', marginBottom: 6 }}>Evidence ({files.length} of {MAX_EVIDENCE_PER_CLAIM})</h4>
        {files.length === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>None yet. Scans, photos, certificates or a reference letter all help. If your records are lost, you can still send the claim.</p>
        ) : (
          <ul className="files">
            {files.map((f) => (
              <li key={f.id}>
                <span>{f.file_name} <span className="muted">({formatBytes(f.file_size)})</span></span>
                <span className="actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => open(f)} aria-label={`Open ${f.file_name}`}>Open</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRemoveFile(f)} disabled={busy} aria-label={`Remove ${f.file_name}`}>Remove</button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {openLink && <p className="small">Your browser blocked the new tab. <a href={openLink} target="_blank" rel="noopener noreferrer">Open the file here</a>.</p>}
        <Notice tone="error">{problem}</Notice>
        {canUpload && (
          <label className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>
            Add a file
            <input className="visually-hidden" type="file" accept={EVIDENCE_TYPES.join(',')} onChange={pick} disabled={busy} aria-label={`Add evidence file to ${claim.title}`} />
          </label>
        )}
      </div>

      <div className="actions">
        {(claim.status === 'unverified' || claim.status === 'rejected') && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onSubmit(claim)} disabled={busy}>Send for review</button>
        )}
        {claim.status === 'pending' && <button type="button" className="btn btn-secondary btn-sm" onClick={() => onWithdraw(claim)} disabled={busy}>Withdraw from review</button>}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onEdit(claim)} disabled={busy}>Edit</button>
        <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(claim)} disabled={busy}>Delete</button>
      </div>
    </article>
  );
}
