import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <>
      <SEO title="Page Not Found" noIndex />
      <section className="not-found">
        <div className="container not-found__inner">
          <span className="not-found__code">404</span>
          <h1 className="display-title">Page not found</h1>
          <p className="text-muted">The page you are looking for does not exist or has moved.</p>
          <div className="row row--wrap">
            <Link to="/" className="btn btn--primary">
              Go Home
            </Link>
            <Link to="/shop" className="btn btn--accent">
              Visit Shop
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
