import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mail, Phone, CalendarDays, ShoppingBag, Wallet, MapPin } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import AdminStatsCard from '../../components/AdminStatsCard';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/Modal';
import { PageLoader, ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import './AdminCustomerDetailsPage.css';

export default function AdminCustomerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useFetch(() => adminService.getCustomer(id), [id]);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { customer, orders, totals } = data;

  const toggle = async () => {
    setBusy(true);
    try {
      const result = await adminService.setCustomerStatus(customer._id, !customer.isActive);
      setData((d) => ({ ...d, customer: result.customer }));
      toast.success(result.customer.isActive ? 'Account reactivated' : 'Account deactivated');
      setConfirming(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        back={{ to: '/admin/customers', label: 'Customers' }}
        eyebrow="Customer"
        title={customer.name}
        actions={
          <button type="button" className={`btn ${customer.isActive ? 'btn--outline' : 'btn--primary'}`} onClick={() => setConfirming(true)}>
            {customer.isActive ? 'Deactivate account' : 'Reactivate account'}
          </button>
        }
      />

      <div className="acd-grid">
        <section className="admin-card acd-profile">
          <div className="admin-card__body">
            <span className="admin-avatar acd-avatar">{customer.name.charAt(0).toUpperCase()}</span>
            <StatusBadge tone={customer.isActive ? 'success' : 'danger'}>{customer.isActive ? 'Active' : 'Deactivated'}</StatusBadge>
            <ul>
              <li>
                <Mail /> <a href={`mailto:${customer.email}`}>{customer.email}</a>
              </li>
              {customer.phone && (
                <li>
                  <Phone /> <a href={`tel:${customer.phone}`}>{customer.phone}</a>
                </li>
              )}
              <li>
                <CalendarDays /> Registered {formatDate(customer.createdAt)}
              </li>
              {customer.lastLoginAt && (
                <li>
                  <CalendarDays /> Last sign-in {formatDateTime(customer.lastLoginAt)}
                </li>
              )}
            </ul>
            {customer.addresses?.length > 0 && (
              <div className="acd-addresses">
                <span className="field__label">Saved addresses</span>
                {customer.addresses.map((a) => (
                  <p key={a._id}>
                    <MapPin /> {a.address}, {a.city}, {a.state}
                  </p>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="acd-main">
          <div className="acd-stats">
            <AdminStatsCard icon={ShoppingBag} label="Orders" value={totals.orders} />
            <AdminStatsCard tone="dark" icon={Wallet} label="Total spent (paid)" value={formatCurrency(totals.spent)} />
          </div>
          <section className="admin-card">
            <div className="admin-card__head">
              <h2>Order History</h2>
            </div>
            <DataTable
              dense
              rows={orders}
              onRowClick={(o) => navigate(`/admin/orders/${o._id}`)}
              empty={{ icon: ShoppingBag, title: 'No orders yet', text: 'This customer has not placed an order while signed in.' }}
              columns={[
                { key: 'orderNumber', header: 'Order', render: (o) => <span className="cell-title">{o.orderNumber}</span> },
                { key: 'createdAt', header: 'Date', render: (o) => formatDate(o.createdAt) },
                { key: 'total', header: 'Total', align: 'right', render: (o) => <span className="cell-number">{formatCurrency(o.total)}</span> },
                { key: 'paymentStatus', header: 'Payment', render: (o) => <StatusBadge status={o.paymentStatus} size="sm" /> },
                { key: 'orderStatus', header: 'Status', render: (o) => <StatusBadge status={o.orderStatus} size="sm" /> },
              ]}
            />
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title={customer.isActive ? 'Deactivate this account?' : 'Reactivate this account?'}
        message={
          customer.isActive
            ? `${customer.name} will be signed out and unable to sign in. Their order history is kept.`
            : `${customer.name} will be able to sign in again.`
        }
        confirmLabel={customer.isActive ? 'Deactivate' : 'Reactivate'}
        danger={customer.isActive}
        busy={busy}
        onConfirm={toggle}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
