export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'];
export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

export const PAYMENT_METHODS = {
  PAYSTACK: { label: 'Paystack', description: 'Card, bank transfer or USSD via Paystack' },
  FLUTTERWAVE: { label: 'Flutterwave', description: 'Card, bank or mobile money via Flutterwave' },
  BANK_TRANSFER: { label: 'Direct Bank Transfer', description: 'Transfer to our account; confirmed by our team' },
  PAY_ON_DELIVERY: { label: 'Pay on Delivery', description: 'Pay when your order arrives or at pickup' },
};

// Maps each status to a badge tone defined in StatusBadge.css.
export const STATUS_TONES = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  READY: 'accent',
  OUT_FOR_DELIVERY: 'accent',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'neutral',
  NEW: 'warning',
  READ: 'neutral',
  RESPONDED: 'success',
  ARCHIVED: 'neutral',
  CONTACTED: 'info',
  QUOTED: 'accent',
  CLOSED: 'neutral',
  ACTIVE: 'success',
  EXPIRED: 'danger',
  REVOKED: 'danger',
  in_stock: 'success',
  low_stock: 'warning',
  out_of_stock: 'danger',
  sold_out: 'danger',
  pre_order: 'info',
  unavailable: 'neutral',
};

export const STOCK_LABELS = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
  sold_out: 'Sold Out',
  pre_order: 'Pre-order',
  unavailable: 'Unavailable',
};

export const GALLERY_CATEGORIES = [
  'Farm', 'Broilers', 'Noilers', 'Eggs', 'Turkeys', 'Facilities', 'Production', 'Team', 'Packaging', 'Deliveries',
];

export const BUSINESS_TYPES = ['Hotel', 'Restaurant', 'Retailer', 'Distributor', 'Supermarket', 'Caterer', 'Other Business'];

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

export const SITE_NAME = 'Tower of Grace Farms';
export const LEGAL_NAME = 'Tower of Grace Farms & Agro-Based Industries Ltd';

export const LAST_ORDER_KEY = 'tgf_last_order';

// Reasons for livestock deaths and product losses. `for` limits which products each applies to.
export const LOSS_REASONS = {
  MORTALITY: { label: 'Death (mortality)', for: 'birds' },
  DISEASE: { label: 'Disease / sickness', for: 'birds' },
  CULLED: { label: 'Culled (injury, poor growth)', for: 'birds' },
  PREDATOR: { label: 'Predator / pests', for: 'birds' },
  BROKEN: { label: 'Broken / cracked', for: 'eggs' },
  SPOILED: { label: 'Spoiled / rotten / expired', for: 'any' },
  MISSING: { label: 'Missing / theft', for: 'any' },
  OTHER: { label: 'Other', for: 'any' },
};

export const TRIP_STATUS = {
  OUT: { label: 'At market', tone: 'accent' },
  CLOSED: { label: 'Closed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

// Flock batch stages, in order. Stages change automatically with the batch's age.
export const BATCH_STAGES = {
  BROODING: { label: 'Brooding', tone: 'info', step: 1 },
  GROWING: { label: 'Growing', tone: 'success', step: 2 },
  FINISHING: { label: 'Finishing', tone: 'accent', step: 3 },
  READY: { label: 'Ready for sale', tone: 'warning', step: 4 },
  IN_STOCK: { label: 'Moved to stock', tone: 'dark', step: 5 },
  CLOSED: { label: 'Closed', tone: 'neutral', step: 0 },
};

// Typical selling ages, used only to pre-fill the form — the admin always sets the real target.
export const TYPICAL_TARGET_DAYS = { broilers: 42, noilers: 84, turkeys: 140 };

export const FEED_TYPES = {
  STARTER: 'Starter',
  GROWER: 'Grower',
  FINISHER: 'Finisher',
  LAYER: 'Layer',
  CONCENTRATE: 'Concentrate',
  SUPPLEMENT: 'Supplement',
  OTHER: 'Other',
};

export const FEED_TX = {
  OPENING: { label: 'Opening stock', tone: 'neutral' },
  PURCHASE: { label: 'Purchase', tone: 'success' },
  USAGE: { label: 'Fed', tone: 'accent' },
  ADJUSTMENT: { label: 'Stock count', tone: 'info' },
};

// Who a feeding entry went to
export const FED_TO = {
  FARM: 'Whole farm',
  BATCH: 'Flock batch',
  STOCK: 'Birds in stock',
  GROUP: 'Pen / group',
};

// How prepared meat from a processing run is kept, with the default shelf life used for its use-by date.
export const MEAT_STORAGE = {
  CHILLED: { label: 'Chilled', days: 3, tone: 'info', hint: '0–4 °C · about 3 days' },
  FROZEN: { label: 'Frozen', days: 90, tone: 'neutral', hint: '−18 °C · about 3 months' },
  READY_TO_EAT: { label: 'Ready to eat', days: 1, tone: 'accent', hint: 'Cooked · sell the same day' },
};

// Categories that are not live birds: no flock batches, no feeding.
export const NOT_LIVE_BIRDS = ['eggs', 'prepared-meat'];
export const isLiveBirds = (slug) => !NOT_LIVE_BIRDS.includes(slug);

export const lossReasonsFor = (categorySlug) => {
  const kind = categorySlug === 'eggs' ? 'eggs' : categorySlug === 'prepared-meat' ? 'meat' : 'birds';
  return Object.entries(LOSS_REASONS).filter(([, r]) => r.for === 'any' || r.for === kind);
};
