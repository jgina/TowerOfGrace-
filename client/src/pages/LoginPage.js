import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import SEO from '../components/SEO';
import FormField from '../components/FormField';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/account';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.role === 'admin' && from === '/account' ? '/admin' : from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const signedIn = await login(form);
      navigate(signedIn.role === 'admin' && from === '/account' ? '/admin' : from, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <SEO title="Sign In" noIndex />
      <section className="auth-page">
        <div className="auth-card card">
          <span className="eyebrow">Welcome back</span>
          <h1 className="display-title">Sign In</h1>
          <p className="text-muted">Access your orders, saved addresses and faster checkout.</p>
          {error && <div className="form-alert form-alert--error">{error}</div>}
          <form onSubmit={submit} className="stack">
            <FormField label="Email" required>
              <input className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </FormField>
            <FormField label="Password" required>
              <input className="input" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </FormField>
            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={busy}>
              {busy ? <span className="spinner" /> : <LogIn />} Sign In
            </button>
          </form>
          <p className="auth-card__switch">
            New customer?{' '}
            <Link to="/register" state={location.state} className="link">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
