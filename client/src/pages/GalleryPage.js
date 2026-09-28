import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Images } from 'lucide-react';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import SmartImage, { cloudinaryUrl } from '../components/SmartImage';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { ErrorState } from '../components/Loader';
import useFetch from '../hooks/useFetch';
import { siteService } from '../services/siteService';
import { GALLERY_CATEGORIES } from '../utils/constants';
import { DEFAULT_GALLERY } from '../assets/images';
import './GalleryPage.css';

export default function GalleryPage() {
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [lightbox, setLightbox] = useState(-1);
  const { data, loading, error, reload } = useFetch(() => siteService.getGallery({ category: category || undefined, page, limit: 24 }), [category, page]);
  // Until the admin uploads any gallery photos, the bundled farm photos are shown instead.
  const uploaded = useFetch(() => siteService.getGallery({ limit: 1 }).then((r) => r.meta.total), []);
  const useDefaults = uploaded.data === 0;
  const items = useDefaults ? DEFAULT_GALLERY.filter((item) => !category || item.category === category) : data?.items || [];

  useEffect(() => {
    if (lightbox < 0) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(-1);
      if (e.key === 'ArrowRight') setLightbox((i) => (i + 1) % items.length);
      if (e.key === 'ArrowLeft') setLightbox((i) => (i - 1 + items.length) % items.length);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, items.length]);

  const current = items[lightbox];

  return (
    <>
      <SEO title="Gallery" description="Photos from Tower of Grace Farms — our birds, facilities, production and deliveries." />
      <PageHero title="Gallery" subtitle="A look around Tower of Grace Farms." crumbs={[{ label: 'Gallery' }]} />

      <section className="section">
        <div className="container">
          <div className="gallery-filters" role="tablist" aria-label="Gallery categories">
            {['', ...GALLERY_CATEGORIES].map((c) => (
              <button
                key={c || 'all'}
                type="button"
                role="tab"
                aria-selected={category === c}
                className={category === c ? 'is-active' : ''}
                onClick={() => {
                  setCategory(c);
                  setPage(1);
                }}
              >
                {c || 'All'}
              </button>
            ))}
          </div>

          {error && !useDefaults ? (
            <ErrorState message={error} onRetry={reload} />
          ) : loading && !useDefaults ? (
            <div className="gallery-grid">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="skeleton" style={{ aspectRatio: '1 / 1' }} />
              ))}
            </div>
          ) : items.length ? (
            <>
              <div className="gallery-grid">
                {items.map((item, index) => (
                  <button key={item._id} type="button" className="gallery-item" onClick={() => setLightbox(index)}>
                    <SmartImage src={item.image?.url} alt={item.image?.alt || item.title || item.category} width={600} ratio="1 / 1" />
                    <span className="gallery-item__overlay">
                      <span className="gallery-item__cat">{item.category}</span>
                      {item.title && <strong>{item.title}</strong>}
                    </span>
                  </button>
                ))}
              </div>
              {!useDefaults && <Pagination page={data.meta.page} pages={data.meta.pages} onChange={setPage} />}
            </>
          ) : (
            <EmptyState icon={Images} title="No photos yet" text="Photos will appear here once they are uploaded." />
          )}
        </div>
      </section>

      {current && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={current.title || 'Image viewer'}>
          <button type="button" className="lightbox__close" onClick={() => setLightbox(-1)} aria-label="Close">
            <X />
          </button>
          {items.length > 1 && (
            <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => setLightbox((lightbox - 1 + items.length) % items.length)} aria-label="Previous">
              <ChevronLeft />
            </button>
          )}
          <figure className="lightbox__figure">
            <img src={cloudinaryUrl(current.image.url, 1600)} alt={current.image.alt || current.title || current.category} />
            {(current.title || current.caption) && (
              <figcaption>
                {current.title && <strong>{current.title}</strong>}
                {current.caption && <span>{current.caption}</span>}
              </figcaption>
            )}
          </figure>
          {items.length > 1 && (
            <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => setLightbox((lightbox + 1) % items.length)} aria-label="Next">
              <ChevronRight />
            </button>
          )}
          <div className="lightbox__backdrop" onClick={() => setLightbox(-1)} />
        </div>
      )}
    </>
  );
}
