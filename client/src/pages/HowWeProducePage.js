import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import SmartImage from '../components/SmartImage';
import CtaBand from '../components/CtaBand';
import { useContent } from '../context/ContentContext';
import { PAGE_IMAGES, PRODUCTION_STEP_IMAGES, withFallback } from '../assets/images';
import './HowWeProducePage.css';

export default function HowWeProducePage() {
  const production = useContent('production');
  return (
    <>
      <SEO title="How We Produce" description={production.heroSubtitle} image={production.heroImage?.url} />
      <PageHero title={production.heroTitle} subtitle={production.heroSubtitle} image={withFallback(production.heroImage, PAGE_IMAGES.production)} crumbs={[{ label: 'How We Produce' }]} />

      <section className="section section--white">
        <div className="container">
          <p className="produce-intro">{production.intro}</p>
          <ol className="produce-steps">
            {production.steps?.map((step, index) => (
              <li key={`${step.title}-${index}`} className="produce-step">
                <span className="produce-step__num">{String(index + 1).padStart(2, '0')}</span>
                <div className="produce-step__card">
                  <SmartImage
                    src={withFallback(step.image, PRODUCTION_STEP_IMAGES[index])?.url}
                    alt={withFallback(step.image, PRODUCTION_STEP_IMAGES[index])?.alt || step.title}
                    width={700}
                    ratio="16 / 10"
                    label={step.title}
                  />
                  <div className="produce-step__body">
                    <h2>{step.title}</h2>
                    <p className="prose">{step.text}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
