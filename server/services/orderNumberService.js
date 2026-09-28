const { Counter } = require('../models');

// Produces sequential yearly order numbers such as TGF-2026-000001.
async function nextOrderNumber(date = new Date()) {
  const year = date.getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: `order-${year}` },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return `TGF-${year}-${String(counter.seq).padStart(6, '0')}`;
}

module.exports = { nextOrderNumber };
