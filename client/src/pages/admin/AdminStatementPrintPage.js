import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import SEO from '../../components/SEO';
import FarmStatement from '../../components/FarmStatement';
import { PageLoader, ErrorState } from '../../components/Loader';
import { adminService } from '../../services/adminService';
import './AdminStatementPrintPage.css';

/**
 * Standalone print view for a farm statement (no admin sidebar/top bar), so the browser
 * paginates a clean A4 document. Opened in a new tab from Admin → Statements & Reports.
 */
export default function AdminStatementPrintPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: null, statement: null });
  const query = { type: params.get('type') || 'month', year: params.get('year'), month: params.get('month') || undefined };

  const load = () => {
    setState({ loading: true, error: null, statement: null });
    adminService
      .statement(query)
      .then((statement) => setState({ loading: false, error: null, statement }))
      .catch((error) => setState({ loading: false, error: error.message, statement: null }));
  };

  useEffect(load, [params.toString()]); // eslint-disable-line react-hooks/exhaustive-deps

  // The browser uses the document title as the suggested PDF file name.
  useEffect(() => {
    if (state.statement) document.title = `Tower-of-Grace-${state.statement.period.statementNumber}`;
  }, [state.statement]);

  // ?autoprint=1 opens the print dialog as soon as the statement is ready.
  useEffect(() => {
    if (state.statement && params.get('autoprint') === '1') {
      const timer = setTimeout(() => window.print(), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state.statement, params]);

  return (
    <div className="print-view">
      <SEO title="Farm Statement" noIndex />
      <div className="print-view__bar no-print">
        <Link to="/admin/reports" className="btn btn--ghost btn--sm">
          <ArrowLeft /> Back to reports
        </Link>
        <span className="print-view__hint">
          Choose <strong>“Save as PDF”</strong> in the print window · A4 · Portrait · tick <strong>Background graphics</strong>
        </span>
        <button type="button" className="btn btn--accent" onClick={() => window.print()} disabled={!state.statement}>
          <Printer /> Print / Save as PDF
        </button>
      </div>
      <main className="print-view__paper">
        {state.loading ? (
          <PageLoader label="Compiling statement…" />
        ) : state.error ? (
          <ErrorState message={state.error} onRetry={load} />
        ) : (
          <FarmStatement statement={state.statement} />
        )}
      </main>
    </div>
  );
}
