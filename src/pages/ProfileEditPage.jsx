import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { updateMyProfile } from '../lib/api.js';
import { FIELDS } from '../lib/constants.js';
import { validateProfile, hasErrors } from '../lib/validation.js';
import Field from '../components/Field.jsx';
import Notice from '../components/Notice.jsx';

export default function ProfileEditPage() {
  const { user, profile, setProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: profile.full_name, headline: profile.headline, field: profile.field, origin_country: profile.origin_country,
    current_country: profile.current_country, bio: profile.bio, slug: profile.slug || '', is_public: profile.is_public,
  });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const set = (key) => (e) => { setSaved(false); setForm({ ...form, [key]: e.target.value }); };
  const link = profile.slug ? `${window.location.origin}/p/${profile.slug}` : '';

  const submit = async (e) => {
    e.preventDefault();
    const found = validateProfile(form);
    setErrors(found);
    setFailure('');
    setSaved(false);
    if (hasErrors(found)) return;
    setBusy(true);
    try {
      const updated = await updateMyProfile(user.id, form);
      setProfile(updated);
      setForm((f) => ({ ...f, slug: updated.slug || '' }));
      setSaved(true);
    } catch (err) {
      setFailure(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); }
  };

  return (
    <div className="container page" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <h1>Your profile</h1>
        <p>This is what employers see if you publish it. Claims and assessments are added on their own pages.</p>
      </div>
      <form className="card form" onSubmit={submit} noValidate>
        <Notice tone="error">{failure}</Notice>
        {saved && <Notice tone="success">Profile saved.</Notice>}
        <Field label="Full name" value={form.full_name} onChange={set('full_name')} error={errors.full_name} autoComplete="name" />
        <Field label="Headline" hint="One line, for example: Backend developer with 7 years of experience." value={form.headline} onChange={set('headline')} error={errors.headline} />
        <div className="form-row">
          <Field as="select" label="Professional field" value={form.field} onChange={set('field')} error={errors.field}>
            <option value="">Choose a field</option>
            {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
          </Field>
          <Field label="Country you are in now" value={form.current_country} onChange={set('current_country')} error={errors.current_country} />
        </div>
        <Field label="Country you come from (optional)" value={form.origin_country} onChange={set('origin_country')} error={errors.origin_country} />
        <Field as="textarea" label="About you" hint="A short summary of your experience and what you are looking for." value={form.bio} onChange={set('bio')} error={errors.bio} />

        <fieldset className="card card-flat stack-sm">
          <legend className="visually-hidden">Visibility</legend>
          <div className="check">
            <input id="is-public" type="checkbox" aria-describedby="is-public-hint" checked={form.is_public} onChange={(e) => { setSaved(false); setForm({ ...form, is_public: e.target.checked }); }} />
            <div>
              <label htmlFor="is-public">Publish my profile in the talent directory</label>
              <div className="muted small" id="is-public-hint" style={{ fontWeight: 400 }}>
                Anyone with the link can see your name, headline, field, location, summary, claims and assessments. Evidence files, reviewer notes and your email are never shown.
              </div>
            </div>
          </div>
          <Field label="Your link name" hint="Letters, numbers and dashes. Leave empty and we will choose one." value={form.slug} onChange={set('slug')} error={errors.slug} />
        </fieldset>

        <div className="row">
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save profile'}</button>
          {profile.is_public && profile.slug && <Link className="btn btn-secondary" to={`/p/${profile.slug}`}>View public profile</Link>}
        </div>
        {profile.is_public && link && (
          <div className="callout small">
            Your public link: <code>{link}</code>{' '}
            <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
          </div>
        )}
      </form>
    </div>
  );
}
