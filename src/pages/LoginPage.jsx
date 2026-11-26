import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { validateLogin, hasErrors } from '../lib/validation.js';
import Field from '../components/Field.jsx';
import Notice from '../components/Notice.jsx';

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={(location.state && location.state.from) || '/dashboard'} replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const found = validateLogin(form);
    setErrors(found);
    setFailure('');
    if (hasErrors(found)) return;
    setBusy(true);
    try {
      await signIn(form);
    } catch (err) {
      setFailure(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="container page" style={{ maxWidth: 480 }}>
      <div className="page-header">
        <h1>Log in</h1>
        <p>Welcome back. Pick up where you left off.</p>
      </div>
      <form className="card form" onSubmit={submit} noValidate>
        <Notice tone="error">{failure}</Notice>
        <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
        <Field label="Password" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} />
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Logging in...' : 'Log in'}</button>
        <p className="muted small" style={{ marginBottom: 0 }}>
          New here? <Link to="/register">Create your profile</Link>
        </p>
      </form>
    </div>
  );
}
