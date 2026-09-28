import { NavLink, Outlet } from 'react-router-dom';
import { MapPin, Package, User, LogOut } from 'lucide-react';
import PageHero from '../components/PageHero';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import './AccountLayout.css';

export default function AccountLayout() {
  const { user, logout } = useAuth();
  return (
    <>
      <SEO title="My Account" noIndex />
      <PageHero title="My Account" subtitle={`Welcome back, ${user?.name?.split(' ')[0] || ''}`} compact crumbs={[{ label: 'My Account' }]} />
      <section className="section">
        <div className="container account-layout">
          <aside className="account-nav card">
            <NavLink to="/account" end>
              <User /> Profile
            </NavLink>
            <NavLink to="/account/orders">
              <Package /> My Orders
            </NavLink>
            <NavLink to="/account/addresses">
              <MapPin /> Addresses
            </NavLink>
            <button type="button" onClick={logout}>
              <LogOut /> Sign Out
            </button>
          </aside>
          <div className="account-content">
            <Outlet />
          </div>
        </div>
      </section>
    </>
  );
}
