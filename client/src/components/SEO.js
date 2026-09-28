import { Helmet } from 'react-helmet-async';
import { useContent } from '../context/ContentContext';
import { LEGAL_NAME, SITE_NAME } from '../utils/constants';

/**
 * Page-level metadata: title, description, canonical URL, Open Graph/Twitter tags and optional JSON-LD.
 */
export default function SEO({ title, description, image, type = 'website', jsonLd, noIndex = false }) {
  const { content, settings } = useContent();
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${LEGAL_NAME}`;
  const desc =
    description ||
    content.home?.hero?.subtitle ||
    'Broilers, noilers, eggs and turkeys from Tower of Grace Farms & Agro-Based Industries Ltd.';
  const url = typeof window !== 'undefined' ? window.location.href.split('?')[0] : undefined;
  const ogImage = image || settings?.logo?.url;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {url && <link rel="canonical" href={url} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:site_name" content={LEGAL_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}

// Organization structured data built only from details the admin has entered.
export function useOrganizationJsonLd() {
  const { content, settings } = useContent();
  const { contact, footer } = content;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: LEGAL_NAME,
    url: origin,
    ...(settings?.logo?.url ? { logo: settings.logo.url } : {}),
    ...(contact.email ? { email: contact.email } : {}),
    ...(contact.phone ? { telephone: contact.phone } : {}),
    ...(contact.address ? { address: contact.address } : {}),
    ...(footer.socials?.length ? { sameAs: footer.socials.map((s) => s.url).filter(Boolean) } : {}),
  };
}
