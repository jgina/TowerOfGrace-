import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import MediaSplit from '../components/MediaSplit';
import SmartImage from '../components/SmartImage';
import SectionHeading from '../components/SectionHeading';
import ImageCardGrid from '../components/ImageCardGrid';
import CtaBand from '../components/CtaBand';
import useFetch from '../hooks/useFetch';
import { siteService } from '../services/siteService';
import { useContent } from '../context/ContentContext';
import { DEFAULT_GALLERY, PAGE_IMAGES, cardImage, withFallback } from '../assets/images';
import { slotImage, slotHint } from '../assets/siteImages';
import './OurFarmPage.css';

export default function OurFarmPage() {
  const farm = useContent('farm');
  const { routine } = farm;
  const photos = useFetch(
    () =>
      Promise.all([siteService.getGallery({ category: 'Farm', limit: 6 }), siteService.getGallery({ category: 'Facilities', limit: 6 })]).then(
        ([a, b]) => [...a.items, ...b.items].slice(0, 6)
      ),
    []
  );

  // Bundled photos stand in until Farm/Facilities photos are uploaded to the gallery.
  const farmPhotos = photos.data?.length ? photos.data : photos.loading ? [] : DEFAULT_GALLERY.slice(0, 6);

  return (
    <>
      <SEO title="Our Farm" description={farm.heroSubtitle} image={farm.heroImage?.url} />
      <PageHero title={farm.heroTitle} subtitle={farm.heroSubtitle} image={withFallback(farm.heroImage, PAGE_IMAGES.farm)} crumbs={[{ label: 'Our Farm' }]} />

      <section className="section section--white">
        <div className="container">
          <p className="farm-intro">{farm.intro}</p>
          <div className="farm-sections">
            {farm.sections?.map((section, index) => {
              const slot = `farm-sections-${index + 1}`;
              return (
                <MediaSplit
                  key={`${section.title}-${index}`}
                  image={slotImage(section.image, slot, cardImage('farm-sections', index))}
                  imageLabel={section.title}
                  imageHint={slotHint(slot)}
                  eyebrow={`Farm area ${String(index + 1).padStart(2, '0')}`}
                  title={section.title}
                  text={section.text}
                  reverse={index % 2 === 1}
                />
              );
            })}
          </div>
        </div>
      </section>

      {routine?.items?.length > 0 && (
        <section className="section section--dark">
          <div className="container">
            <SectionHeading light eyebrow={routine.eyebrow} title={routine.title} text={routine.text} />
            <ImageCardGrid items={routine.items} slotPrefix="farm-routine" columns={5} ratio="1 / 1" variant="dark" numbered />
          </div>
        </section>
      )}

      {farmPhotos.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHeading
              eyebrow="Gallery"
              title="Around the Farm"
              action={
                <Link to="/gallery" className="btn btn--outline">
                  View Gallery <ArrowRight />
                </Link>
              }
            />
            <div className="farm-photos">
              {farmPhotos.map((item) => (
                <SmartImage key={item._id} src={item.image?.url} alt={item.image?.alt || item.title || 'Farm photo'} width={700} ratio="4 / 3" />
              ))}
            </div>
          </div>
        </section>
      )}

      <CtaBand />
    </>
  );
}
