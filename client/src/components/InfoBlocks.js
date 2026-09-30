import { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import './InfoBlocks.css';

/** Simple reference table (vaccination programme, feeding phases…). Collapses to cards on phones. */
export function InfoTable({ columns = [], rows = [], note, caption }) {
  if (!rows.length) return null;
  return (
    <div className="info-table">
      <table>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c, ci) => (
                <td key={c.key} data-label={c.label} className={ci === 0 ? 'info-table__lead' : undefined}>
                  {row[c.key] || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {note && (
        <p className="info-table__note">
          <Info aria-hidden="true" /> {note}
        </p>
      )}
    </div>
  );
}

/** Accordion list of questions and answers. */
export function FaqList({ items = [] }) {
  const [open, setOpen] = useState(0);
  if (!items.length) return null;
  return (
    <div className="faq">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={`${item.question}-${i}`} className={`faq__item ${isOpen ? 'is-open' : ''}`}>
            <h3>
              <button type="button" className="faq__question" aria-expanded={isOpen} aria-controls={`faq-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                <span>{item.question}</span>
                <ChevronDown aria-hidden="true" />
              </button>
            </h3>
            <div id={`faq-${i}`} className="faq__answer" role="region" hidden={!isOpen}>
              <p>{item.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Numbered horizontal process (request → quote → deliver…). */
export function ProcessSteps({ items = [], variant = 'light' }) {
  if (!items.length) return null;
  return (
    <ol className={`process process--${variant}`} style={{ '--steps': items.length }}>
      {items.map((item, i) => (
        <li key={`${item.title}-${i}`} className="process__step">
          <span className="process__num">{String(i + 1).padStart(2, '0')}</span>
          <h3>{item.title}</h3>
          {item.text && <p>{item.text}</p>}
        </li>
      ))}
    </ol>
  );
}
