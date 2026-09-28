// Creates base categories and the admin account without starting the HTTP server.
// Usage: npm run seed
const mongoose = require('mongoose');
const config = require('../config');
const connectDB = require('../config/db');
const { ensureBaseData } = require('./bootstrap');

(async () => {
  try {
    config.assertConfig();
    await connectDB(config.mongoUri);
    await ensureBaseData();
    console.log('Seed complete: categories Broilers, Noilers, Eggs and Turkeys are in place.');
    console.log('Add products, prices and weights from the admin panel.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
