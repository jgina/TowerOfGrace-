import { Eye, Target, Heart, Sparkles, ShieldCheck, Users } from 'lucide-react';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import MediaSplit from '../components/MediaSplit';
import SectionHeading from '../components/SectionHeading';
import FeatureGrid from '../components/FeatureGrid';
import CtaBand from '../components/CtaBand';
import { useContent } from '../context/ContentContext';
import { PAGE_IMAGES, withFallback } from '../assets/images';
import './AboutPage.css';

export default function AboutPage() {
  const about = useContent('about');
  return (
    <>
      <SEO title="About Us" description={about.heroSubtitle} image={about.heroImage?.url} />
      <PageHero title={about.heroTitle} subtitle={about.heroSubtitle} image={withFallback(about.heroImage, PAGE_IMAGES.about)} crumbs={[{ label: 'About Us' }]} />

      <section className="section section--white">
        <div className="container">
          <MediaSplit image={withFallback(about.image, PAGE_IMAGES.aboutStory)} imageLabel="Our team" eyebrow="Who we are" title={about.storyTitle} text={about.story} />
        </div>
      </section>

      <section className="section section--dark">
        <div className="container about-vm">
          <article className="about-vm__card">
            <Eye aria-hidden="true" />
            <h2>Our Vision</h2>
            <p>{about.vision}</p>
          </article>
          <article className="about-vm__card">
            <Target aria-hidden="true" />
            <h2>Our Mission</h2>
            <p>{about.mission}</p>
          </article>
        </div>
      </section>

      {about.values?.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHeading eyebrow="What guides us" title="Our Values" align="center" />
            <FeatureGrid items={about.values} icons={[ShieldCheck, Heart, Sparkles, Users]} columns={Math.min(about.values.length, 4)} />
          </div>
        </section>
      )}

      <CtaBand />
    </>
  );
}
