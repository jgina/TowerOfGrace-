import { useCallback, useEffect, useState } from 'react';
import { Printer, FileText, RefreshCw, CalendarRange, Info } from 'lucide-react';
import AdminPageHeader from '../../components/AdminPageHeader';
import FarmStatement from '../../components/FarmStatement';
import { PageLoader, ErrorState } from '../../components/Loader';
import { adminService } from '../../services/adminService';
import './AdminReportsPage.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const now = new Date();
const YEARS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

export default function AdminReportsPage() {
  const [type, setType] = useState('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [state, setState] = useState({ loading: true, error: null, statement: null });

  const generate = useCallback(() => {
    setState({ loading: true, error: null, statement: null });
    adminService
      .statement({ type, year, month: type === 'month' ? month : undefined })
      .then((statement) => setState({ loading: false, error: null, statement }))
      .catch((error) => setState({ loading: false, error: error.message, statement: null }));
  }, [type, year, month]);

  // Generate the current month straight away; later changes wait for the Generate button.
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opens the clean, standalone A4 view in a new tab and brings up the print / Save-as-PDF dialog there.
  const print = () => {
    const { period } = state.statement;
    const qs = new URLSearchParams({ type: period.type, year: period.year, ...(period.month ? { month: period.month } : {}), autoprint: '1' });
    window.open(`/admin/reports/print?${qs}`, '_blank', 'noopener');
  };

  const futurePeriod = type === 'month' ? year === now.getFullYear() && month > now.getMonth() + 1 : year > now.getFullYear();

  return (
    <div className="reports-page">
      <div className="no-print">
        <AdminPageHeader
          eyebrow="Reports"
          title="Farm Statements"
          subtitle="Monthly and annual statements of sales, stock, market trips and losses — ready to print or save as PDF for applications, lenders and records."
          actions={
            state.statement && (
              <button type="button" className="btn btn--accent" onClick={print}>
                <Printer /> Print / Save as PDF
              </button>
            )
          }
        />

        <div className="reports-controls admin-card">
          <div className="reports-type" role="radiogroup" aria-label="Statement type">
            {[
              ['month', 'Monthly'],
              ['year', 'Annual'],
            ].map(([value, label]) => (
              <button key={value} type="button" role="radio" aria-checked={type === value} className={type === value ? 'is-active' : ''} onClick={() => setType(value)}>
                {label}
              </button>
            ))}
          </div>
          {type === 'month' && (
            <select className="select" value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Month">
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          )}
          <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn--primary" onClick={generate} disabled={state.loading}>
            {state.loading ? <RefreshCw className="reports-spin" /> : <CalendarRange />} Generate statement
          </button>
          {futurePeriod && (
            <span className="reports-warn">
              <Info /> This period is in the future.
            </span>
          )}
        </div>

        {state.statement && (
          <p className="reports-tip">
            <FileText aria-hidden="true" /> “Print / Save as PDF” opens the statement on its own page. In the print window choose{' '}
            <strong>“Save as PDF”</strong> to download it (A4, portrait, “Background graphics” ticked).
          </p>
        )}
      </div>

      {state.loading ? (
        <PageLoader label="Compiling statement…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={generate} />
      ) : (
        state.statement && <FarmStatement statement={state.statement} />
      )}
    </div>
  );
}
