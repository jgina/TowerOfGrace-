import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function AdminPageHeader({ eyebrow, title, subtitle, actions, back }) {
  return (
    <div className="admin-page-header">
      <div>
        {back && (
          <Link to={back.to} className="btn btn--ghost btn--sm" style={{ marginBottom: 8, marginLeft: -12 }}>
            <ArrowLeft /> {back.label}
          </Link>
        )}
        {eyebrow && <span className="admin-page-header__eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="admin-page-header__actions">{actions}</div>}
    </div>
  );
}
