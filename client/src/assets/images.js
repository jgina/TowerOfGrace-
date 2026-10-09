/*
  Bundled farm photography.
  These are fallbacks: anything an admin uploads (Cloudinary) always takes priority, then any file added to
  assets/site/ for that slot (see assets/siteImages.js).
  They are imported (not stored in the CMS) because Vite gives bundled files hashed URLs that change per build.
*/
import broilersPen from './poultry1.jpg';
import broilerHouse from './poultry2.jpg';
import dayOldChicks from './poultry 4.jpg';
import noilers from './noilers.jpg';
import eggCollection from './egg poultry.jpg';
import turkeys from './poultry turkey.jpg';
import turkeyFlock from './Turkey 3.jpg';
import turkeyRun from './Turkey xx.jpg';
import brownHens from './noiler xx.jpg';
import eggTrays from './eggs xx.jpg';
import eggBaskets from './eggs yyyimg.jpg';
import eggsAndHens from './eggs.jpg';
import whiteBroiler from './Chicken.jpg';
import goldenHen from './Noilers 3.jpg';
import rawChicken from './Chicken meat img.jpg';
// Web-sized copies of the large video-frame PNGs (originals are kept alongside).
import broodingChicks from './web/brooding-chicks.jpg';
import noilerCock from './web/noiler-cock.jpg';
import roastedChicken from './web/roasted-chicken.jpg';
import feedStore from './Feed Store cvc.jpg';
import drinkerTrough from './Water & Sanitation.jpg';
import nippleDrinker from './Water & Sanitation cvc.jpg';
import chilledDisplay from './Thawing Safelycc.jpg';
import thawingBagged from './Thawing Safely.jpg';
import thawingPlate from './Thawing Safelybnb.jpg';
import kitchenHygiene from './Kitchen Hygiene.jpg';
import cleaverChicken from './Kitchen Hygiene main.jpg';
import roastWholeChicken from './Whole Dressed Chickenxxx.jpg';
import herbRoastChicken from './Whole Dressed Chickenvvv.jpg';
import grilledDrumsticks from './Roasted & Grilleddfd.jpg';
import grilledQuarters from './Roasted & Grilledvcv.jpg';
import { siteImage } from './siteImages';

// `fit: 'cutout'` marks cut-out photos on a white background, which must never be cropped.
const img = (url, alt, fit) => ({ url, alt, ...(fit ? { fit } : {}) });

export const PHOTOS = {
  broilersPen: img(broilersPen, 'Broilers resting on clean wood-shaving litter with hanging feeders and drinkers'),
  broilerHouse: img(broilerHouse, 'Inside a Tower of Grace broiler house with rows of feeders and drinkers'),
  dayOldChicks: img(dayOldChicks, 'Day-old chicks in the brooding house'),
  broodingChicks: img(broodingChicks, 'Hundreds of day-old chicks around feeders on clean litter'),
  noilers: img(noilers, 'Noiler birds on grass'),
  noilerCock: img(noilerCock, 'A noiler cock with golden and dark tail feathers'),
  brownHens: img(brownHens, 'Brown hens together in their pen'),
  goldenHen: img(goldenHen, 'A golden-brown hen', 'cutout'),
  whiteBroiler: img(whiteBroiler, 'A healthy white broiler chicken', 'cutout'),
  eggCollection: img(eggCollection, 'Farm staff collecting fresh eggs in the layer house'),
  eggBaskets: img(eggBaskets, 'Baskets of freshly collected brown eggs'),
  eggTrays: img(eggTrays, 'Brown eggs in stacked 30-egg trays', 'cutout'),
  eggsAndHens: img(eggsAndHens, 'Hens beside trays of brown and white eggs'),
  turkeys: img(turkeys, 'Turkeys on the farm'),
  turkeyFlock: img(turkeyFlock, 'A flock of turkeys in the farm yard'),
  turkeyRun: img(turkeyRun, 'White turkeys in a fenced grass run'),
  rawChicken: img(rawChicken, 'Fresh, cleaned chicken wings ready to cook'),
  roastedChicken: img(roastedChicken, 'Golden roasted whole chickens'),
  feedStore: img(feedStore, 'Bags of poultry feed stacked off the floor in a dry feed store'),
  drinkerTrough: img(drinkerTrough, 'Young broilers drinking from a clean water trough'),
  nippleDrinker: img(nippleDrinker, 'Broilers drinking from a nipple drinker line'),
  chilledDisplay: img(chilledDisplay, 'Whole chickens and chicken pieces kept chilled in a display cooler'),
  thawingBagged: img(thawingBagged, 'Bagged whole chickens thawing on a tray'),
  thawingPlate: img(thawingPlate, 'A frozen whole chicken thawing on a plate'),
  kitchenHygiene: img(kitchenHygiene, 'Trimming raw chicken in a clean kitchen sink'),
  cleaverChicken: img(cleaverChicken, 'A gloved cook cutting a whole chicken on a wooden board'),
  roastWholeChicken: img(roastWholeChicken, 'A whole chicken roasted golden with herbs'),
  herbRoastChicken: img(herbRoastChicken, 'A herb-seasoned whole roast chicken in a baking dish'),
  grilledDrumsticks: img(grilledDrumsticks, 'Grilled, well-seasoned chicken drumsticks'),
  grilledQuarters: img(grilledQuarters, 'Barbecued chicken leg quarters on the grill'),
};

// A file in assets/site/ named after the slot replaces the bundled photo (see assets/siteImages.js).
const slot = (name, photo) => siteImage(name, photo?.alt) || photo || null;

// Default photo for each product line, keyed by category slug (slot: category-<slug>).
export const CATEGORY_IMAGES = {
  broilers: slot('category-broilers', PHOTOS.broilersPen),
  noilers: slot('category-noilers', PHOTOS.noilers),
  eggs: slot('category-eggs', PHOTOS.eggCollection),
  turkeys: slot('category-turkeys', PHOTOS.turkeyRun),
  'prepared-meat': slot('category-prepared-meat', PHOTOS.rawChicken),
};

// Default photos for page heroes and feature blocks (slot name in quotes).
export const PAGE_IMAGES = {
  homeHero: slot('home-hero', PHOTOS.broilerHouse),
  homeInfrastructure: slot('home-infrastructure', PHOTOS.broilerHouse),
  about: slot('about-hero', PHOTOS.eggCollection),
  aboutStory: slot('about-story', PHOTOS.brownHens),
  farm: slot('farm-hero', PHOTOS.turkeyFlock),
  quality: slot('quality-hero', PHOTOS.broilersPen),
  production: slot('production-hero', PHOTOS.dayOldChicks),
  products: slot('products-hero', PHOTOS.eggBaskets),
  preparedMeat: slot('prepared-meat', PHOTOS.roastedChicken),
  shop: slot('shop-hero', PHOTOS.broilersPen),
  bulk: slot('bulk-hero', PHOTOS.eggBaskets),
  contact: slot('contact-hero', PHOTOS.broilerHouse),
  gallery: slot('gallery-hero', PHOTOS.turkeyFlock),
};

const P = PHOTOS;
/*
  Bundled photos for each card list, matched by position and keyed by the list's slot prefix.
  null leaves the "photo coming soon" placeholder until a photo is uploaded or added to assets/site/.
*/
export const CARD_IMAGES = {
  'home-journey': [P.broodingChicks, P.dayOldChicks, P.broilerHouse, P.broilersPen],
  'home-audience': [P.eggsAndHens, P.roastedChicken, P.whiteBroiler, P.grilledDrumsticks, P.eggTrays, P.eggBaskets],
  'home-knowhow': [P.chilledDisplay, P.eggTrays, P.goldenHen],
  'about-services': [P.broilersPen, P.noilerCock, P.eggCollection, P.turkeyRun, P.eggBaskets, P.eggsAndHens],
  'about-approach': [P.brownHens, P.broilerHouse, P.broodingChicks, P.noilers],
  'farm-sections': [P.broodingChicks, P.broilerHouse, P.eggCollection, P.turkeyRun, P.feedStore, P.drinkerTrough],
  'farm-routine': [P.brownHens, P.nippleDrinker, P.eggBaskets, P.dayOldChicks, P.noilerCock],
  'quality-standards': [P.broilerHouse, P.dayOldChicks, P.brownHens, P.eggTrays],
  'quality-foodsafety': [P.chilledDisplay, P.thawingBagged, P.roastedChicken, P.eggsAndHens, P.eggBaskets, P.kitchenHygiene],
  'production-steps': [P.broodingChicks, P.dayOldChicks, P.broilerHouse, P.broilersPen, P.whiteBroiler, P.eggTrays],
  'production-timelines': [P.whiteBroiler, P.goldenHen, P.eggsAndHens, P.turkeyRun],
  'shop-guide': [P.whiteBroiler, P.turkeyRun, P.eggTrays],
  'shop-prepared': [P.roastWholeChicken, P.rawChicken, P.grilledDrumsticks, P.turkeyFlock], // the roast photo is the section's feature image
  'bulk-buyers': [P.eggsAndHens, P.roastedChicken, P.herbRoastChicken, P.eggTrays, P.eggBaskets, P.broilerHouse],
  'contact-help': [P.whiteBroiler, P.eggBaskets, P.eggTrays],
};

/** Bundled photo for card n (0-based) of a slot prefix, if any. */
export const cardImage = (prefix, index) => CARD_IMAGES[prefix]?.[index] || null;

// Shown in the gallery until the admin uploads photos — every bundled photo appears here.
const GALLERY = [
  ['Facilities', 'Broiler house', P.broilerHouse],
  ['Broilers', 'Broilers', P.broilersPen],
  ['Production', 'Brooding day-old chicks', P.dayOldChicks],
  ['Eggs', 'Egg collection', P.eggCollection],
  ['Noilers', 'Noilers', P.noilers],
  ['Turkeys', 'Turkeys', P.turkeys],
  ['Farm', 'Turkey flock', P.turkeyFlock],
  ['Production', 'Chicks in the brooder', P.broodingChicks],
  ['Noilers', 'Noiler cock', P.noilerCock],
  ['Farm', 'Hens in the pen', P.brownHens],
  ['Turkeys', 'Turkeys in the run', P.turkeyRun],
  ['Eggs', 'Freshly collected eggs', P.eggBaskets],
  ['Facilities', 'Feed store', P.feedStore],
  ['Facilities', 'Clean drinking water', P.drinkerTrough],
  ['Broilers', 'Nipple drinkers', P.nippleDrinker],
  ['Broilers', 'White broiler', P.whiteBroiler],
  ['Noilers', 'Golden hen', P.goldenHen],
  ['Eggs', 'Eggs in trays', P.eggTrays],
  ['Eggs', 'Hens and fresh eggs', P.eggsAndHens],
  ['Prepared Meat', 'Whole roast chicken', P.roastWholeChicken],
  ['Prepared Meat', 'Herb roast chicken', P.herbRoastChicken],
  ['Prepared Meat', 'Roasted chickens', P.roastedChicken],
  ['Prepared Meat', 'Grilled drumsticks', P.grilledDrumsticks],
  ['Prepared Meat', 'Grilled chicken quarters', P.grilledQuarters],
  ['Prepared Meat', 'Chicken wings', P.rawChicken],
  ['Prepared Meat', 'Chilled chicken', P.chilledDisplay],
  ['Prepared Meat', 'Thawing whole chickens', P.thawingBagged],
  ['Prepared Meat', 'Thawing in the fridge', P.thawingPlate],
  ['Prepared Meat', 'Kitchen hygiene', P.kitchenHygiene],
  ['Prepared Meat', 'Cutting a whole chicken', P.cleaverChicken],
];

export const DEFAULT_GALLERY = GALLERY.map(([category, title, image], i) => ({ _id: `default-${i + 1}`, category, title, image }));

/** Returns the uploaded image if present, otherwise the bundled fallback. */
export const withFallback = (image, fallback) => (image?.url ? image : fallback || null);

export const categoryImage = (category) =>
  withFallback(category?.image, CATEGORY_IMAGES[category?.slug] || siteImage(`category-${category?.slug}`, category?.name));

/** Product image: its own uploads first, then its category's photo. */
export const productImage = (product) => product?.images?.[0] || CATEGORY_IMAGES[product?.category?.slug] || null;
