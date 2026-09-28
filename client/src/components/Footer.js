import { Link } from 'react-router-dom';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import Logo from './Logo';
import SocialIcon from './SocialIcon';
import { useContent } from '../context/ContentContext';
import { whatsappLink } from '../utils/format';
import './Footer.css';

export default function Footer() {
  const { content } = useContent();
  const { footer, contact, home } = content;
  const wa = whatsappLink(contact.whatsapp, 'Hello Tower of Grace Farms, I would like to make an enquiry.');
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-cta">
        <div className="container footer-cta__inner">
          <div>
            <h2 className="footer-cta__title">{home.contactStrip.title}</h2>
            <p>{home.contactStrip.text}</p>
          </div>
          <div className="footer-cta__actions">
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="btn btn--accent">
                <MessageCircle /> Chat on WhatsApp
              </a>
            )}
            <Link to="/contact" className="btn btn--outline-light">
              Contact Us
            </Link>
          </div>
        </div>
      </div>

      <div className="container footer-main">
        <div className="footer-brand">
          <Logo variant="light" size="lg" />
          <p className="footer-tagline">Quality Poultry · Healthy Food · Brighter Tomorrow</p>
          <p>{footer.about}</p>
          {footer.socials?.length > 0 && (
            <div className="footer-socials">
              {footer.socials
                .filter((s) => s.url)
                .map((social) => (
                  <a key={`${social.platform}-${social.url}`} href={social.url} target="_blank" rel="noreferrer" aria-label={social.platform}>
                    <SocialIcon platform={social.platform} />
                  </a>
                ))}
            </div>
          )}
        </div>

        <div className="footer-col">
          <h3>Company</h3>
          <Link to="/about">About Us</Link>
          <Link to="/our-farm">Our Farm</Link>
          <Link to="/quality-and-hygiene">Quality &amp; Hygiene</Link>
          <Link to="/how-we-produce">How We Produce</Link>
          <Link to="/gallery">Gallery</Link>
        </div>

        <div className="footer-col">
          <h3>Products</h3>
          <Link to="/products/broilers">Broilers</Link>
          <Link to="/products/noilers">Noilers</Link>
          <Link to="/products/eggs">Eggs</Link>
          <Link to="/products/turkeys">Turkeys</Link>
          <Link to="/bulk-orders">Bulk Orders</Link>
        </div>

        <div className="footer-col">
          <h3>Contact</h3>
          {contact.address && (
            <span className="footer-contact">
              <MapPin /> {contact.address}
            </span>
          )}
          {contact.phone && (
            <a className="footer-contact" href={`tel:${contact.phone.replace(/\s/g, '')}`}>
              <Phone /> {contact.phone}
            </a>
          )}
          {contact.email && (
            <a className="footer-contact" href={`mailto:${contact.email}`}>
              <Mail /> {contact.email}
            </a>
          )}
          <Link to="/contact">Send us a message</Link>
          <Link to="/track-order">Track an order</Link>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom__inner">
          <span>
            © {year} {footer.copyright}
          </span>
          <div className="footer-bottom__links">
            <Link to="/shop">Shop</Link>
            <Link to="/account">My Account</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
