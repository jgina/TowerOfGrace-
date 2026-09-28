import './BarChart.css';

/**
 * Lightweight dependency-free column chart.
 * data: [{ label, value }]. Renders an honest zero state when every value is 0.
 */
export default function BarChart({ data = [], formatValue = (v) => v, height = 200, tone = 'green', emptyText = 'No data for this period yet' }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  const isEmpty = max === 0;

  return (
    <div className={`bar-chart bar-chart--${tone}`} style={{ '--chart-height': `${height}px` }}>
      <div className="bar-chart__plot" role="img" aria-label={data.map((d) => `${d.label}: ${formatValue(d.value)}`).join(', ')}>
        {isEmpty && <span className="bar-chart__empty">{emptyText}</span>}
        {data.map((d) => {
          const pct = isEmpty ? 0 : Math.max((d.value / max) * 100, d.value > 0 ? 3 : 0);
          return (
            <div key={d.label} className="bar-chart__col">
              <span className="bar-chart__value">{d.value > 0 ? formatValue(d.value) : ''}</span>
              <div className="bar-chart__track">
                <div className="bar-chart__bar" style={{ height: `${pct}%` }} />
              </div>
              <span className="bar-chart__label">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
