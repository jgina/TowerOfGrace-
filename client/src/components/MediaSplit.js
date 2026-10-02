import SmartImage from './SmartImage';
import './MediaSplit.css';

/** Image + copy two-column block; alternate with `reverse`. */
export default function MediaSplit({ image, imageLabel, imageHint, eyebrow, title, text, children, reverse = false }) {
  return (
    <div className={`media-split ${reverse ? 'media-split--reverse' : ''}`}>
      <SmartImage src={image?.url} alt={image?.alt || title || ''} width={1000} ratio="4 / 3" className="media-split__image" label={imageLabel} hint={imageHint} fit={image?.fit || 'cover'} />
      <div className="media-split__copy">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        {title && <h2 className="display-title media-split__title">{title}</h2>}
        {text && <p className="prose">{text}</p>}
        {children}
      </div>
    </div>
  );
}
