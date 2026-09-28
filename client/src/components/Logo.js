import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useContent } from '../context/ContentContext';
import './Logo.css';

const OFFICIAL_LOGO = '/brand/logo.jpg';
const LOGO_ALT = 'Tower of Grace Farms & Agro-Based Industries Ltd';

/*
  Official logo resolution order:
  1. Logo uploaded in Admin → Settings (Cloudinary), if the admin replaces it
  2. The official file shipped with the site: client/public/brand/logo.jpg
  3. Text wordmark (only if both images fail to load)
  The artwork is always shown whole, at its natural aspect ratio — never cropped, stretched or recoloured.
  size: sm (admin/drawers) | md (site header) | lg (footer, admin login)
*/
export default function Logo({ variant = 'dark', to = '/', size = 'md' }) {
  const { settings } = useContent();
  const sources = [settings?.logo?.url, OFFICIAL_LOGO].filter(Boolean);
  const [index, setIndex] = useState(0);
  const src = sources[index];

  return (
    <Link to={to} className={`logo logo--${variant} logo--${size}`} aria-label="Tower of Grace Farms — home">
      {src ? (
        <img src={src} alt={LOGO_ALT} className="logo__image" onError={() => setIndex((i) => i + 1)} />
      ) : (
        <span className="logo__text">
          <strong>Tower of Grace Farms</strong>
          <small>&amp; Agro-Based Industries Ltd</small>
        </span>
      )}
    </Link>
  );
}
