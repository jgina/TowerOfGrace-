import { useRef, useState } from 'react';
import { UploadCloud, FileText, Clock, AlertTriangle, ExternalLink, Send, X } from 'lucide-react';
import { orderService } from '../services/orderService';
import { useToast } from '../context/ToastContext';
import { formatDate, formatDateTime } from '../utils/format';
import './ReceiptUpload.css';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const today = () => new Date().toISOString().slice(0, 10);

/**
 * "I've made the transfer" form for bank-transfer orders. The receipt is optional:
 * the customer can simply notify the farm, then add a receipt later to speed up confirmation.
 */
export default function ReceiptUpload({ order, onUploaded }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [senderName, setSenderName] = useState('');
  const [transferDate, setTransferDate] = useState(today());
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [adding, setAdding] = useState(false);

  const latest = order.paymentProofs?.[order.paymentProofs.length - 1];
  const pending = latest?.status === 'PENDING';
  const pendingNotice = pending && latest.kind === 'NOTICE';
  const rejected = latest?.status === 'REJECTED';
  // While a plain notice is pending, the customer can still attach a receipt.
  const showForm = !pending || adding;
  const receiptOnly = pending && adding;

  const choose = (selected) => {
    setError('');
    if (!selected) return;
    if (!ACCEPTED.includes(selected.type)) {
      setError('Please choose a JPG, PNG or WEBP photo, or a PDF.');
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError('The file is larger than 5MB. Please upload a smaller photo or PDF.');
      return;
    }
    setFile(selected);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (receiptOnly && !file) {
      setError('Choose your receipt to upload.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await orderService.uploadPaymentProof(
        { orderNumber: order.orderNumber, email: order.customer.email, file, note, senderName, transferDate },
        setProgress
      );
      setConfirmation(result.message);
      toast.success(result.message);
      setFile(null);
      setNote('');
      setAdding(false);
      onUploaded?.(result.order);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className="receipt">
      {confirmation && (
        <div className="receipt__status receipt__status--sent" role="status">
          <Send aria-hidden="true" />
          <div>
            <strong>Sent to our team</strong>
            <p>{confirmation} You will get an email and this page will update as soon as your payment is confirmed.</p>
          </div>
          <button type="button" className="receipt__dismiss" onClick={() => setConfirmation('')} aria-label="Dismiss">
            <X />
          </button>
        </div>
      )}

      {pending && (
        <div className="receipt__status receipt__status--pending" role="status">
          <Clock aria-hidden="true" />
          <div>
            <strong>{pendingNotice ? 'Transfer notice sent — awaiting confirmation' : 'Receipt received — awaiting confirmation'}</strong>
            <p>
              Sent {formatDateTime(latest.uploadedAt)}
              {latest.senderName ? ` · from ${latest.senderName}` : ''}
              {latest.transferDate ? ` · paid ${formatDate(latest.transferDate)}` : ''}. We will confirm once the money reaches our
              account. This page updates automatically.
            </p>
            <div className="receipt__links">
              {latest.url && (
                <a href={latest.url} target="_blank" rel="noreferrer" className="link">
                  <ExternalLink /> View uploaded receipt
                </a>
              )}
              {!adding && (
                <button type="button" className="link receipt__linkbtn" onClick={() => setAdding(true)}>
                  {pendingNotice ? 'Add your receipt to speed things up' : 'Upload a different receipt'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {rejected && !pending && (
        <div className="receipt__status receipt__status--rejected" role="alert">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>We could not confirm your payment yet</strong>
            {latest.reviewNote && <p>Reason: {latest.reviewNote}</p>}
            <p>Please check your transfer and let us know again, ideally with a clear receipt.</p>
          </div>
        </div>
      )}

      {showForm && (
        <form className="receipt__form" onSubmit={submit} noValidate>
          <span className="receipt__title">{receiptOnly ? 'Upload your receipt' : 'Made the transfer? Let us know'}</span>

          {!receiptOnly && (
            <div className="receipt__grid">
              <label className="field">
                <span className="field__label">Name on the sending account</span>
                <input className="input" value={senderName} maxLength={120} onChange={(e) => setSenderName(e.target.value)} placeholder="Helps us find your payment" />
              </label>
              <label className="field">
                <span className="field__label">Date of transfer</span>
                <input className="input" type="date" max={today()} value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
              </label>
            </div>
          )}

          <button
            type="button"
            className={`receipt__drop ${file ? 'has-file' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              choose(e.dataTransfer.files?.[0]);
            }}
            disabled={busy}
          >
            {file ? (
              <>
                <FileText aria-hidden="true" />
                <span>
                  <strong>{file.name}</strong>
                  <small>{(file.size / 1024 / 1024).toFixed(2)} MB · click to change</small>
                </span>
              </>
            ) : (
              <>
                <UploadCloud aria-hidden="true" />
                <span>
                  <strong>{receiptOnly ? 'Choose a screenshot, photo or PDF' : 'Attach receipt (optional)'}</strong>
                  <small>JPG, PNG, WEBP or PDF · up to 5MB</small>
                </span>
              </>
            )}
          </button>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={(e) => choose(e.target.files?.[0])} />

          <input className="input" placeholder="Anything else we should know? (optional)" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
          {error && <span className="field__error">{error}</span>}

          <div className="receipt__actions">
            {adding && (
              <button type="button" className="btn btn--ghost" onClick={() => setAdding(false)} disabled={busy}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn--accent" disabled={busy || (receiptOnly && !file)}>
              {busy ? (
                <>
                  <span className="spinner" /> Sending… {progress ? `${progress}%` : ''}
                </>
              ) : file ? (
                <>
                  <UploadCloud /> Submit receipt
                </>
              ) : (
                <>
                  <Send /> I&apos;ve made the transfer
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
