import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import './SmartImage.css';

// Adds Cloudinary width/format transforms to delivery URLs so pages load right-sized images.
export function cloudinaryUrl(url, width) {
  if (!url || !width || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`);
}

/**
 * Image with a branded placeholder. Placeholders appear wherever the admin has not yet uploaded
 * a real Tower of Grace photo, so no stock imagery misrepresents the farm.
 *
 * fit="cover" (default) fills the frame and may crop edges.
 * fit="contain" always shows the whole image; the spare space is filled with a soft blurred copy of it,
 * so portrait, landscape and square photos all sit neatly in the same card shape.
 * fit="natural" shows the whole image at full width and its own height (no crop, no filler).
 * fit="cutout" is for cut-out photos on white: the whole image on a plain white background.
 * `ratio` then only sizes the placeholder shown before a photo exists.
 */
export default function SmartImage({ src, alt = '', width, ratio, className = '', label, hint, eager = false, fit = 'cover' }) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !src || failed;
  const style = ratio && (fit !== 'natural' || showPlaceholder) ? { aspectRatio: ratio } : undefined;
  const url = cloudinaryUrl(src, width);

  return (
    <div className={`smart-image smart-image--${fit} ${className}`} style={style}>
      {showPlaceholder ? (
        <div className="smart-image__placeholder" role="img" aria-label={alt || label || 'Image coming soon'}>
          <ImageIcon aria-hidden="true" />
          {label && <span>{label}</span>}
          {hint && <code className="smart-image__hint">{hint}</code>}
        </div>
      ) : (
        <>
          {fit === 'contain' && <img src={url} alt="" aria-hidden="true" className="smart-image__backdrop" loading={eager ? 'eager' : 'lazy'} decoding="async" />}
          <img
            src={url}
            alt={alt}
            className="smart-image__img"
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setFailed(true)}
          />
        </>
      )}
    </div>
  );
}
