import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

function pageList(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) result.push('gap');
    result.push(page);
  });
  return result;
}

export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="pagination__btn" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <ChevronLeft />
      </button>
      {pageList(page, pages).map((item, i) =>
        item === 'gap' ? (
          <span key={`gap-${i}`} className="pagination__gap">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            className={`pagination__btn ${item === page ? 'is-current' : ''}`}
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onChange(item)}
          >
            {item}
          </button>
        )
      )}
      <button type="button" className="pagination__btn" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <ChevronRight />
      </button>
    </nav>
  );
}
