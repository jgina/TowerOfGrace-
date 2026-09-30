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

// Sequential yearly market trip numbers such as MKT-2026-0001.
async function nextTripNumber(date = new Date()) {
  const year = date.getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: `market-trip-${year}` },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return `MKT-${year}-${String(counter.seq).padStart(4, '0')}`;
}

module.exports = { nextOrderNumber, nextTripNumber };
