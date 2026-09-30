/*
  Bundled farm photography.
  These are fallbacks: anything an admin uploads (Cloudinary) always takes priority.
  They are imported (not stored in the CMS) because Vite gives bundled files hashed URLs that change per build.
*/
import broilersPen from './poultry1.jpg';
import broilerHouse from './poultry2.jpg';
import dayOldChicks from './poultry 4.jpg';
import noilers from './noilers.jpg';
import eggCollection from './egg poultry.jpg';
import turkeys from './poultry turkey.jpg';
import turkeyFlock from './Turkey 3.jpg';
import { siteImage } from './siteImages';

const img = (url, alt) => ({ url, alt });

export const PHOTOS = {
  broilersPen: img(broilersPen, 'Broilers resting on clean wood-shaving litter with hanging feeders and drinkers'),
  broilerHouse: img(broilerHouse, 'Inside a Tower of Grace broiler house with rows of feeders and drinkers'),
  dayOldChicks: img(dayOldChicks, 'Day-old chicks in the brooding house'),
  noilers: img(noilers, 'Noiler birds on grass'),
  eggCollection: img(eggCollection, 'Farm staff collecting fresh eggs in the layer house'),
  turkeys: img(turkeys, 'Turkeys on the farm'),
  turkeyFlock: img(turkeyFlock, 'A flock of turkeys in the farm yard'),
};

// A file in assets/site/ named after the slot replaces the bundled photo (see assets/siteImages.js).
const slot = (name, photo) => siteImage(name, photo?.alt) || photo || null;

// Default photo for each product line, keyed by category slug (slot: category-<slug>).
export const CATEGORY_IMAGES = {
  broilers: slot('category-broilers', PHOTOS.broilersPen),
  noilers: slot('category-noilers', PHOTOS.noilers),
  eggs: slot('category-eggs', PHOTOS.eggCollection),
  turkeys: slot('category-turkeys', PHOTOS.turkeys),
};

// Default photos for page heroes and feature blocks (slot name in quotes).
export const PAGE_IMAGES = {
  homeHero: slot('home-hero', PHOTOS.broilerHouse),
  homeInfrastructure: slot('home-infrastructure', PHOTOS.broilerHouse),
  about: slot('about-hero', PHOTOS.eggCollection),
  aboutStory: slot('about-story', PHOTOS.eggCollection),
  farm: slot('farm-hero', PHOTOS.turkeyFlock),
  quality: slot('quality-hero', PHOTOS.broilersPen),
  production: slot('production-hero', PHOTOS.dayOldChicks),
  products: slot('products-hero', PHOTOS.broilersPen),
  shop: slot('shop-hero', PHOTOS.broilersPen),
  bulk: slot('bulk-hero', PHOTOS.turkeys),
  contact: slot('contact-hero', PHOTOS.broilerHouse),
  gallery: slot('gallery-hero', PHOTOS.turkeyFlock),
};

// Bundled photos that suit particular cards, matched by position (the slot files still take priority).
export const PRODUCTION_STEP_IMAGES = [PHOTOS.dayOldChicks, null, PHOTOS.broilerHouse, PHOTOS.broilersPen];
export const FARM_SECTION_IMAGES = [PHOTOS.dayOldChicks, PHOTOS.broilerHouse, PHOTOS.eggCollection, PHOTOS.noilers];
export const PRODUCT_LINE_IMAGES = [PHOTOS.broilersPen, PHOTOS.noilers, PHOTOS.eggCollection, PHOTOS.turkeyFlock];

// Shown in the gallery until the admin uploads photos.
export const DEFAULT_GALLERY = [
  { _id: 'default-1', category: 'Facilities', title: 'Broiler house', image: PHOTOS.broilerHouse },
  { _id: 'default-2', category: 'Broilers', title: 'Broilers', image: PHOTOS.broilersPen },
  { _id: 'default-3', category: 'Production', title: 'Brooding day-old chicks', image: PHOTOS.dayOldChicks },
  { _id: 'default-4', category: 'Eggs', title: 'Egg collection', image: PHOTOS.eggCollection },
  { _id: 'default-5', category: 'Noilers', title: 'Noilers', image: PHOTOS.noilers },
  { _id: 'default-6', category: 'Turkeys', title: 'Turkeys', image: PHOTOS.turkeys },
  { _id: 'default-7', category: 'Farm', title: 'Turkey flock', image: PHOTOS.turkeyFlock },
];

/** Returns the uploaded image if present, otherwise the bundled fallback. */
export const withFallback = (image, fallback) => (image?.url ? image : fallback || null);

export const categoryImage = (category) =>
  withFallback(category?.image, CATEGORY_IMAGES[category?.slug] || siteImage(`category-${category?.slug}`, category?.name));

/** Product image: its own uploads first, then its category's photo. */
export const productImage = (product) => product?.images?.[0] || CATEGORY_IMAGES[product?.category?.slug] || null;
