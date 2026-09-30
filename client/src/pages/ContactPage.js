import { useState } from 'react';
import { Mail, MapPin, MessageCircle, Phone, Clock, Send } from 'lucide-react';
import SEO, { useOrganizationJsonLd } from '../components/SEO';
import PageHero from '../components/PageHero';
import FormField from '../components/FormField';
import SectionHeading from '../components/SectionHeading';
import ImageCardGrid from '../components/ImageCardGrid';
import { FaqList } from '../components/InfoBlocks';
import { useContent } from '../context/ContentContext';
import { siteService } from '../services/siteService';
import { whatsappLink } from '../utils/format';
import { PAGE_IMAGES } from '../assets/images';
import './ContactPage.css';

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '' };

// Only accepts Google Maps embed URLs so the admin field cannot inject arbitrary frames.
const safeMapUrl = (url) => (/^https:\/\/(www\.)?google\.com\/maps\/embed/.test(url || '') ? url : '');

export default function ContactPage() {
  const contact = useContent('contact');
  const orgJsonLd = useOrganizationJsonLd();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ sending: false, success: '', error: '' });
  const wa = whatsappLink(contact.whatsapp, 'Hello Tower of Grace Farms, I would like to make an enquiry.');
  const mapUrl = safeMapUrl(contact.mapEmbedUrl);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Your name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (form.message.trim().length < 10) errs.message = 'Please write at least 10 characters';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStatus({ sending: true, success: '', error: '' });
    try {
      const result = await siteService.sendContact(form);
      setStatus({ sending: false, success: result.message, error: '' });
      setForm(EMPTY);
    } catch (error) {
      setStatus({ sending: false, success: '', error: error.message });
    }
  };

  const cards = [
    contact.phone && { icon: Phone, label: 'Call us', value: [contact.phone, contact.phoneAlt].filter(Boolean).join(' / '), href: `tel:${contact.phone.replace(/\s/g, '')}` },
    contact.email && { icon: Mail, label: 'Email us', value: contact.email, href: `mailto:${contact.email}` },
    wa && { icon: MessageCircle, label: 'WhatsApp', value: 'Chat with our team', href: wa, external: true },
    contact.address && { icon: MapPin, label: 'Visit us', value: contact.address },
  ].filter(Boolean);

  return (
    <>
      <SEO title="Contact Us" description={contact.intro} jsonLd={orgJsonLd} />
      <PageHero title="Contact Us" subtitle={contact.intro} image={PAGE_IMAGES.contact} crumbs={[{ label: 'Contact' }]} />

      <section className="section">
        <div className="container">
          {cards.length > 0 && (
            <div className="contact-cards">
              {cards.map(({ icon: Icon, label, value, href, external }) => {
                const body = (
                  <>
                    <Icon aria-hidden="true" />
                    <span className="field__label">{label}</span>
                    <strong>{value}</strong>
                  </>
                );
                return href ? (
                  <a key={label} className="contact-card" href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
                    {body}
                  </a>
                ) : (
                  <div key={label} className="contact-card">
                    {body}
                  </div>
                );
              })}
            </div>
          )}

          <div className="contact-layout">
            <form className="card contact-form" onSubmit={submit} noValidate>
              <h2 className="display-title">Send us a message</h2>
              {status.success && <div className="form-alert form-alert--success">{status.success}</div>}
              {status.error && <div className="form-alert form-alert--error">{status.error}</div>}
              <div className="form-grid">
                <FormField label="Full name" required error={errors.name}>
                  <input className="input" value={form.name} onChange={set('name')} autoComplete="name" />
                </FormField>
                <FormField label="Email" required error={errors.email}>
                  <input className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
                </FormField>
                <FormField label="Phone">
                  <input className="input" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
                </FormField>
                <FormField label="Subject">
                  <input className="input" value={form.subject} onChange={set('subject')} />
                </FormField>
                <FormField label="Message" required error={errors.message} className="span-all">
                  <textarea className="textarea" rows={6} value={form.message} onChange={set('message')} maxLength={5000} />
                </FormField>
              </div>
              <button type="submit" className="btn btn--accent btn--lg" disabled={status.sending}>
                {status.sending ? <span className="spinner" /> : <Send />} Send Message
              </button>
            </form>

            <aside className="contact-side">
              {contact.openingHours?.length > 0 && (
                <div className="card contact-hours">
                  <h3>
                    <Clock aria-hidden="true" /> Opening Hours
                  </h3>
                  <dl>
                    {contact.openingHours.map((row, i) => (
                      <div key={`${row.days}-${i}`}>
                        <dt>{row.days}</dt>
                        <dd>{row.hours}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {mapUrl ? (
                <div className="contact-map card">
                  <iframe title="Tower of Grace Farms location" src={mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
                </div>
              ) : (
                <div className="contact-map contact-map--empty card">
                  <MapPin aria-hidden="true" />
                  <span>{contact.address || 'Map coming soon'}</span>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>

      {contact.help?.items?.length > 0 && (
        <section className="section section--white">
          <div className="container">
            <SectionHeading eyebrow={contact.help.eyebrow} title={contact.help.title} />
            <ImageCardGrid items={contact.help.items} slotPrefix="contact-help" columns={3} ratio="16 / 10" />
          </div>
        </section>
      )}

      {contact.faqs?.length > 0 && (
        <section className="section">
          <div className="container contact-faq">
            <SectionHeading eyebrow="FAQ" title="Frequently Asked Questions" text="Quick answers to the questions customers ask us most." align="center" />
            <FaqList items={contact.faqs} />
          </div>
        </section>
      )}
    </>
  );
}
