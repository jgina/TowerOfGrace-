import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogIn } from 'lucide-react';
import SEO from '../../components/SEO';
import Logo from '../../components/Logo';
import FormField from '../../components/FormField';
import { useAuth } from '../../context/AuthContext';
import './AdminLoginPage.css';

export default function AdminLoginPage() {
  const { login, logout, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user && isAdmin) return <Navigate to={location.state?.from || '/admin'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const signedIn = await login(form);
      if (signedIn.role !== 'admin') {
        logout();
        setError('This account does not have administrator access.');
        setBusy(false);
        return;
      }
      navigate(location.state?.from || '/admin', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="admin-login">
      <SEO title="Admin Sign In" noIndex />
      <div className="admin-login__brand">
        <Logo variant="light" size="lg" />
        <div>
          <h1 className="display-title">
            Farm Control <span className="text-accent">Panel</span>
          </h1>
          <p>Manage products, weights, inventory, orders, customers and website content.</p>
        </div>
        <span className="admin-login__secure">
          <ShieldCheck aria-hidden="true" /> Authorised staff only
        </span>
      </div>
      <div className="admin-login__form-wrap">
        <form className="admin-login__form" onSubmit={submit}>
          <h2>Administrator Sign In</h2>
          {error && <div className="form-alert form-alert--error">{error}</div>}
          <FormField label="Email" required>
            <input className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Password" required>
            <input className="input" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </FormField>
          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={busy}>
            {busy ? <span className="spinner" /> : <LogIn />} Sign In
          </button>
          <Link to="/" className="link admin-login__back">
            Back to website
          </Link>
        </form>
      </div>
    </div>
  );
}
