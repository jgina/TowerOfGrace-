import { Link } from 'react-router-dom';
import './AdminStatsCard.css';

export default function AdminStatsCard({ icon: Icon, label, value, hint, tone = 'green', to }) {
  const body = (
    <>
      <div className="stats-card__top">
        <span className="stats-card__label">{label}</span>
        {Icon && (
          <span className={`stats-card__icon stats-card__icon--${tone}`}>
            <Icon aria-hidden="true" />
          </span>
        )}
      </div>
      <strong className="stats-card__value">{value}</strong>
      {hint && <span className="stats-card__hint">{hint}</span>}
    </>
  );
  return to ? (
    <Link to={to} className={`stats-card stats-card--${tone} stats-card--link`}>
      {body}
    </Link>
  ) : (
    <div className={`stats-card stats-card--${tone}`}>{body}</div>
  );
}
