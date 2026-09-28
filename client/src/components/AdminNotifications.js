import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Receipt, BellRing, ShoppingBag, BadgeCheck, Building2, Mail, CheckCheck } from 'lucide-react';
import { adminService } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import { timeAgo } from '../utils/format';
import './AdminNotifications.css';

const POLL_MS = 20000;
const ICONS = {
  RECEIPT_UPLOADED: Receipt,
  TRANSFER_NOTICE: BellRing,
  NEW_ORDER: ShoppingBag,
  PAYMENT_RECEIVED: BadgeCheck,
  BULK_REQUEST: Building2,
  CONTACT_MESSAGE: Mail,
};
// Payment-related alerts are the ones that need action, so they also pop up as toasts.
const URGENT = ['RECEIPT_UPLOADED', 'TRANSFER_NOTICE', 'PAYMENT_RECEIVED'];

// Short two-tone chime via Web Audio (no audio file needed). Browsers only allow it after the admin has interacted with the page.
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.15 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.32);
    });
  } catch {
    /* audio not available */
  }
}

/** Notification bell for the admin top bar: polls for new alerts and links straight to the order to confirm. */
export default function AdminNotifications() {
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [ring, setRing] = useState(false);
  const seen = useRef(null);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await adminService.notifications({ limit: 15 });
      setItems(res.notifications);
      setUnread(res.unreadCount);

      const ids = new Set(res.notifications.map((n) => n._id));
      if (seen.current) {
        const fresh = res.notifications.filter((n) => !seen.current.has(n._id) && !n.readAt);
        if (fresh.length) {
          setRing(true);
          setTimeout(() => setRing(false), 1200);
          chime();
          fresh
            .filter((n) => URGENT.includes(n.type))
            .slice(0, 3)
            .forEach((n) =>
              toast.info(n.title, {
                duration: 9000,
                action: n.link ? (
                  <button type="button" className="link notif-toast-link" onClick={() => navigate(n.link)}>
                    Open
                  </button>
                ) : undefined,
              })
            );
        }
      }
      seen.current = ids;
    } catch {
      /* keep the last known list; the next poll will retry */
    }
  }, [navigate, toast]);

  useEffect(() => {
    load();
    const timer = setInterval(() => !document.hidden && load(), POLL_MS);
    const onVisible = () => !document.hidden && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  // Show the unread count in the browser tab so it is visible from other tabs.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s/, '');
    document.title = unread ? `(${unread}) ${base}` : base;
  }, [unread]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.readAt) {
      setItems((list) => list.map((x) => (x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x)));
      setUnread((u) => Math.max(u - 1, 0));
      adminService.markNotificationRead(n._id).catch(() => null);
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    await adminService.markAllNotificationsRead().catch(() => null);
    setItems((list) => list.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() })));
    setUnread(0);
  };

  return (
    <div className="notif" ref={wrapRef}>
      <button
        type="button"
        className={`notif__bell ${ring ? 'is-ringing' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell />
        {unread > 0 && <span className="notif__count">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="notif__panel" role="dialog" aria-label="Notifications">
          <div className="notif__head">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="notif__markall" onClick={markAll}>
                <CheckCheck /> Mark all read
              </button>
            )}
          </div>
          {items.length ? (
            <ul className="notif__list">
              {items.map((n) => {
                const Icon = ICONS[n.type] || Bell;
                return (
                  <li key={n._id}>
                    <button type="button" className={`notif__item notif__item--${n.type.toLowerCase()} ${n.readAt ? '' : 'is-unread'}`} onClick={() => openItem(n)}>
                      <span className="notif__icon">
                        <Icon aria-hidden="true" />
                      </span>
                      <span className="notif__text">
                        <strong>{n.title}</strong>
                        {n.message && <span>{n.message}</span>}
                        <small>{timeAgo(n.createdAt)}</small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="notif__empty">No notifications yet. New orders, transfer notices and receipts will appear here.</p>
          )}
        </div>
      )}
    </div>
  );
}
