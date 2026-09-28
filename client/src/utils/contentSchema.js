/*
  CMS content model.
  - DEFAULT_CONTENT is what the site shows until an admin saves their own text in Admin → Content.
    It deliberately makes no factual claims (no capacity, founding year, awards, certifications or locations).
  - CONTENT_SECTIONS describes the admin editor form for each section.
*/

export const DEFAULT_CONTENT = {
  home: {
    hero: {
      eyebrow: 'Quality Poultry · Healthy Food · Brighter Tomorrow',
      titleLine1: 'Quality Poultry.',
      titleLine2: 'Healthy Food.',
      subtitle:
        'Broilers, noilers, fresh eggs and turkeys raised with care, and supplied to homes, restaurants, hotels and retailers.',
      primaryCtaLabel: 'Shop Products',
      primaryCtaLink: '/shop',
      secondaryCtaLabel: 'Bulk Orders',
      secondaryCtaLink: '/bulk-orders',
      image: null,
    },
    pillars: {
      eyebrow: 'Why Tower of Grace',
      title: 'The Pillars of Tower of Grace',
      text: 'Everything we produce is guided by a few simple commitments.',
      items: [
        { title: 'Healthy Birds', text: 'Attentive care, clean water and quality feed at every stage of growth.' },
        { title: 'Hygienic Handling', text: 'Clean processes from the pen to packaging and delivery.' },
        { title: 'Reliable Supply', text: 'Consistent availability for households and business customers.' },
        { title: 'Honest Service', text: 'Clear pricing, clear weights and responsive customer support.' },
      ],
    },
    products: {
      eyebrow: 'What we produce',
      title: 'Our Poultry Products',
      text: 'Choose the size, weight or pack that suits you, then order online.',
    },
    infrastructure: {
      eyebrow: 'Our farm',
      title: 'Modern Infrastructure, Responsible Methods',
      text: 'Describe your housing, feeding, biosecurity and processing set-up here from Admin → Content → Home.',
      image: null,
      stats: [],
    },
    bulk: {
      eyebrow: 'For businesses',
      title: 'Hotels, Caterers & Wholesale',
      text: 'Regular or one-off supply for hotels, restaurants, caterers, supermarkets, retailers and distributors.',
      ctaLabel: 'Request Bulk Supply',
    },
    retail: {
      eyebrow: 'For households',
      title: 'Wholesale & Retail Orders',
      text: 'Order a single bird, a crate of eggs or a family pack — delivered or ready for pickup.',
      ctaLabel: 'Start Shopping',
    },
    gallery: {
      eyebrow: 'Gallery',
      title: 'Life on the Farm',
    },
    contactStrip: {
      title: 'Questions about an order?',
      text: 'Speak with our team on WhatsApp or send us a message.',
    },
  },
  about: {
    heroTitle: 'About Us',
    heroSubtitle: 'Get to know Tower of Grace Farms & Agro-Based Industries Ltd.',
    heroImage: null,
    storyTitle: 'Our Story',
    story: 'Tell the Tower of Grace story here from Admin → Content → About Us.',
    image: null,
    vision: 'Add your vision statement from Admin → Content → About Us.',
    mission: 'Add your mission statement from Admin → Content → About Us.',
    values: [
      { title: 'Integrity', text: 'We are honest about what we sell and how we produce it.' },
      { title: 'Care', text: 'We care for our birds, our people and our customers.' },
      { title: 'Quality', text: 'We hold every product to a consistent standard.' },
    ],
  },
  farm: {
    heroTitle: 'Our Farm',
    heroSubtitle: 'Where our poultry is raised.',
    heroImage: null,
    intro: 'Describe the farm, its layout and its facilities from Admin → Content → Our Farm.',
    sections: [],
  },
  quality: {
    heroTitle: 'Quality & Hygiene',
    heroSubtitle: 'The standards behind every bird and every egg.',
    heroImage: null,
    intro: 'Describe your quality, hygiene and biosecurity practices from Admin → Content → Quality & Hygiene.',
    standards: [
      { title: 'Clean Housing', text: 'Pens are cleaned and maintained on a regular schedule.' },
      { title: 'Feed & Water', text: 'Birds receive quality feed and clean drinking water.' },
      { title: 'Health Monitoring', text: 'Flocks are observed daily and health issues are addressed promptly.' },
      { title: 'Careful Packaging', text: 'Products are packed hygienically for safe delivery.' },
    ],
  },
  production: {
    heroTitle: 'How We Produce',
    heroSubtitle: 'From day-old chicks to your table.',
    heroImage: null,
    intro: 'Walk customers through your production process from Admin → Content → How We Produce.',
    steps: [
      { title: 'Sourcing', text: 'Chicks and poults are sourced for healthy growth.', image: null },
      { title: 'Brooding & Rearing', text: 'Young birds are kept warm, fed and monitored.', image: null },
      { title: 'Growing', text: 'Birds grow to their target weights with balanced nutrition.', image: null },
      { title: 'Harvest & Packing', text: 'Products are prepared and packed for delivery or pickup.', image: null },
    ],
  },
  contact: {
    intro: 'Reach our team for orders, deliveries and enquiries.',
    phone: '',
    phoneAlt: '',
    email: '',
    whatsapp: '',
    address: '',
    mapEmbedUrl: '',
    openingHours: [],
  },
  bulk: {
    heroTitle: 'Bulk Orders',
    heroSubtitle: 'Reliable poultry supply for businesses.',
    intro: 'Tell us what you need and our sales team will get back to you with availability and pricing.',
    benefits: [
      { title: 'Consistent supply', text: 'Plan regular deliveries around your business.' },
      { title: 'Choose your weights', text: 'Request the sizes and pack options you need.' },
      { title: 'Dedicated contact', text: 'Work with one point of contact for your orders.' },
    ],
  },
  footer: {
    about: 'Tower of Grace Farms & Agro-Based Industries Ltd produces broilers, noilers, eggs and turkeys for homes and businesses.',
    socials: [],
    copyright: 'Tower of Grace Farms & Agro-Based Industries Ltd. All rights reserved.',
  },
  announcement: {
    enabled: false,
    text: '',
    linkLabel: '',
    link: '',
  },
};

const list = (name, label, fields, hint) => ({ name, label, type: 'list', fields, hint });
const titleText = [
  { name: 'title', label: 'Title', type: 'text' },
  { name: 'text', label: 'Text', type: 'textarea' },
];

export const CONTENT_SECTIONS = [
  {
    key: 'home',
    label: 'Homepage',
    description: 'Hero, pillars, farm infrastructure and call-to-action sections on the homepage.',
    groups: [
      {
        title: 'Hero',
        fields: [
          { name: 'hero.eyebrow', label: 'Small heading', type: 'text' },
          { name: 'hero.titleLine1', label: 'Headline line 1', type: 'text' },
          { name: 'hero.titleLine2', label: 'Headline line 2 (amber)', type: 'text' },
          { name: 'hero.subtitle', label: 'Subtitle', type: 'textarea' },
          { name: 'hero.primaryCtaLabel', label: 'Primary button label', type: 'text' },
          { name: 'hero.primaryCtaLink', label: 'Primary button link', type: 'text' },
          { name: 'hero.secondaryCtaLabel', label: 'Secondary button label', type: 'text' },
          { name: 'hero.secondaryCtaLink', label: 'Secondary button link', type: 'text' },
          { name: 'hero.image', label: 'Hero image', type: 'image' },
        ],
      },
      {
        title: 'Pillars',
        fields: [
          { name: 'pillars.eyebrow', label: 'Small heading', type: 'text' },
          { name: 'pillars.title', label: 'Title', type: 'text' },
          { name: 'pillars.text', label: 'Intro', type: 'textarea' },
          list('pillars.items', 'Pillars', titleText),
        ],
      },
      {
        title: 'Products section',
        fields: [
          { name: 'products.eyebrow', label: 'Small heading', type: 'text' },
          { name: 'products.title', label: 'Title', type: 'text' },
          { name: 'products.text', label: 'Intro', type: 'textarea' },
        ],
      },
      {
        title: 'Infrastructure',
        fields: [
          { name: 'infrastructure.eyebrow', label: 'Small heading', type: 'text' },
          { name: 'infrastructure.title', label: 'Title', type: 'text' },
          { name: 'infrastructure.text', label: 'Text', type: 'textarea' },
          { name: 'infrastructure.image', label: 'Image', type: 'image' },
          list(
            'infrastructure.stats',
            'Key figures',
            [
              { name: 'value', label: 'Value', type: 'text' },
              { name: 'label', label: 'Label', type: 'text' },
            ],
            'Only add verified figures. The block is hidden when empty.'
          ),
        ],
      },
      {
        title: 'Retail & bulk call-to-actions',
        fields: [
          { name: 'retail.eyebrow', label: 'Retail small heading', type: 'text' },
          { name: 'retail.title', label: 'Retail title', type: 'text' },
          { name: 'retail.text', label: 'Retail text', type: 'textarea' },
          { name: 'retail.ctaLabel', label: 'Retail button label', type: 'text' },
          { name: 'bulk.eyebrow', label: 'Bulk small heading', type: 'text' },
          { name: 'bulk.title', label: 'Bulk title', type: 'text' },
          { name: 'bulk.text', label: 'Bulk text', type: 'textarea' },
          { name: 'bulk.ctaLabel', label: 'Bulk button label', type: 'text' },
        ],
      },
      {
        title: 'Gallery & contact strip',
        fields: [
          { name: 'gallery.eyebrow', label: 'Gallery small heading', type: 'text' },
          { name: 'gallery.title', label: 'Gallery title', type: 'text' },
          { name: 'contactStrip.title', label: 'Contact strip title', type: 'text' },
          { name: 'contactStrip.text', label: 'Contact strip text', type: 'textarea' },
        ],
      },
    ],
  },
  {
    key: 'about',
    label: 'About Us',
    description: 'Story, vision, mission and values.',
    groups: [
      {
        title: 'Page header',
        fields: [
          { name: 'heroTitle', label: 'Title', type: 'text' },
          { name: 'heroSubtitle', label: 'Subtitle', type: 'textarea' },
          { name: 'heroImage', label: 'Header image', type: 'image' },
        ],
      },
      {
        title: 'Story',
        fields: [
          { name: 'storyTitle', label: 'Story title', type: 'text' },
          { name: 'story', label: 'Story', type: 'textarea', rows: 8 },
          { name: 'image', label: 'Story image', type: 'image' },
        ],
      },
      {
        title: 'Vision, mission & values',
        fields: [
          { name: 'vision', label: 'Vision', type: 'textarea' },
          { name: 'mission', label: 'Mission', type: 'textarea' },
          list('values', 'Values', titleText),
        ],
      },
    ],
  },
  {
    key: 'farm',
    label: 'Our Farm',
    description: 'Farm overview and facility sections.',
    groups: [
      {
        title: 'Page header',
        fields: [
          { name: 'heroTitle', label: 'Title', type: 'text' },
          { name: 'heroSubtitle', label: 'Subtitle', type: 'textarea' },
          { name: 'heroImage', label: 'Header image', type: 'image' },
          { name: 'intro', label: 'Introduction', type: 'textarea', rows: 6 },
        ],
      },
      { title: 'Sections', fields: [list('sections', 'Farm sections', [...titleText, { name: 'image', label: 'Image', type: 'image' }])] },
    ],
  },
  {
    key: 'quality',
    label: 'Quality & Hygiene',
    description: 'Quality standards. Certifications are managed separately under Certifications.',
    groups: [
      {
        title: 'Page header',
        fields: [
          { name: 'heroTitle', label: 'Title', type: 'text' },
          { name: 'heroSubtitle', label: 'Subtitle', type: 'textarea' },
          { name: 'heroImage', label: 'Header image', type: 'image' },
          { name: 'intro', label: 'Introduction', type: 'textarea', rows: 6 },
        ],
      },
      { title: 'Standards', fields: [list('standards', 'Standards', titleText)] },
    ],
  },
  {
    key: 'production',
    label: 'How We Produce',
    description: 'Step-by-step production process.',
    groups: [
      {
        title: 'Page header',
        fields: [
          { name: 'heroTitle', label: 'Title', type: 'text' },
          { name: 'heroSubtitle', label: 'Subtitle', type: 'textarea' },
          { name: 'heroImage', label: 'Header image', type: 'image' },
          { name: 'intro', label: 'Introduction', type: 'textarea', rows: 6 },
        ],
      },
      { title: 'Steps', fields: [list('steps', 'Production steps', [...titleText, { name: 'image', label: 'Image', type: 'image' }])] },
    ],
  },
  {
    key: 'contact',
    label: 'Contact Details',
    description: 'Phone, email, address, WhatsApp, map and opening hours used across the site.',
    groups: [
      {
        title: 'Contact details',
        fields: [
          { name: 'intro', label: 'Introduction', type: 'textarea' },
          { name: 'phone', label: 'Phone', type: 'text' },
          { name: 'phoneAlt', label: 'Alternative phone', type: 'text' },
          { name: 'email', label: 'Email', type: 'text' },
          { name: 'whatsapp', label: 'WhatsApp number (international format, e.g. 234...)', type: 'text' },
          { name: 'address', label: 'Address', type: 'textarea' },
          {
            name: 'mapEmbedUrl',
            label: 'Google Maps embed URL',
            type: 'text',
            hint: 'In Google Maps: Share → Embed a map → copy only the src="..." URL.',
          },
        ],
      },
      {
        title: 'Opening hours',
        fields: [
          list('openingHours', 'Opening hours', [
            { name: 'days', label: 'Days', type: 'text' },
            { name: 'hours', label: 'Hours', type: 'text' },
          ]),
        ],
      },
    ],
  },
  {
    key: 'bulk',
    label: 'Bulk Orders Page',
    description: 'Text on the bulk order request page.',
    groups: [
      {
        title: 'Bulk orders',
        fields: [
          { name: 'heroTitle', label: 'Title', type: 'text' },
          { name: 'heroSubtitle', label: 'Subtitle', type: 'textarea' },
          { name: 'intro', label: 'Introduction', type: 'textarea' },
          list('benefits', 'Benefits', titleText),
        ],
      },
    ],
  },
  {
    key: 'footer',
    label: 'Footer',
    description: 'Footer text and social links.',
    groups: [
      {
        title: 'Footer',
        fields: [
          { name: 'about', label: 'Short company description', type: 'textarea' },
          { name: 'copyright', label: 'Copyright line', type: 'text' },
          list('socials', 'Social links', [
            { name: 'platform', label: 'Platform', type: 'select', options: ['Facebook', 'Instagram', 'X', 'LinkedIn', 'YouTube', 'TikTok'] },
            { name: 'url', label: 'URL', type: 'text' },
          ]),
        ],
      },
    ],
  },
  {
    key: 'announcement',
    label: 'Announcement Bar',
    description: 'Optional message shown above the header on every page.',
    groups: [
      {
        title: 'Announcement',
        fields: [
          { name: 'enabled', label: 'Show announcement', type: 'boolean' },
          { name: 'text', label: 'Message', type: 'text' },
          { name: 'linkLabel', label: 'Link label', type: 'text' },
          { name: 'link', label: 'Link URL', type: 'text' },
        ],
      },
    ],
  },
];

// Deep-merges saved CMS data over defaults. Arrays from saved data replace default arrays entirely.
export function mergeContent(defaults, saved) {
  if (saved === undefined || saved === null) return defaults;
  if (Array.isArray(defaults) || Array.isArray(saved)) return saved;
  if (typeof defaults !== 'object' || typeof saved !== 'object') return saved;
  const result = { ...defaults };
  Object.keys(saved).forEach((key) => {
    result[key] = mergeContent(defaults?.[key], saved[key]);
  });
  return result;
}

export const getPath = (obj, path) => path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);

export function setPath(obj, path, value) {
  const keys = path.split('.');
  const clone = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
  let cursor = clone;
  keys.slice(0, -1).forEach((key) => {
    cursor[key] = { ...(cursor[key] || {}) };
    cursor = cursor[key];
  });
  cursor[keys[keys.length - 1]] = value;
  return clone;
}
