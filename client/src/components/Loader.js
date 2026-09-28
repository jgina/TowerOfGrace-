import { AlertTriangle, RefreshCw } from 'lucide-react';
import './Loader.css';

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="page-loader" role="status">
      <span className="page-loader__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <AlertTriangle aria-hidden="true" />
      <p>{message || 'Something went wrong while loading this page.'}</p>
      {onRetry && (
        <button type="button" className="btn btn--outline btn--sm" onClick={onRetry}>
          <RefreshCw /> Try again
        </button>
      )}
    </div>
  );
}
