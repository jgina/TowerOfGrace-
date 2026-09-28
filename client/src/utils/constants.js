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

export const lossReasonsFor = (categorySlug) => {
  const kind = categorySlug === 'eggs' ? 'eggs' : 'birds';
  return Object.entries(LOSS_REASONS).filter(([, r]) => r.for === 'any' || r.for === kind);
};
