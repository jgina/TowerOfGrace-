import EmptyState from './EmptyState';
import './DataTable.css';

/**
 * Reusable admin table.
 * columns: [{ key, header, render?(row), align?, width?, hideOnMobile? }]
 * On small screens rows collapse into labelled cards (each cell carries data-label).
 */
export default function DataTable({ columns, rows, rowKey = '_id', loading, empty, onRowClick, dense = false }) {
  if (loading) {
    return (
      <div className="data-table-wrap">
        <div className="data-table__loading">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 44 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!rows?.length) {
    return (
      <EmptyState
        compact
        title={empty?.title || 'Nothing here yet'}
        text={empty?.text}
        icon={empty?.icon}
        action={empty?.action}
      />
    );
  }

  return (
    <div className="data-table-wrap">
      <table className={`data-table ${dense ? 'data-table--dense' : ''}`}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ width: col.width, textAlign: col.align }} className={col.hideOnMobile ? 'hide-cell-mobile' : ''}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={typeof rowKey === 'function' ? rowKey(row, index) : row[rowKey] ?? index}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'is-clickable' : ''}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  data-label={typeof col.header === 'string' ? col.header : ''}
                  style={{ textAlign: col.align }}
                  className={col.hideOnMobile ? 'hide-cell-mobile' : ''}
                >
                  {col.render ? col.render(row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
