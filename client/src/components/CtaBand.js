import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './CtaBand.css';

export default function CtaBand({
  title = 'Ready to order?',
  text = 'Shop online or send a bulk order request for your business.',
  primary = { label: 'Shop Products', to: '/shop' },
  secondary = { label: 'Bulk Orders', to: '/bulk-orders' },
}) {
  return (
    <section className="cta-band">
      <div className="container cta-band__inner">
        <div>
          <h2 className="display-title">{title}</h2>
          <p>{text}</p>
        </div>
        <div className="cta-band__actions">
          {primary && (
            <Link to={primary.to} className="btn btn--accent btn--lg">
              {primary.label} <ArrowRight />
            </Link>
          )}
          {secondary && (
            <Link to={secondary.to} className="btn btn--outline btn--lg">
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
