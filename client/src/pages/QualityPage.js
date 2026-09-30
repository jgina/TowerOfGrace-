import { Award, CalendarCheck, DoorClosed, Footprints, Shirt, Repeat, SprayCan, ShieldAlert, Bug, Trash2 } from 'lucide-react';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import SectionHeading from '../components/SectionHeading';
import FeatureGrid from '../components/FeatureGrid';
import ImageCardGrid from '../components/ImageCardGrid';
import { InfoTable } from '../components/InfoBlocks';
import SmartImage from '../components/SmartImage';
import CtaBand from '../components/CtaBand';
import useFetch from '../hooks/useFetch';
import { siteService } from '../services/siteService';
import { useContent } from '../context/ContentContext';
import { formatDate } from '../utils/format';
import { PAGE_IMAGES, withFallback } from '../assets/images';
import './QualityPage.css';

const BIOSECURITY_ICONS = [DoorClosed, Footprints, Shirt, Repeat, SprayCan, ShieldAlert, Bug, Trash2];

export default function QualityPage() {
  const quality = useContent('quality');
  const { biosecurity, vaccination, foodSafety } = quality;
  // Only certifications an admin has uploaded and marked public/active are ever shown.
  const certs = useFetch(() => siteService.getCertifications(), []);

  return (
    <>
      <SEO title="Quality & Hygiene" description={quality.heroSubtitle} image={quality.heroImage?.url} />
      <PageHero title={quality.heroTitle} subtitle={quality.heroSubtitle} image={withFallback(quality.heroImage, PAGE_IMAGES.quality)} crumbs={[{ label: 'Quality & Hygiene' }]} />

      <section className="section section--white">
        <div className="container">
          <p className="quality-intro">{quality.intro}</p>
          <ImageCardGrid items={quality.standards} slotPrefix="quality-standards" columns={Math.min(quality.standards?.length || 1, 4)} ratio="4 / 3" />
        </div>
      </section>

      {biosecurity?.items?.length > 0 && (
        <section className="section section--dark">
          <div className="container">
            <SectionHeading light eyebrow={biosecurity.eyebrow} title={biosecurity.title} text={biosecurity.text} />
            <FeatureGrid items={biosecurity.items} icons={BIOSECURITY_ICONS} columns={4} variant="dark" />
          </div>
        </section>
      )}

      {vaccination?.rows?.length > 0 && (
        <section className="section">
          <div className="container quality-vaccination">
            <SectionHeading eyebrow={vaccination.eyebrow} title={vaccination.title} text={vaccination.text} />
            <InfoTable
              caption={vaccination.title}
              columns={[
                { key: 'age', label: 'Age' },
                { key: 'vaccine', label: 'Vaccine / disease' },
                { key: 'method', label: 'How it is given' },
              ]}
              rows={vaccination.rows}
              note={vaccination.note}
            />
          </div>
        </section>
      )}

      {foodSafety?.items?.length > 0 && (
        <section className="section section--white" id="food-safety">
          <div className="container">
            <SectionHeading eyebrow={foodSafety.eyebrow} title={foodSafety.title} text={foodSafety.text} />
            <ImageCardGrid items={foodSafety.items} slotPrefix="quality-foodsafety" columns={3} ratio="16 / 10" />
          </div>
        </section>
      )}

      {certs.data?.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHeading eyebrow="Verified" title="Certifications & Approvals" />
            <div className="cert-grid">
              {certs.data.map((cert) => (
                <article key={cert._id} className="cert-card">
                  {cert.image?.url ? (
                    <a href={cert.image.url} target="_blank" rel="noreferrer" aria-label={`View ${cert.name}`}>
                      <SmartImage src={cert.image.url} alt={cert.name} width={600} ratio="4 / 3" />
                    </a>
                  ) : (
                    <div className="cert-card__icon">
                      <Award aria-hidden="true" />
                    </div>
                  )}
                  <div className="cert-card__body">
                    <h3>{cert.name}</h3>
                    <p>{cert.issuingOrganisation}</p>
                    {(cert.issueDate || cert.expiryDate) && (
                      <span className="cert-card__dates">
                        <CalendarCheck aria-hidden="true" />
                        {cert.issueDate && `Issued ${formatDate(cert.issueDate)}`}
                        {cert.expiryDate && ` · Valid until ${formatDate(cert.expiryDate)}`}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBand />
    </>
  );
}
