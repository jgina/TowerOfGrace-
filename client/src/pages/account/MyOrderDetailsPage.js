import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, XCircle } from 'lucide-react';
import OrderView from '../../components/OrderView';
import PaymentInstructions from '../../components/PaymentInstructions';
import { ConfirmDialog } from '../../components/Modal';
import { PageLoader, ErrorState } from '../../components/Loader';
import useFetch from '../../hooks/useFetch';
import { orderService } from '../../services/orderService';
import { useToast } from '../../context/ToastContext';
import './AccountPages.css';

export default function MyOrderDetailsPage() {
  const { id } = useParams();
  const toast = useToast();
  const { data: order, loading, error, reload, setData } = useFetch(() => orderService.getMine(id), [id]);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const cancellable = order.orderStatus === 'PENDING' && order.paymentStatus !== 'PAID';

  const cancel = async () => {
    setBusy(true);
    try {
      setData(await orderService.cancelMine(order._id));
      toast.success('Order cancelled');
      setConfirming(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="order-detail-actions">
        <Link to="/account/orders" className="btn btn--ghost">
          <ArrowLeft /> All orders
        </Link>
        {cancellable && (
          <button type="button" className="btn btn--outline" onClick={() => setConfirming(true)}>
            <XCircle /> Cancel order
          </button>
        )}
      </div>
      <div className="stack">
        <PaymentInstructions order={order} onOrderUpdate={setData} />
        <OrderView order={order} />
      </div>
      <ConfirmDialog
        open={confirming}
        title="Cancel this order?"
        message={`Order ${order.orderNumber} will be cancelled and its items released. This cannot be undone.`}
        confirmLabel="Cancel order"
        danger
        busy={busy}
        onConfirm={cancel}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
