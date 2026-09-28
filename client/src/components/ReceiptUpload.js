import { useRef, useState } from 'react';
import { UploadCloud, FileText, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { orderService } from '../services/orderService';
import { useToast } from '../context/ToastContext';
import { formatDateTime } from '../utils/format';
import './ReceiptUpload.css';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/** Lets the customer upload their bank-transfer receipt and shows its review status. */
export default function ReceiptUpload({ order, onUploaded }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [replacing, setReplacing] = useState(false);

  const latest = order.paymentProofs?.[order.paymentProofs.length - 1];
  const pending = latest?.status === 'PENDING';
  const rejected = latest?.status === 'REJECTED';
  const showForm = !pending || replacing;

  const choose = (selected) => {
    setError('');
    if (!selected) return;
    if (!ACCEPTED.includes(selected.type)) return setError('Please choose a JPG, PNG or WEBP photo, or a PDF.');
    if (selected.size > MAX_BYTES) return setError('The file is larger than 5MB. Please upload a smaller photo or PDF.');
    setFile(selected);
    return undefined;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Choose your receipt first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await orderService.uploadPaymentProof(
        { orderNumber: order.orderNumber, email: order.customer.email, file, note },
        setProgress
      );
      toast.success(result.message);
      setFile(null);
      setNote('');
      setReplacing(false);
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
      {pending && (
        <div className="receipt__status receipt__status--pending" role="status">
          <Clock aria-hidden="true" />
          <div>
            <strong>Receipt received — awaiting confirmation</strong>
            <p>
              Uploaded {formatDateTime(latest.uploadedAt)}. We will confirm once the money reaches our account, and you will get an
              email. This page updates automatically.
            </p>
            <div className="receipt__links">
              <a href={latest.url} target="_blank" rel="noreferrer" className="link">
                <ExternalLink /> View uploaded receipt
              </a>
              {!replacing && (
                <button type="button" className="link receipt__linkbtn" onClick={() => setReplacing(true)}>
                  Upload a different receipt
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {rejected && (
        <div className="receipt__status receipt__status--rejected" role="alert">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>We could not confirm your last receipt</strong>
            {latest.reviewNote && <p>Reason: {latest.reviewNote}</p>}
            <p>Please check your transfer and upload a clear receipt again.</p>
          </div>
        </div>
      )}

      {showForm && (
        <form className="receipt__form" onSubmit={submit}>
          <span className="receipt__title">{pending ? 'Upload a different receipt' : 'Paid already? Upload your transfer receipt'}</span>
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
                  <strong>Choose a screenshot, photo or PDF</strong>
                  <small>JPG, PNG, WEBP or PDF · up to 5MB</small>
                </span>
              </>
            )}
          </button>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={(e) => choose(e.target.files?.[0])} />
          <input
            className="input"
            placeholder="Optional note, e.g. name of the sender's account"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
          />
          {error && <span className="field__error">{error}</span>}
          <div className="receipt__actions">
            {replacing && (
              <button type="button" className="btn btn--ghost" onClick={() => setReplacing(false)} disabled={busy}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn--accent" disabled={busy || !file}>
              {busy ? (
                <>
                  <span className="spinner" /> Uploading… {progress ? `${progress}%` : ''}
                </>
              ) : (
                <>
                  <UploadCloud /> Submit receipt
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
