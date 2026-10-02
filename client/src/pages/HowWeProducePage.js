import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import SmartImage from '../components/SmartImage';
import SectionHeading from '../components/SectionHeading';
import ImageCardGrid from '../components/ImageCardGrid';
import { InfoTable } from '../components/InfoBlocks';
import CtaBand from '../components/CtaBand';
import { useContent } from '../context/ContentContext';
import { PAGE_IMAGES, cardImage, withFallback } from '../assets/images';
import { slotImage, slotHint } from '../assets/siteImages';
import './HowWeProducePage.css';

export default function HowWeProducePage() {
  const production = useContent('production');
  const { timelines, feeding } = production;
  return (
    <>
      <SEO title="How We Produce" description={production.heroSubtitle} image={production.heroImage?.url} />
      <PageHero title={production.heroTitle} subtitle={production.heroSubtitle} image={withFallback(production.heroImage, PAGE_IMAGES.production)} crumbs={[{ label: 'How We Produce' }]} />

      <section className="section section--white">
        <div className="container">
          <p className="produce-intro">{production.intro}</p>
          <ol className="produce-steps">
            {production.steps?.map((step, index) => {
              const slot = `production-steps-${index + 1}`;
              const image = slotImage(step.image, slot, cardImage('production-steps', index));
              return (
                <li key={`${step.title}-${index}`} className="produce-step">
                  <span className="produce-step__num">{String(index + 1).padStart(2, '0')}</span>
                  <div className="produce-step__card">
                    <SmartImage src={image?.url} alt={image?.alt || step.title} width={700} ratio="16 / 10" label={step.title} hint={slotHint(slot)} fit={image?.fit || 'cover'} />
                    <div className="produce-step__body">
                      <h2>{step.title}</h2>
                      <p className="prose">{step.text}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {timelines?.items?.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHeading eyebrow={timelines.eyebrow} title={timelines.title} text={timelines.text} />
            <ImageCardGrid items={timelines.items} slotPrefix="production-timelines" columns={4} ratio="4 / 3" />
          </div>
        </section>
      )}

      {feeding?.rows?.length > 0 && (
        <section className="section section--white">
          <div className="container">
            <SectionHeading eyebrow={feeding.eyebrow} title={feeding.title} text={feeding.text} />
            <InfoTable
              caption={feeding.title}
              columns={[
                { key: 'phase', label: 'Phase' },
                { key: 'age', label: 'Age' },
                { key: 'feed', label: 'Feed' },
                { key: 'protein', label: 'Crude protein' },
              ]}
              rows={feeding.rows}
              note={feeding.note}
            />
          </div>
        </section>
      )}

      <CtaBand />
    </>
  );
}
