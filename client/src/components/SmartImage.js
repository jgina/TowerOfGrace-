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
 */
export default function SmartImage({ src, alt = '', width, ratio, className = '', label, eager = false }) {
  const [failed, setFailed] = useState(false);
  const style = ratio ? { aspectRatio: ratio } : undefined;
  const showPlaceholder = !src || failed;

  return (
    <div className={`smart-image ${className}`} style={style}>
      {showPlaceholder ? (
        <div className="smart-image__placeholder" role="img" aria-label={alt || label || 'Image coming soon'}>
          <ImageIcon aria-hidden="true" />
          {label && <span>{label}</span>}
        </div>
      ) : (
        <img
          src={cloudinaryUrl(src, width)}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
