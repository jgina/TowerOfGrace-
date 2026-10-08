import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileSpreadsheet, Bird, Wheat, Pill, Beef, Package, Tags, Warehouse, Skull, Truck, ShoppingBag, Users, Building2, Mail, FileText, Images, Award, Settings,
  Menu, X, ExternalLink, LogOut,
} from 'lucide-react';
import Logo from '../components/Logo';
import SEO from '../components/SEO';
import AdminNotifications from '../components/AdminNotifications';
import { PageLoader } from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import './AdminLayout.css';

const NAV = [
  {
    group: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/reports', label: 'Statements & Reports', icon: FileSpreadsheet },
    ],
  },
  {
    group: 'Catalogue',
    items: [
      { to: '/admin/products', label: 'Products', icon: Package },
      { to: '/admin/categories', label: 'Categories', icon: Tags },
      { to: '/admin/batches', label: 'Flock Batches', icon: Bird },
      { to: '/admin/feeds', label: 'Feed Store', icon: Wheat },
      { to: '/admin/medicines', label: 'Medicine Store', icon: Pill },
      { to: '/admin/processing', label: 'Meat Processing', icon: Beef },
      { to: '/admin/inventory', label: 'Inventory', icon: Warehouse },
      { to: '/admin/market-trips', label: 'Market Trips', icon: Truck },
      { to: '/admin/losses', label: 'Mortality & Losses', icon: Skull },
    ],
  },
  {
    group: 'Sales',
    items: [
      { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
      { to: '/admin/customers', label: 'Customers', icon: Users },
      { to: '/admin/bulk-orders', label: 'Bulk Requests', icon: Building2 },
      { to: '/admin/messages', label: 'Messages', icon: Mail },
    ],
  },
  {
    group: 'Website',
    items: [
      { to: '/admin/content', label: 'Content', icon: FileText },
      { to: '/admin/gallery', label: 'Gallery', icon: Images },
      { to: '/admin/certifications', label: 'Certifications', icon: Award },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="admin-shell">
      <SEO title="Admin" noIndex />
      <aside className={`admin-sidebar ${open ? 'is-open' : ''}`} aria-label="Admin navigation">
        <div className="admin-sidebar__brand">
          <Logo to="/admin" size="sm" />
          <button type="button" className="icon-btn admin-sidebar__close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X />
          </button>
        </div>
        <span className="admin-sidebar__tag">Control Panel</span>
        <nav className="admin-nav">
          {NAV.map((section) => (
            <div key={section.group} className="admin-nav__group">
              <span className="admin-nav__label">{section.group}</span>
              {section.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end} className="admin-nav__link">
                  <Icon aria-hidden="true" /> {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-sidebar__foot">
          <Link to="/" className="admin-nav__link" target="_blank">
            <ExternalLink aria-hidden="true" /> View website
          </Link>
          <button type="button" className="admin-nav__link" onClick={logout}>
            <LogOut aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>
      {open && <div className="admin-backdrop" onClick={() => setOpen(false)} />}

      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="icon-btn admin-topbar__menu" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </button>
          <span className="admin-topbar__title">Tower of Grace Farms · Admin</span>
          <div className="admin-topbar__user">
            <AdminNotifications />
            <span className="admin-avatar" aria-hidden="true">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
            <span className="admin-topbar__name hide-mobile">
              <strong>{user?.name}</strong>
              <small>Administrator</small>
            </span>
          </div>
        </header>
        <main className="admin-content">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
