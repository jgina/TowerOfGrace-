import { CheckCircle2 } from 'lucide-react';
import './FeatureGrid.css';

/** Numbered/iconed card grid used for pillars, values, standards and benefits. */
export default function FeatureGrid({ items = [], icons = [], images = [], numbered = false, columns = 4, variant = 'light' }) {
  if (!items.length) return null;
  return (
    <div className={`feature-grid feature-grid--${variant}`} style={{ '--cols': columns }}>
      {items.map((item, index) => {
        const Icon = icons[index % (icons.length || 1)] || CheckCircle2;
        const image = images[index % (images.length || 1)];
        return (
          <article key={`${item.title}-${index}`} className="feature-card">
            <span className={`feature-card__icon ${image?.url ? 'feature-card__icon--image' : ''}`}>
              {numbered
                ? String(index + 1).padStart(2, '0')
                : image?.url
                  ? <img src={image.url} alt="" width="52" height="52" loading="lazy" decoding="async" />
                  : <Icon aria-hidden="true" />}
            </span>
            <h3 className="feature-card__title">{item.title}</h3>
            {item.text && <p className="feature-card__text">{item.text}</p>}
          </article>
        );
      })}
    </div>
  );
}
