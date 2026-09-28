import { Home, Droplets, Stethoscope, PackageCheck, Award, CalendarCheck } from 'lucide-react';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import SectionHeading from '../components/SectionHeading';
import FeatureGrid from '../components/FeatureGrid';
import SmartImage from '../components/SmartImage';
import CtaBand from '../components/CtaBand';
import useFetch from '../hooks/useFetch';
import { siteService } from '../services/siteService';
import { useContent } from '../context/ContentContext';
import { formatDate } from '../utils/format';
import { PAGE_IMAGES, withFallback } from '../assets/images';
import './QualityPage.css';

export default function QualityPage() {
  const quality = useContent('quality');
  // Only certifications an admin has uploaded and marked public/active are ever shown.
  const certs = useFetch(() => siteService.getCertifications(), []);

  return (
    <>
      <SEO title="Quality & Hygiene" description={quality.heroSubtitle} image={quality.heroImage?.url} />
      <PageHero title={quality.heroTitle} subtitle={quality.heroSubtitle} image={withFallback(quality.heroImage, PAGE_IMAGES.quality)} crumbs={[{ label: 'Quality & Hygiene' }]} />

      <section className="section section--white">
        <div className="container">
          <p className="quality-intro">{quality.intro}</p>
          <FeatureGrid items={quality.standards} icons={[Home, Droplets, Stethoscope, PackageCheck]} columns={Math.min(quality.standards?.length || 1, 4)} />
        </div>
      </section>

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
