const config = require('../config');
const { Category, User } = require('../models');

// The four product lines the business sells. Descriptions stay empty for the admin to write.
const BASE_CATEGORIES = [
  { name: 'Broilers', slug: 'broilers', variantType: 'weight', sortOrder: 1 },
  { name: 'Noilers', slug: 'noilers', variantType: 'weight', sortOrder: 2 },
  { name: 'Eggs', slug: 'eggs', variantType: 'packaging', sortOrder: 3 },
  { name: 'Turkeys', slug: 'turkeys', variantType: 'weight', sortOrder: 4 },
];

// Idempotently creates the core categories and the first admin account (from env) on startup.
async function ensureBaseData() {
  for (const category of BASE_CATEGORIES) {
    await Category.updateOne({ slug: category.slug }, { $setOnInsert: category }, { upsert: true });
  }

  const { email, password, name } = config.admin;
  if (email && password) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (!existing) {
      await User.create({ name, email, password, role: 'admin' });
      console.log(`Admin account created for ${email}`);
    } else if (existing.role !== 'admin') {
      console.warn(`ADMIN_EMAIL ${email} belongs to a customer account; it was not promoted automatically.`);
    }
  } else if (!(await User.exists({ role: 'admin' }))) {
    console.warn('No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD, then restart the server.');
  }
}

module.exports = { ensureBaseData, BASE_CATEGORIES };
