import { Link } from 'react-router-dom';
import { ArrowRight, Bird, Egg, Feather, HeartPulse, ShieldCheck, Truck, Handshake, Drumstick, Building2, ShoppingBasket } from 'lucide-react';
import SEO, { useOrganizationJsonLd } from '../components/SEO';
import SectionHeading from '../components/SectionHeading';
import SmartImage, { cloudinaryUrl } from '../components/SmartImage';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';
import FeatureGrid from '../components/FeatureGrid';
import { useContent } from '../context/ContentContext';
import useFetch from '../hooks/useFetch';
import { catalogService } from '../services/catalogService';
import { siteService } from '../services/siteService';
import { DEFAULT_GALLERY, PAGE_IMAGES, categoryImage, withFallback } from '../assets/images';
import './HomePage.css';

const wordCount = (text = '') => text.split(/\s+/).filter(Boolean).length;

// Masked reveal: the content slides up from beneath an invisible edge.
function Reveal({ delay = 0, children }) {
  return (
    <div className="reveal reveal--block" style={{ '--d': `${delay}s` }}>
      <div className="reveal__inner">{children}</div>
    </div>
  );
}

// Word-by-word masked reveal for the hero headline (screen readers use the h1's aria-label).
function RevealWords({ text = '', delay = 0, className = '' }) {
  return (
    <span className={`reveal-line ${className}`} aria-hidden="true">
      {text
        .split(/\s+/)
        .filter(Boolean)
        .map((word, i) => (
          <span key={`${word}-${i}`} className="reveal" style={{ '--d': `${delay + i * 0.11}s` }}>
            <span className="reveal__inner">{word}</span>
          </span>
        ))}
    </span>
  );
}

const CATEGORY_ICONS ={ broilers: Drumstick, noilers: Bird, eggs: Egg, turkeys: Feather };
const PILLAR_ICONS = [HeartPulse, ShieldCheck, Truck, Handshake];

export default function HomePage() {
  const home = useContent('home');
  const orgJsonLd = useOrganizationJsonLd();
  const { hero, pillars, products, infrastructure, bulk, retail, gallery } = home;

  const categories = useFetch(() => catalogService.listCategories(), []);
  const featured = useFetch(() => catalogService.listProducts({ featured: 'true', limit: 4 }).then((r) => r.products), []);
  const galleryItems = useFetch(() => siteService.getGallery({ featured: 'true', limit: 6 }).then((r) => r.items), []);

  const heroImage = withFallback(hero.image, PAGE_IMAGES.homeHero);
  const infraImage = withFallback(infrastructure.image, PAGE_IMAGES.homeInfrastructure);
  // Bundled photos stand in until featured gallery images are uploaded.
  const galleryPhotos = galleryItems.data?.length ? galleryItems.data : galleryItems.loading ? [] : DEFAULT_GALLERY.slice(0, 6);
  const heroStyle = heroImage?.url ? { '--hero-image': `url("${cloudinaryUrl(heroImage.url, 1920)}")` } : undefined;

  return (
    <>
      <SEO jsonLd={orgJsonLd} />

      {/* ---------- Hero ---------- */}
      <section className={`home-hero ${heroImage?.url ? 'home-hero--image' : ''}`} style={heroStyle}>
        {heroImage?.url && <div className="home-hero__bg" aria-hidden="true" />}
        <div className="container home-hero__inner">
          <div className="home-hero__copy">
            {hero.eyebrow && (
              <Reveal delay={0.15}>
                <span className="home-hero__eyebrow">{hero.eyebrow}</span>
              </Reveal>
            )}
            <h1 className="home-hero__title display-title" aria-label={`${hero.titleLine1} ${hero.titleLine2}`}>
              <RevealWords text={hero.titleLine1} delay={0.35} />
              <RevealWords text={hero.titleLine2} delay={0.35 + wordCount(hero.titleLine1) * 0.11} className="text-accent home-hero__accent-line" />
            </h1>
            {hero.subtitle && (
              <Reveal delay={0.9}>
                <p className="home-hero__subtitle">{hero.subtitle}</p>
              </Reveal>
            )}
            <div className="home-hero__actions hero-rise" style={{ '--d': '1.1s' }}>
              {hero.primaryCtaLabel && (
                <Link to={hero.primaryCtaLink || '/shop'} className="btn btn--accent btn--lg">
                  {hero.primaryCtaLabel} <ArrowRight />
                </Link>
              )}
              {hero.secondaryCtaLabel && (
                <Link to={hero.secondaryCtaLink || '/bulk-orders'} className="btn btn--outline-light btn--lg">
                  {hero.secondaryCtaLabel}
                </Link>
              )}
            </div>
          </div>

          <div className="home-hero__panel hero-rise" style={{ '--d': '0.7s' }}>
            <span className="home-hero__panel-title">Shop by product</span>
            <div className="home-hero__tiles">
              {(categories.data || []).slice(0, 4).map((category) => {
                const Icon = CATEGORY_ICONS[category.slug] || ShoppingBasket;
                return (
                  <Link key={category._id} to={`/products/${category.slug}`} className="hero-tile">
                    <Icon aria-hidden="true" />
                    <strong>{category.name}</strong>
                    <small>
                      {category.productCount} product{category.productCount === 1 ? '' : 's'}
                    </small>
                  </Link>
                );
              })}
              {categories.loading && [0, 1, 2, 3].map((i) => <div key={i} className="hero-tile hero-tile--loading" />)}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Pillars ---------- */}
      <section className="section section--white">
        <div className="container">
          <SectionHeading eyebrow={pillars.eyebrow} title={pillars.title} text={pillars.text} />
          <FeatureGrid items={pillars.items} icons={PILLAR_ICONS} />
        </div>
      </section>

      {/* ---------- Products ---------- */}
      <section className="section">
        <div className="container">
          <SectionHeading
            eyebrow={products.eyebrow}
            title={products.title}
            text={products.text}
            action={
              <Link to="/shop" className="btn btn--outline">
                View All Products <ArrowRight />
              </Link>
            }
          />
          <div className="category-cards">
            {(categories.data || []).map((category) => (
              <Link key={category._id} to={`/products/${category.slug}`} className="category-card">
                <SmartImage src={categoryImage(category)?.url} alt={categoryImage(category)?.alt || category.name} width={700} ratio="4 / 3" label={category.name} />
                <div className="category-card__body">
                  <h3>{category.name}</h3>
                  {category.description && <p>{category.description}</p>}
                  <span className="category-card__cta">
                    Shop {category.name} <ArrowRight />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {(featured.loading || featured.data?.length > 0) && (
            <div className="home-featured">
              <h3 className="home-featured__title">Featured Products</h3>
              <div className="product-grid">
                {featured.loading
                  ? [0, 1, 2, 3].map((i) => <ProductCardSkeleton key={i} />)
                  : featured.data.map((product) => <ProductCard key={product._id} product={product} />)}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- Infrastructure ---------- */}
      <section className="section section--white">
        <div className="container infra">
          <SmartImage
            src={infraImage?.url}
            alt={infraImage?.alt || infrastructure.title}
            width={1000}
            ratio="5 / 4"
            className="infra__image"
            label="Farm photo"
          />
          <div className="infra__copy">
            {infrastructure.eyebrow && <span className="eyebrow">{infrastructure.eyebrow}</span>}
            <h2 className="display-title infra__title">{infrastructure.title}</h2>
            <p className="prose">{infrastructure.text}</p>
            {infrastructure.stats?.length > 0 && (
              <div className="infra__stats">
                {infrastructure.stats.map((stat, i) => (
                  <div key={`${stat.label}-${i}`} className="infra__stat">
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="row row--wrap">
              <Link to="/our-farm" className="btn btn--primary">
                Our Farm
              </Link>
              <Link to="/how-we-produce" className="btn btn--outline">
                How We Produce
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Retail + bulk split ---------- */}
      <section className="section">
        <div className="container split-cta">
          <div className="split-cta__card">
            <ShoppingBasket className="split-cta__icon" aria-hidden="true" />
            {retail.eyebrow && <span className="eyebrow">{retail.eyebrow}</span>}
            <h2 className="display-title">{retail.title}</h2>
            <p>{retail.text}</p>
            <Link to="/shop" className="btn btn--primary">
              {retail.ctaLabel} <ArrowRight />
            </Link>
          </div>
          <div className="split-cta__card split-cta__card--dark">
            <Building2 className="split-cta__icon" aria-hidden="true" />
            {bulk.eyebrow && <span className="eyebrow">{bulk.eyebrow}</span>}
            <h2 className="display-title">{bulk.title}</h2>
            <p>{bulk.text}</p>
            <Link to="/bulk-orders" className="btn btn--accent">
              {bulk.ctaLabel} <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Gallery ---------- */}
      {galleryPhotos.length > 0 && (
        <section className="section section--white">
          <div className="container">
            <SectionHeading
              eyebrow={gallery.eyebrow}
              title={gallery.title}
              action={
                <Link to="/gallery" className="btn btn--outline">
                  Open Gallery <ArrowRight />
                </Link>
              }
            />
            <div className="home-gallery">
              {galleryPhotos.map((item) => (
                <figure key={item._id} className="home-gallery__item">
                  <SmartImage src={item.image?.url} alt={item.image?.alt || item.title || item.category} width={700} ratio="1 / 1" />
                  {(item.title || item.category) && <figcaption>{item.title || item.category}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
