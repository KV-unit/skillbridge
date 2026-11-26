import { useState } from 'react';
import { CREDENTIAL_KINDS, FIELDS } from '../lib/constants.js';
import { validateCredential, hasErrors } from '../lib/validation.js';
import Field from './Field.jsx';
import Notice from './Notice.jsx';

const EMPTY = { kind: 'degree', title: '', institution: '', country: '', year: '', field: '', description: '' };

export default function CredentialForm({ initial, onSubmit, onCancel, resetsReview = false, submitLabel = 'Save claim' }) {
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}), year: initial && initial.year ? String(initial.year) : '' });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = validateCredential(form);
    setErrors(found);
    setFailure('');
    if (hasErrors(found)) return;
    setBusy(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setFailure(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="card form" onSubmit={submit} noValidate aria-label={initial ? 'Edit claim' : 'Add a claim'}>
      <Notice tone="error">{failure}</Notice>
      {resetsReview && (
        <Notice tone="warning">Changing this claim sends it back to &quot;Not yet verified&quot;, because a reviewer checked the old version.</Notice>
      )}
      <div className="form-row">
        <Field as="select" label="What kind of claim is it?" value={form.kind} onChange={set('kind')} error={errors.kind}>
          {CREDENTIAL_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </Field>
        <Field as="select" label="Field" value={form.field} onChange={set('field')} error={errors.field}>
          <option value="">Choose a field</option>
          {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
        </Field>
      </div>
      <Field label="Title" hint='For example "BSc Computer Science" or "Staff nurse, Juba Teaching Hospital".' value={form.title} onChange={set('title')} error={errors.title} />
      <div className="form-row">
        <Field label="School, employer or issuer" value={form.institution} onChange={set('institution')} error={errors.institution} />
        <Field label="Country" value={form.country} onChange={set('country')} error={errors.country} />
        <Field label="Year (optional)" type="number" inputMode="numeric" value={form.year} onChange={set('year')} error={errors.year} />
      </div>
      <Field as="textarea" label="Details (optional)" hint="What did you study or do? Anything a reviewer could check, such as names of referees." value={form.description} onChange={set('description')} error={errors.description} />
      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving...' : submitLabel}</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
