import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import MediaSplit from '../components/MediaSplit';
import CtaBand from '../components/CtaBand';
import { PageLoader, ErrorState } from '../components/Loader';
import useFetch from '../hooks/useFetch';
import { catalogService } from '../services/catalogService';
import { useContent } from '../context/ContentContext';
import { categoryImage } from '../assets/images';
import './ProductsPage.css';

export default function ProductsPage() {
  const home = useContent('home');
  const { data: categories, loading, error, reload } = useFetch(() => catalogService.listCategories(), []);

  return (
    <>
      <SEO title="Our Products" description="Broilers, noilers, eggs and turkeys from Tower of Grace Farms." />
      <PageHero title={home.products.title} subtitle={home.products.text} crumbs={[{ label: 'Our Products' }]} />

      <section className="section section--white">
        <div className="container">
          {loading ? (
            <PageLoader />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (
            categories.map((category, index) => (
              <MediaSplit
                key={category._id}
                image={categoryImage(category)}
                imageLabel={category.name}
                eyebrow={`0${index + 1} · ${category.variantType === 'packaging' ? 'Pack sizes available' : 'Choose your weight'}`}
                title={category.name}
                text={category.description || `Browse our ${category.name.toLowerCase()} and choose the ${category.variantType === 'packaging' ? 'pack size' : 'weight'} that suits you.`}
                reverse={index % 2 === 1}
              >
                <div className="products-page__meta">
                  <strong>{category.productCount}</strong> product{category.productCount === 1 ? '' : 's'} available
                </div>
                <div className="row row--wrap">
                  <Link to={`/products/${category.slug}`} className="btn btn--accent">
                    Shop {category.name} <ArrowRight />
                  </Link>
                  <Link to={`/bulk-orders?product=${encodeURIComponent(category.name)}`} className="btn btn--outline">
                    Bulk Order
                  </Link>
                </div>
              </MediaSplit>
            ))
          )}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
