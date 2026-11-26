import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { validateRegistration, hasErrors } from '../lib/validation.js';
import Field from '../components/Field.jsx';
import Notice from '../components/Notice.jsx';

export default function RegisterPage() {
  const { user, signUp } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = validateRegistration(form);
    setErrors(found);
    setFailure('');
    if (hasErrors(found)) return;
    setBusy(true);
    try {
      const result = await signUp(form);
      if (result.needsConfirmation) setCheckEmail(true);
    } catch (err) {
      setFailure(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (checkEmail) {
    return (
      <div className="container page" style={{ maxWidth: 520 }}>
        <div className="card stack">
          <h1>Check your email</h1>
          <p>We sent a confirmation link to <strong>{form.email}</strong>. Open it, then <Link to="/login">log in</Link>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container page" style={{ maxWidth: 480 }}>
      <div className="page-header">
        <h1>Create your profile</h1>
        <p>It is free. You decide what is public, and you can start with nothing but your name.</p>
      </div>
      <form className="card form" onSubmit={submit} noValidate>
        <Notice tone="error">{failure}</Notice>
        <Field label="Full name" autoComplete="name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} />
        <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <Field label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." value={form.password} onChange={set('password')} error={errors.password} />
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create my profile'}</button>
        <p className="muted small" style={{ marginBottom: 0 }}>
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
