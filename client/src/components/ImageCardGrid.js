import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import SmartImage from './SmartImage';
import { slotImage, slotHint } from '../assets/siteImages';
import './ImageCardGrid.css';

// "points" is edited in the CMS as one point per line; older data may already be an array.
export const toPoints = (points) => (Array.isArray(points) ? points : String(points || '').split('\n')).map((p) => p.trim()).filter(Boolean);

/**
 * Grid of image cards used across the public pages.
 * Each card's picture comes from its image slot `${slotPrefix}-${n}` (see assets/siteImages.js),
 * so photos can be uploaded by an admin or added to the codebase later.
 */
export default function ImageCardGrid({ items = [], slotPrefix, bundled = [], columns = 3, ratio = '4 / 3', variant = 'light', numbered = false }) {
  if (!items.length) return null;
  return (
    <div className={`image-cards image-cards--${variant}`} style={{ '--cols': columns }}>
      {items.map((item, index) => {
        const slot = slotPrefix ? `${slotPrefix}-${index + 1}` : undefined;
        const image = slotImage(item.image, slot, bundled[index]);
        const points = toPoints(item.points);
        const internal = item.link?.startsWith('/');
        return (
          <article key={`${item.title}-${index}`} className="image-card">
            <div className="image-card__media">
              <SmartImage src={image?.url} alt={image?.alt || item.title} width={800} ratio={ratio} label={item.title} hint={slotHint(slot)} />
              {numbered && <span className="image-card__num">{String(index + 1).padStart(2, '0')}</span>}
              {item.tag && <span className="image-card__tag">{item.tag}</span>}
            </div>
            <div className="image-card__body">
              <h3 className="image-card__title">{item.title}</h3>
              {item.text && <p className="image-card__text">{item.text}</p>}
              {points.length > 0 && (
                <ul className="image-card__points">
                  {points.map((point) => (
                    <li key={point}>
                      <Check aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
              {item.link &&
                (internal ? (
                  <Link to={item.link} className="image-card__link">
                    {item.linkLabel || 'Learn more'} <ArrowRight />
                  </Link>
                ) : (
                  <a href={item.link} className="image-card__link" target="_blank" rel="noreferrer">
                    {item.linkLabel || 'Learn more'} <ArrowRight />
                  </a>
                ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
