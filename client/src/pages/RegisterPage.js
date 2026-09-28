import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import SEO from '../components/SEO';
import FormField from '../components/FormField';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/account';
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Your name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      errs.password = 'At least 8 characters with a letter and a number';
    }
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setError('');
    setBusy(true);
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <SEO title="Create Account" noIndex />
      <section className="auth-page">
        <div className="auth-card card">
          <span className="eyebrow">Join us</span>
          <h1 className="display-title">Create Account</h1>
          <p className="text-muted">Track orders, save delivery addresses and check out faster.</p>
          {error && <div className="form-alert form-alert--error">{error}</div>}
          <form onSubmit={submit} className="stack" noValidate>
            <FormField label="Full name" required error={errors.name}>
              <input className="input" autoComplete="name" value={form.name} onChange={set('name')} />
            </FormField>
            <FormField label="Email" required error={errors.email}>
              <input className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
            </FormField>
            <FormField label="Phone">
              <input className="input" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
            </FormField>
            <FormField label="Password" required error={errors.password} hint="At least 8 characters with a letter and a number">
              <input className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
            </FormField>
            <FormField label="Confirm password" required error={errors.confirm}>
              <input className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
            </FormField>
            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={busy}>
              {busy ? <span className="spinner" /> : <UserPlus />} Create Account
            </button>
          </form>
          <p className="auth-card__switch">
            Already have an account?{' '}
            <Link to="/login" state={location.state} className="link">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
