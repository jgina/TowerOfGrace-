import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, Phone, Search, ShoppingCart, User, X, Mail, LayoutDashboard, LogOut } from 'lucide-react';
import Logo from './Logo';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import './Header.css';

const PRODUCT_LINKS = [
  { to: '/products', label: 'All Products' },
  { to: '/products/broilers', label: 'Broilers' },
  { to: '/products/noilers', label: 'Noilers' },
  { to: '/products/eggs', label: 'Eggs' },
  { to: '/products/turkeys', label: 'Turkeys' },
];

const COMPANY_LINKS = [
  { to: '/about', label: 'About Us' },
  { to: '/our-farm', label: 'Our Farm' },
  { to: '/quality-and-hygiene', label: 'Quality & Hygiene' },
  { to: '/how-we-produce', label: 'How We Produce' },
  { to: '/gallery', label: 'Gallery' },
];

function Dropdown({ label, links }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  const active = links.some((link) => location.pathname.startsWith(link.to));

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="nav-dropdown" ref={ref} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className={`nav-link ${active ? 'is-active' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label} <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className="nav-dropdown__menu">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end className="nav-dropdown__item">
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { count } = useCart();
  const { user, isAdmin, logout } = useAuth();
  const { content } = useContent();
  const { contact, announcement } = content;
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const submitSearch = (event) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
    setSearchOpen(false);
  };

  const hasContactBar = contact.phone || contact.email;

  return (
    <>
      {announcement.enabled && announcement.text && (
        <div className="announcement">
          <div className="container announcement__inner">
            <span>{announcement.text}</span>
            {announcement.link && (
              <Link to={announcement.link} className="announcement__link">
                {announcement.linkLabel || 'Learn more'}
              </Link>
            )}
          </div>
        </div>
      )}

      {hasContactBar && (
        <div className="topbar hide-mobile">
          <div className="container topbar__inner">
            <div className="topbar__contacts">
              {contact.phone && (
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>
                  <Phone aria-hidden="true" /> {contact.phone}
                </a>
              )}
              {contact.email && (
                <a href={`mailto:${contact.email}`}>
                  <Mail aria-hidden="true" /> {contact.email}
                </a>
              )}
            </div>
            <div className="topbar__links">
              <Link to="/bulk-orders">Bulk Supply</Link>
              <Link to="/track-order">Track Order</Link>
            </div>
          </div>
        </div>
      )}

      <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="container site-header__inner">
          <Logo />

          <nav className="site-nav hide-tablet" aria-label="Main navigation">
            <NavLink to="/" end className="nav-link">
              Home
            </NavLink>
            <NavLink to="/shop" className="nav-link">
              Shop
            </NavLink>
            <Dropdown label="Products" links={PRODUCT_LINKS} />
            <Dropdown label="Company" links={COMPANY_LINKS} />
            <NavLink to="/bulk-orders" className="nav-link">
              Bulk Orders
            </NavLink>
            <NavLink to="/contact" className="nav-link">
              Contact
            </NavLink>
          </nav>

          <div className="site-header__actions">
            <button type="button" className="header-icon" aria-label="Search products" onClick={() => setSearchOpen((v) => !v)}>
              <Search />
            </button>
            {user ? (
              <div className="nav-dropdown account-menu hide-mobile">
                <Link to={isAdmin ? '/admin' : '/account'} className="header-icon" aria-label="My account">
                  <User />
                </Link>
                <div className="nav-dropdown__menu nav-dropdown__menu--right">
                  <span className="account-menu__name">{user.name}</span>
                  {isAdmin && (
                    <Link to="/admin" className="nav-dropdown__item">
                      <LayoutDashboard /> Admin Panel
                    </Link>
                  )}
                  <Link to="/account" className="nav-dropdown__item">
                    My Account
                  </Link>
                  <Link to="/account/orders" className="nav-dropdown__item">
                    My Orders
                  </Link>
                  <button type="button" className="nav-dropdown__item" onClick={logout}>
                    <LogOut /> Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="header-icon hide-mobile" aria-label="Sign in">
                <User />
              </Link>
            )}
            <Link to="/cart" className="header-icon header-icon--cart" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
              <ShoppingCart />
              {count > 0 && <span className="cart-badge">{count > 99 ? '99+' : count}</span>}
            </Link>
            <Link to="/shop" className="btn btn--accent hide-tablet">
              Order Now
            </Link>
            <button
              type="button"
              className="header-icon menu-toggle"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu />
            </button>
          </div>
        </div>

        {searchOpen && (
          <form className="header-search" onSubmit={submitSearch} role="search">
            <div className="container header-search__inner">
              <div className="input-group">
                <Search aria-hidden="true" />
                <input
                  autoFocus
                  className="input"
                  type="search"
                  placeholder="Search broilers, noilers, eggs, turkeys…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search products"
                />
              </div>
              <button type="submit" className="btn btn--primary">
                Search
              </button>
            </div>
          </form>
        )}
      </header>

      <div className={`mobile-drawer ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <div className="mobile-drawer__backdrop" onClick={() => setMenuOpen(false)} />
        <aside className="mobile-drawer__panel" aria-label="Mobile navigation">
          <div className="mobile-drawer__head">
            <Logo size="sm" />
            <button type="button" className="header-icon" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              <X />
            </button>
          </div>
          <nav className="mobile-nav">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/shop">Shop</NavLink>
            <span className="mobile-nav__label">Products</span>
            {PRODUCT_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end className="mobile-nav__sub">
                {link.label}
              </NavLink>
            ))}
            <span className="mobile-nav__label">Company</span>
            {COMPANY_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className="mobile-nav__sub">
                {link.label}
              </NavLink>
            ))}
            <NavLink to="/bulk-orders">Bulk Orders</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <NavLink to="/track-order">Track Order</NavLink>
          </nav>
          <div className="mobile-drawer__foot">
            {user ? (
              <>
                {isAdmin && (
                  <Link to="/admin" className="btn btn--primary btn--block">
                    Admin Panel
                  </Link>
                )}
                <Link to="/account" className="btn btn--outline btn--block">
                  My Account
                </Link>
                <button type="button" className="btn btn--ghost btn--block" onClick={logout}>
                  Sign Out
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn--outline btn--block">
                Sign In / Register
              </Link>
            )}
            <Link to="/shop" className="btn btn--accent btn--block">
              Order Now
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
