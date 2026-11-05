import { Helmet } from 'react-helmet-async';
import { useContent } from '../context/ContentContext';
import { LEGAL_NAME, SITE_NAME, SITE_URL } from '../utils/constants';

const DEFAULT_IMAGE = `${SITE_URL}/brand/logo-512.png`;

function absoluteUrl(value) {
  if (!value) return undefined;
  try {
    return new URL(value, SITE_URL).href;
  } catch {
    return undefined;
  }
}

/**
 * Page-level metadata: title, description, canonical URL, Open Graph/Twitter tags and optional JSON-LD.
 */
export default function SEO({ title, description, image, imageAlt, type = 'website', jsonLd, noIndex = false }) {
  const { content, settings } = useContent();
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${LEGAL_NAME}`;
  const desc =
    description ||
    content.home?.hero?.subtitle ||
    'Broilers, noilers, eggs and turkeys from Tower of Grace Farms & Agro-Based Industries Ltd.';
  const url = typeof window !== 'undefined' ? new URL(window.location.pathname, SITE_URL).href : SITE_URL;
  const ogImage = absoluteUrl(image || settings?.logo?.url) || DEFAULT_IMAGE;
  const socialImageAlt = imageAlt || `${SITE_NAME} poultry farm`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="robots" content={noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'} />
      <meta name="googlebot" content={noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'} />
      <link rel="canonical" href={url} />
      <meta property="og:site_name" content={LEGAL_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content="en_NG" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={socialImageAlt} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={socialImageAlt} />
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd).replace(/</g, '\\u003c')}
        </script>
      )}
    </Helmet>
  );
}

// Organization structured data built only from details the admin has entered.
export function useOrganizationJsonLd() {
  const { content, settings } = useContent();
  const { contact, footer } = content;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        legalName: LEGAL_NAME,
        url: SITE_URL,
        logo: absoluteUrl(settings?.logo?.url) || DEFAULT_IMAGE,
        ...(contact.email ? { email: contact.email } : {}),
        ...(contact.phone ? { telephone: contact.phone } : {}),
        ...(contact.address ? { address: contact.address } : {}),
        ...(footer.socials?.length
          ? {
              sameAs: footer.socials
                .map((social) => social.url)
                .filter((socialUrl) => /^https?:\/\//i.test(socialUrl || '')),
            }
          : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: 'en-NG',
      },
    ],
  };
}
