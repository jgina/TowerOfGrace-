const mongoose = require('mongoose');
const { MedicineItem, MedicineTransaction, FlockBatch } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const pick = require('../utils/pick');
const { getPagination, buildMeta } = require('../utils/pagination');
const { round2 } = require('../services/feedService');
const { birdProducts } = require('./feedController');
const { changeMedicineStock, checkLowStock, checkMedicineExpiry, setExpiry, daysToExpiry, unitLabel, EXPIRY_WARN_DAYS, DAY_MS } = require('../services/medicineService');

const FIELDS = ['name', 'brand', 'category', 'unit', 'unitSize', 'activeIngredient', 'lowStockUnits', 'withdrawalDays', 'storage', 'notes', 'isActive'];

const toDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) throw ApiError.badRequest('Invalid date');
  if (date > new Date(Date.now() + 60 * 1000)) throw ApiError.badRequest('The date cannot be in the future');
  return date;
};

const optionalDate = (value, label) => {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw ApiError.badRequest(`Invalid ${label}`);
  return date;
};

const units = (value, label = 'Quantity') => {
  const n = round2(Number(value));
  if (!Number.isFinite(n) || n <= 0) throw ApiError.badRequest(`${label} must be more than 0`);
  return n;
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Expiry alerts are also checked by the scheduler; running the check now means a drug entered with a
// past or near expiry date is flagged straight away. Never fails the request.
const checkExpiryNow = () => checkMedicineExpiry().catch((error) => console.warn(`Medicine expiry check: ${error.message}`));

const withExpiry = (m) => {
  const days = daysToExpiry(m.expiryDate);
  return {
    ...m.toJSON(),
    daysToExpiry: days,
    isExpired: days !== null && days < 0 && m.stockUnits > 0,
    isExpiringSoon: days !== null && days >= 0 && days <= EXPIRY_WARN_DAYS && m.stockUnits > 0,
  };
};

// ---------- Store overview ----------

/*
  Birds that must not be sold or slaughtered yet: every treated group whose safe-to-sell date
  (withdrawalUntil) is still in the future, with the latest such date and the medicines responsible.
*/
async function underWithdrawal(match = {}) {
  const rows = await MedicineTransaction.aggregate([
    { $match: { type: 'USAGE', withdrawalUntil: { $gt: startOfToday() }, ...match } },
    { $sort: { withdrawalUntil: -1 } },
    {
      $group: {
        _id: { givenTo: '$givenTo', batch: '$batch', product: '$product', groupName: '$groupName' },
        batchCode: { $first: '$batchCode' },
        productName: { $first: '$productName' },
        withdrawalUntil: { $max: '$withdrawalUntil' },
        medicines: { $addToSet: '$medicineName' },
      },
    },
    { $sort: { withdrawalUntil: 1 } },
  ]);
  return rows.map((r) => ({
    givenTo: r._id.givenTo,
    batch: r._id.batch,
    batchCode: r.batchCode,
    product: r._id.product,
    productName: r.productName,
    groupName: r._id.groupName,
    withdrawalUntil: r.withdrawalUntil,
    medicines: r.medicines.sort(),
  }));
}

exports.listMedicines = asyncHandler(async (req, res) => {
  const filter = req.query.all === 'true' ? {} : { isActive: true };
  const since30 = new Date(Date.now() - 30 * DAY_MS);
  const [medicines, spend30, treatments30, byPurpose, withdrawals] = await Promise.all([
    MedicineItem.find(filter).sort({ name: 1 }),
    MedicineTransaction.aggregate([{ $match: { type: 'PURCHASE', date: { $gte: since30 } } }, { $group: { _id: null, cost: { $sum: '$totalCost' } } }]),
    MedicineTransaction.distinct('treatmentId', { type: 'USAGE', date: { $gte: since30 } }),
    // Treatments in the last 30 days by purpose (one treatment may use several medicines).
    MedicineTransaction.aggregate([
      { $match: { type: 'USAGE', date: { $gte: since30 } } },
      { $group: { _id: { purpose: { $ifNull: ['$purpose', 'OTHER'] }, treatment: '$treatmentId' } } },
      { $group: { _id: '$_id.purpose', count: { $sum: 1 } } },
    ]),
    underWithdrawal(),
  ]);
  const rows = medicines.map(withExpiry);

  res.json({
    success: true,
    medicines: rows,
    withdrawals,
    summary: {
      items: rows.length,
      lowItems: rows.filter((m) => m.isLow).length,
      expiringSoon: rows.filter((m) => m.isExpiringSoon).length,
      expired: rows.filter((m) => m.isExpired).length,
      spent30Days: round2(spend30[0]?.cost || 0),
      treatments30Days: treatments30.filter(Boolean).length,
      purposes30Days: Object.fromEntries(byPurpose.map((p) => [p._id, p.count])),
      underWithdrawal: withdrawals.length,
    },
  });
});

exports.listTransactions = asyncHandler(async (req, res) => {
  const { medicine, type, batch, givenTo, purpose, from, to } = req.query;
  const { page, limit, skip } = getPagination(req.query, 30, 200);
  const filter = {};
  if (medicine && mongoose.isValidObjectId(medicine)) filter.medicine = medicine;
  if (batch && mongoose.isValidObjectId(batch)) filter.batch = batch;
  if (type) filter.type = type;
  if (givenTo) filter.givenTo = givenTo;
  if (purpose) filter.purpose = purpose;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(`${to}T23:59:59.999Z`);
  }
  const [transactions, total] = await Promise.all([
    // Newest entry first, in the order recorded, so the running balance column always reads correctly.
    MedicineTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    MedicineTransaction.countDocuments(filter),
  ]);
  res.json({ success: true, transactions, meta: buildMeta(total, page, limit) });
});

// ---------- Medicines ----------

exports.createMedicine = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  const expiryDate = optionalDate(req.body.expiryDate, 'expiry date');
  const medicine = await MedicineItem.create({ ...data, stockUnits: 0, ...(expiryDate ? { expiryDate } : {}) });
  const opening = Number(req.body.openingUnits || 0);
  if (opening > 0) {
    await changeMedicineStock(medicine._id, opening, { type: 'OPENING', date: new Date(), expiryDate: expiryDate || undefined, note: 'Opening stock', byName: req.user.name });
  }
  await checkExpiryNow();
  res.status(201).json({ success: true, medicine: withExpiry(await MedicineItem.findById(medicine._id)), message: `${medicine.name} added to the medicine store` });
});

exports.updateMedicine = asyncHandler(async (req, res) => {
  let medicine = await MedicineItem.findById(req.params.id);
  if (!medicine) throw ApiError.notFound('Medicine not found');
  Object.assign(medicine, pick(req.body, FIELDS));
  await medicine.save();
  if (req.body.expiryDate !== undefined) medicine = await setExpiry(medicine, optionalDate(req.body.expiryDate, 'expiry date'));
  // A changed alert level may make the medicine low (or no longer low) immediately.
  await checkLowStock(medicine);
  await checkExpiryNow();
  res.json({ success: true, medicine: withExpiry(await MedicineItem.findById(medicine._id)), message: 'Medicine updated' });
});

// ---------- Stock in / out ----------

exports.recordPurchase = asyncHandler(async (req, res) => {
  const quantity = units(req.body.quantity, 'Quantity bought');
  const costPerUnit = req.body.costPerUnit === '' || req.body.costPerUnit === undefined ? undefined : Number(req.body.costPerUnit);
  if (costPerUnit !== undefined && (!Number.isFinite(costPerUnit) || costPerUnit < 0)) throw ApiError.badRequest('Cost per unit must be 0 or more');
  const expiryDate = optionalDate(req.body.expiryDate, 'expiry date');
  const before = await MedicineItem.findById(req.params.id);
  if (!before) throw ApiError.notFound('Medicine not found');

  let medicine = await changeMedicineStock(before._id, quantity, {
    type: 'PURCHASE',
    date: toDate(req.body.date),
    supplier: req.body.supplier,
    costPerUnit,
    totalCost: costPerUnit !== undefined ? round2(costPerUnit * quantity) : undefined,
    lotNumber: req.body.lotNumber,
    expiryDate: expiryDate || undefined,
    note: req.body.note,
    byName: req.user.name,
  });
  if (costPerUnit !== undefined) await MedicineItem.updateOne({ _id: medicine._id }, { lastCostPerUnit: costPerUnit });
  // The store's expiry date is the earliest one on hand: a new lot only replaces it if the store was empty,
  // or if the new lot expires sooner.
  if (expiryDate) {
    const keep = before.stockUnits > 0 && before.expiryDate && new Date(before.expiryDate) <= expiryDate;
    if (!keep) medicine = await setExpiry(medicine, expiryDate);
    await checkExpiryNow();
  }
  res.status(201).json({
    success: true,
    medicine: withExpiry(await MedicineItem.findById(medicine._id)),
    message: `${quantity} ${unitLabel(medicine.unit)} of ${medicine.name} added — ${medicine.stockUnits} now in store`,
  });
});

/*
  A treatment: one group of birds (whole farm, a flock batch, birds in stock or a named pen) given one or
  more medicines on a date, for a purpose. Each medicine is a line with its quantity, dosage and withdrawal
  period. All lines are checked first; if any would take a medicine below zero, nothing is deducted.
*/
exports.recordTreatment = asyncHandler(async (req, res) => {
  const date = toDate(req.body.date);
  const givenTo = req.body.givenTo || (req.body.batchId ? 'BATCH' : 'FARM');
  const durationDays = req.body.durationDays ? Math.round(Number(req.body.durationDays)) : 1;
  if (!Number.isFinite(durationDays) || durationDays < 1) throw ApiError.badRequest('Days of treatment must be 1 or more');
  const lines = (req.body.lines || []).map((l) => ({ ...l, quantity: units(l.quantity, 'Quantity used') }));
  if (!lines.length) throw ApiError.badRequest('Add at least one medicine given');

  let batch = null;
  let product = null;
  if (givenTo === 'BATCH') {
    batch = req.body.batchId ? await FlockBatch.findById(req.body.batchId).select('batchCode status') : null;
    if (!batch) throw ApiError.badRequest('Choose the flock batch that was treated');
    if (!['ACTIVE', 'READY'].includes(batch.status)) {
      throw ApiError.badRequest(`Batch ${batch.batchCode} has left the batch system — record its treatment under "Birds in stock"`);
    }
  }
  if (givenTo === 'STOCK' && req.body.productId) {
    [product] = await birdProducts([req.body.productId]);
    if (!product) throw ApiError.badRequest('The selected stock bird product no longer exists');
  }
  const groupName = givenTo === 'GROUP' ? String(req.body.groupName || '').trim() : undefined;
  if (givenTo === 'GROUP' && !groupName) throw ApiError.badRequest('Name the pen or group that was treated');

  const medicines = await MedicineItem.find({ _id: { $in: lines.map((l) => l.medicineId) } });
  const byId = new Map(medicines.map((m) => [String(m._id), m]));
  const needed = new Map();
  lines.forEach((l) => {
    const medicine = byId.get(String(l.medicineId));
    if (!medicine) throw ApiError.badRequest('A selected medicine no longer exists');
    if (medicine.expiryDate && new Date(medicine.expiryDate) < new Date(date).setHours(0, 0, 0, 0)) {
      throw ApiError.badRequest(`${medicine.name} expired on ${new Date(medicine.expiryDate).toLocaleDateString('en-GB')} — do not use it. Dispose of it, or correct its expiry date if a newer lot is in store.`);
    }
    needed.set(String(medicine._id), round2((needed.get(String(medicine._id)) || 0) + l.quantity));
  });
  needed.forEach((qty, id) => {
    const m = byId.get(id);
    if (qty > m.stockUnits) throw ApiError.conflict(`Only ${m.stockUnits} ${unitLabel(m.unit)} of ${m.name} left, but ${qty} entered`);
  });

  // Withdrawal runs from the last day of treatment.
  const lastDose = new Date(date);
  lastDose.setHours(0, 0, 0, 0);
  lastDose.setDate(lastDose.getDate() + durationDays - 1);
  const treatmentId = new mongoose.Types.ObjectId().toString();
  const shared = {
    type: 'USAGE',
    date,
    treatmentId,
    givenTo,
    batch: batch?._id,
    batchCode: batch?.batchCode,
    product: product?._id,
    productName: product?.name,
    groupName,
    purpose: req.body.purpose || 'TREATMENT',
    condition: req.body.condition,
    route: req.body.route || undefined,
    birdsTreated: req.body.birdsTreated ? Number(req.body.birdsTreated) : undefined,
    durationDays,
    administeredBy: req.body.administeredBy || req.user.name,
    byName: req.user.name,
  };

  const applied = [];
  let latestWithdrawal = null;
  try {
    for (const l of lines) {
      const medicine = byId.get(String(l.medicineId));
      const withdrawalDays = l.withdrawalDays === undefined || l.withdrawalDays === '' ? medicine.withdrawalDays || 0 : Math.max(Math.round(Number(l.withdrawalDays)) || 0, 0);
      let withdrawalUntil;
      if (withdrawalDays > 0) {
        withdrawalUntil = new Date(lastDose);
        withdrawalUntil.setDate(withdrawalUntil.getDate() + withdrawalDays);
        if (!latestWithdrawal || withdrawalUntil > latestWithdrawal) latestWithdrawal = withdrawalUntil;
      }
      await changeMedicineStock(l.medicineId, -l.quantity, { ...shared, dosage: l.dosage, withdrawalDays, withdrawalUntil, note: l.note || req.body.note });
      applied.push(l);
    }
  } catch (error) {
    // Another deduction raced us: put back what this request already took.
    for (const l of applied) {
      await changeMedicineStock(l.medicineId, l.quantity, { type: 'ADJUSTMENT', date, note: 'Reversal of an incomplete treatment entry', byName: 'System' });
    }
    await MedicineTransaction.updateMany({ treatmentId, type: 'USAGE' }, { $unset: { withdrawalUntil: 1 } });
    throw error;
  }

  const who = batch ? `batch ${batch.batchCode}` : product ? product.name : groupName || (givenTo === 'STOCK' ? 'birds in stock' : 'the whole farm');
  const withdrawalNote = latestWithdrawal ? ` Do not sell or slaughter before ${latestWithdrawal.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.` : '';
  res.status(201).json({ success: true, treatmentId, withdrawalUntil: latestWithdrawal, message: `Treatment recorded for ${who}.${withdrawalNote}` });
});

// Stock count correction: set the counted figure.
exports.adjustStock = asyncHandler(async (req, res) => {
  const medicine = await MedicineItem.findById(req.params.id);
  if (!medicine) throw ApiError.notFound('Medicine not found');
  const counted = round2(Number(req.body.countedUnits));
  if (req.body.countedUnits === undefined || req.body.countedUnits === '' || !Number.isFinite(counted) || counted < 0) throw ApiError.badRequest('Enter the quantity counted');
  const delta = round2(counted - medicine.stockUnits);
  if (delta === 0) return res.json({ success: true, medicine: withExpiry(medicine), message: 'Stock already matches the count' });
  if (!String(req.body.note || '').trim()) throw ApiError.badRequest('Give a reason for the correction');
  const updated = await changeMedicineStock(medicine._id, delta, { type: 'ADJUSTMENT', date: toDate(req.body.date), note: req.body.note, byName: req.user.name });
  return res.json({ success: true, medicine: withExpiry(updated), message: `${medicine.name} corrected to ${updated.stockUnits} ${unitLabel(updated.unit)}` });
});

// Stock thrown away: expired, damaged or spoiled. Optionally sets the expiry date of what remains.
exports.disposeStock = asyncHandler(async (req, res) => {
  const quantity = units(req.body.quantity, 'Quantity disposed');
  const reason = req.body.reason || 'EXPIRED';
  let medicine = await changeMedicineStock(req.params.id, -quantity, {
    type: 'DISPOSAL',
    date: toDate(req.body.date),
    disposalReason: reason,
    note: req.body.note,
    byName: req.user.name,
  });
  const nextExpiry = optionalDate(req.body.nextExpiryDate, 'expiry date of remaining stock');
  if (nextExpiry) medicine = await setExpiry(medicine, nextExpiry);
  else if (medicine.stockUnits <= 0) medicine = await setExpiry(medicine, null);
  if (nextExpiry) await checkExpiryNow();
  res.json({
    success: true,
    medicine: withExpiry(await MedicineItem.findById(medicine._id)),
    message: `${quantity} ${unitLabel(medicine.unit)} of ${medicine.name} disposed — ${medicine.stockUnits} left`,
  });
});

// Treatments given to one flock batch (shown on the batch page), newest first, one row per treatment.
exports.batchTreatments = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.batchId)) throw ApiError.badRequest('Invalid batch');
  const batchId = new mongoose.Types.ObjectId(req.params.batchId);
  const [rows, withdrawals] = await Promise.all([
    MedicineTransaction.aggregate([
      { $match: { type: 'USAGE', batch: batchId } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: { $ifNull: ['$treatmentId', { $toString: '$_id' }] },
          date: { $first: '$date' },
          purpose: { $first: '$purpose' },
          condition: { $first: '$condition' },
          route: { $first: '$route' },
          durationDays: { $first: '$durationDays' },
          birdsTreated: { $first: '$birdsTreated' },
          administeredBy: { $first: '$administeredBy' },
          withdrawalUntil: { $max: '$withdrawalUntil' },
          medicines: { $push: { name: '$medicineName', quantity: { $multiply: ['$quantity', -1] }, unit: '$unit', dosage: '$dosage' } },
        },
      },
      { $sort: { date: -1 } },
    ]),
    underWithdrawal({ batch: batchId }),
  ]);
  res.json({ success: true, treatments: rows.map(({ _id, ...r }) => ({ treatmentId: _id, ...r })), withdrawalUntil: withdrawals[0]?.withdrawalUntil || null });
});
