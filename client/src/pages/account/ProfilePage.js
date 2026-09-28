import { useState } from 'react';
import FormField from '../../components/FormField';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../services/authService';
import { formatDate } from '../../utils/format';
import './AccountPages.css';

export default function ProfilePage() {
  const { user, setUser, applyAuthResult } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [pwError, setPwError] = useState('');

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      setUser(await authService.updateProfile(profile));
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (passwords.newPassword !== passwords.confirm) {
      setPwError('New passwords do not match');
      return;
    }
    setChanging(true);
    try {
      const result = await authService.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      applyAuthResult(result);
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password changed');
    } catch (error) {
      setPwError(error.message);
    } finally {
      setChanging(false);
    }
  };

  return (
    <>
      <form className="card account-panel" onSubmit={saveProfile}>
        <div className="account-panel__head">
          <h2>Profile</h2>
          <span className="text-muted account-meta">Member since {formatDate(user.createdAt)}</span>
        </div>
        <div className="form-grid">
          <FormField label="Full name" required>
            <input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </FormField>
          <FormField label="Phone">
            <input className="input" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </FormField>
          <FormField label="Email" hint="Contact us to change the email on your account.">
            <input className="input" value={user.email} disabled />
          </FormField>
        </div>
        <div className="account-actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving && <span className="spinner" />} Save changes
          </button>
        </div>
      </form>

      <form className="card account-panel" onSubmit={changePassword}>
        <div className="account-panel__head">
          <h2>Change Password</h2>
        </div>
        {pwError && <div className="form-alert form-alert--error">{pwError}</div>}
        <div className="form-grid">
          <FormField label="Current password" required className="span-all">
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
            />
          </FormField>
          <FormField label="New password" required hint="At least 8 characters with a letter and a number">
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            />
          </FormField>
          <FormField label="Confirm new password" required>
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
            />
          </FormField>
        </div>
        <div className="account-actions">
          <button type="submit" className="btn btn--outline" disabled={changing}>
            {changing && <span className="spinner" />} Update password
          </button>
        </div>
      </form>
    </>
  );
}
