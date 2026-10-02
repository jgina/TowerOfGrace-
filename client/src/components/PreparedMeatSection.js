import { Link } from 'react-router-dom';
import { ArrowRight, Check, Info } from 'lucide-react';
import SmartImage from './SmartImage';
import ImageCardGrid, { toPoints } from './ImageCardGrid';
import { useContent } from '../context/ContentContext';
import { PAGE_IMAGES } from '../assets/images';
import { slotImage, slotHint } from '../assets/siteImages';
import './PreparedMeatSection.css';

const SHOP_LINK = '/products/prepared-meat';

/** Prepared (dressed, cut and cooked) poultry. Content lives in Admin → Content → Products & Prepared Meat. */
export default function PreparedMeatSection({ id = 'prepared-meat' }) {
  const { prepared } = useContent('shop');
  if (!prepared?.title) return null;
  const image = slotImage(prepared.image, 'prepared-meat', PAGE_IMAGES.preparedMeat);
  const points = toPoints(prepared.points);

  return (
    <section className="section section--dark prepared" id={id}>
      <div className="container">
        <div className="prepared__intro">
          <div className="prepared__copy">
            {prepared.eyebrow && <span className="eyebrow">{prepared.eyebrow}</span>}
            <h2 className="display-title prepared__title">{prepared.title}</h2>
            {prepared.text && <p className="prepared__text">{prepared.text}</p>}
            {points.length > 0 && (
              <ul className="prepared__points">
                {points.map((point) => (
                  <li key={point}>
                    <Check aria-hidden="true" /> {point}
                  </li>
                ))}
              </ul>
            )}
            <div className="row row--wrap">
              <Link to={SHOP_LINK} className="btn btn--accent btn--lg">
                {prepared.ctaLabel || 'Shop Prepared Meat'} <ArrowRight />
              </Link>
              <Link to={`/bulk-orders?product=${encodeURIComponent('Prepared Meat')}`} className="btn btn--outline-light btn--lg">
                Bulk / Event Order
              </Link>
            </div>
            {prepared.note && (
              <p className="prepared__note">
                <Info aria-hidden="true" /> {prepared.note}
              </p>
            )}
          </div>
          <div className="prepared__media">
            <SmartImage src={image?.url} alt={image?.alt || prepared.title} width={1000} ratio="4 / 5" label={prepared.title} hint={slotHint('prepared-meat')} eager={false} />
            <span className="prepared__badge">
              <strong>Fresh</strong> from our farm
            </span>
          </div>
        </div>

        <ImageCardGrid items={(prepared.items || []).map((item) => ({ ...item, link: item.link || SHOP_LINK, linkLabel: item.linkLabel || 'Order now' }))} slotPrefix="shop-prepared" columns={4} variant="dark" ratio="4 / 3" />
      </div>
    </section>
  );
}
