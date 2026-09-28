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

// Default photo for each product line, keyed by category slug.
export const CATEGORY_IMAGES = {
  broilers: PHOTOS.broilersPen,
  noilers: PHOTOS.noilers,
  eggs: PHOTOS.eggCollection,
  turkeys: PHOTOS.turkeys,
};

// Default photos for page heroes and feature blocks.
export const PAGE_IMAGES = {
  homeHero: PHOTOS.broilerHouse,
  homeInfrastructure: PHOTOS.broilerHouse,
  about: PHOTOS.eggCollection,
  aboutStory: PHOTOS.eggCollection,
  farm: PHOTOS.turkeyFlock,
  quality: PHOTOS.broilersPen,
  production: PHOTOS.dayOldChicks,
  shop: PHOTOS.broilersPen,
  bulk: PHOTOS.turkeys,
  contact: PHOTOS.broilerHouse,
};

// Default image per production step (matched by position).
export const PRODUCTION_STEP_IMAGES = [PHOTOS.dayOldChicks, PHOTOS.broilerHouse, PHOTOS.broilersPen, PHOTOS.eggCollection];

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

export const categoryImage = (category) => withFallback(category?.image, CATEGORY_IMAGES[category?.slug]);

/** Product image: its own uploads first, then its category's photo. */
export const productImage = (product) => product?.images?.[0] || CATEGORY_IMAGES[product?.category?.slug] || null;
