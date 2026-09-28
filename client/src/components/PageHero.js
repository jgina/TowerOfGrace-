import Breadcrumbs from './Breadcrumbs';
import { cloudinaryUrl } from './SmartImage';
import './PageHero.css';

// Dark-green inner-page banner used by every corporate and shop page.
export default function PageHero({ title, subtitle, image, crumbs = [], children, compact = false }) {
  const style = image?.url
    ? { '--hero-image': `url("${cloudinaryUrl(image.url, 1800)}")` }
    : undefined;
  return (
    <section className={`page-hero ${image?.url ? 'page-hero--image' : ''} ${compact ? 'page-hero--compact' : ''}`} style={style}>
      <div className="container page-hero__inner">
        {crumbs.length > 0 && <Breadcrumbs items={crumbs} light />}
        <h1 className="page-hero__title display-title">{title}</h1>
        {subtitle && <p className="page-hero__subtitle">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}
