const { MedicineItem, MedicineTransaction } = require('../models');
const ApiError = require('../utils/ApiError');
const config = require('../config');
const { notify } = require('./notificationService');
const { sendMail, escapeHtml } = require('./emailService');
const { alertRecipients, round2 } = require('./feedService');

const DAY_MS = 24 * 60 * 60 * 1000;
// A medicine is "expiring soon" this many days before its expiry date.
const EXPIRY_WARN_DAYS = 30;
// While expired stock is still in the store, the alert is repeated this often until it is disposed of.
const EXPIRED_REMINDER_DAYS = 7;

const UNIT_LABELS = {
  BOTTLE: 'bottle(s)',
  SACHET: 'sachet(s)',
  VIAL: 'vial(s)',
  PACK: 'pack(s)',
  TABLET: 'tablet(s)',
  ML: 'ml',
  LITRE: 'litre(s)',
  GRAM: 'g',
  KG: 'kg',
  DOSE: 'dose(s)',
};
const unitLabel = (unit) => UNIT_LABELS[unit] || 'unit(s)';

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Days from today until the expiry date (negative once expired), or null when unknown. */
function daysToExpiry(expiryDate) {
  if (!expiryDate) return null;
  return Math.round((startOfDay(expiryDate) - startOfDay(new Date())) / DAY_MS);
}

/**
 * Atomically changes a medicine's stock. A reduction never takes stock below zero.
 * Returns the updated medicine. Also writes the ledger line.
 */
async function changeMedicineStock(medicineId, delta, tx) {
  const qty = round2(delta);
  if (!Number.isFinite(qty) || qty === 0) throw ApiError.badRequest('Enter a quantity');
  const filter = { _id: medicineId, ...(qty < 0 ? { stockUnits: { $gte: -qty - 0.0001 } } : {}) };
  const updated = await MedicineItem.findOneAndUpdate(filter, { $inc: { stockUnits: qty } }, { returnDocument: 'after' });
  if (!updated) {
    const medicine = await MedicineItem.findById(medicineId);
    if (!medicine) throw ApiError.notFound('Medicine not found');
    throw ApiError.conflict(`Only ${medicine.stockUnits} ${unitLabel(medicine.unit)} of ${medicine.name} left in the store`);
  }
  // Keep the stored figure tidy after decimal arithmetic (e.g. 2.499999 → 2.5).
  const tidy = round2(Math.max(updated.stockUnits, 0));
  if (tidy !== updated.stockUnits) {
    await MedicineItem.updateOne({ _id: medicineId }, { $set: { stockUnits: tidy } });
    updated.stockUnits = tidy;
  }
  await MedicineTransaction.create({ ...tx, medicine: updated._id, medicineName: updated.name, unit: updated.unit, quantity: qty, balanceAfter: tidy });
  await checkLowStock(updated);
  return updated;
}

/**
 * Sets the medicine's expiry date; a different date re-arms the expiry alerts.
 * Passing null clears it (e.g. the store is empty).
 */
async function setExpiry(medicine, expiryDate) {
  const next = expiryDate ? new Date(expiryDate) : null;
  const same = (next && medicine.expiryDate && next.getTime() === new Date(medicine.expiryDate).getTime()) || (!next && !medicine.expiryDate);
  if (same) return medicine;
  await MedicineItem.updateOne(
    { _id: medicine._id },
    next
      ? { $set: { expiryDate: next }, $unset: { expiryAlertSentAt: 1, expiredAlertSentAt: 1 } }
      : { $unset: { expiryDate: 1, expiryAlertSentAt: 1, expiredAlertSentAt: 1 } }
  );
  return MedicineItem.findById(medicine._id);
}

function alertEmail(heading, intro, rows, link, linkLabel) {
  return `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#13231a">
      <div style="background:#003c24;color:#fff;padding:14px 18px;border-bottom:4px solid #e4a80c"><strong>TOWER OF GRACE FARMS — ${escapeHtml(heading)}</strong></div>
      <div style="padding:18px">
        <p>${intro}</p>
        <table cellpadding="6" style="border-collapse:collapse">
          ${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td><strong>${escapeHtml(String(value))}</strong></td></tr>`).join('')}
        </table>
        <p><a href="${config.frontendUrl}${link}" style="background:#e4a80c;color:#1c1300;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:bold">${escapeHtml(linkLabel)}</a></p>
      </div>
    </div>`;
}

async function emailAlert(subject, html) {
  const to = await alertRecipients();
  if (to.length) sendMail({ to: to.join(', '), subject: `[Tower of Grace Farms] ${subject}`, html });
}

/**
 * Sends the low-medicine alert once per drop: when stock reaches the alert level it notifies admins
 * in-app and emails the boss; when stock is topped up above the level, the alert is re-armed.
 */
async function checkLowStock(medicine) {
  if (medicine.stockUnits > medicine.lowStockUnits) {
    if (medicine.lowAlertSentAt) await MedicineItem.updateOne({ _id: medicine._id }, { $unset: { lowAlertSentAt: 1 } });
    return false;
  }
  // Items no longer in use are not restocked, so they do not raise alerts.
  if (medicine.isActive === false) return false;
  const claimed = await MedicineItem.updateOne({ _id: medicine._id, lowAlertSentAt: { $exists: false } }, { $set: { lowAlertSentAt: new Date() } });
  if (claimed.modifiedCount === 0) return false;

  const units = unitLabel(medicine.unit);
  const title = medicine.stockUnits <= 0 ? `Out of medicine: ${medicine.name}` : `Low medicine: ${medicine.name} — ${medicine.stockUnits} ${units} left`;
  const message = `${medicine.stockUnits} ${units} remaining (alert level ${medicine.lowStockUnits}). Please restock.`;
  await notify({ type: 'MEDICINE_LOW', title, message, link: '/admin/medicines' });
  await emailAlert(
    title,
    alertEmail(
      'MEDICINE STORE ALERT',
      `<strong>${escapeHtml(medicine.name)}</strong>${medicine.brand ? ` (${escapeHtml(medicine.brand)})` : ''} is running low.`,
      [
        ['Remaining', `${medicine.stockUnits} ${units}`],
        ['Alert level', `${medicine.lowStockUnits} ${units}`],
      ],
      '/admin/medicines',
      'Open the medicine store'
    )
  );
  return true;
}

async function sendExpiryAlert(medicine, stage) {
  const days = daysToExpiry(medicine.expiryDate);
  const when = new Date(medicine.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const units = unitLabel(medicine.unit);
  const expired = stage !== 'WARNING';
  const title =
    stage === 'WARNING'
      ? `${medicine.name} expires ${days === 0 ? 'today' : `in ${days} day(s)`}`
      : stage === 'EXPIRED'
        ? `Expired drug: ${medicine.name} (${when})`
        : `Reminder: expired ${medicine.name} still in store`;
  const message = expired
    ? `${medicine.stockUnits} ${units} expired on ${when} and must not be given to the birds. Remove it from use and record it as disposed.`
    : `${medicine.stockUnits} ${units} in store, expiry ${when}. Use it first, or plan to replace it.`;
  await notify({ type: 'MEDICINE_EXPIRY', title, message, link: '/admin/medicines' });
  await emailAlert(
    title,
    alertEmail(
      expired ? 'EXPIRED DRUG ALERT' : 'MEDICINE EXPIRY ALERT',
      `<strong>${escapeHtml(medicine.name)}</strong>${medicine.brand ? ` (${escapeHtml(medicine.brand)})` : ''} ${
        expired ? '<strong style="color:#c0392b">has expired</strong>. Do not give it to the birds — remove it from the store and record the disposal.' : 'is about to expire.'
      }`,
      [
        ['In store', `${medicine.stockUnits} ${units}`],
        ['Expiry date', when],
        [expired ? 'Expired' : 'Expires in', expired ? `${-days} day(s) ago` : `${days} day(s)`],
      ],
      '/admin/medicines',
      expired ? 'Record the disposal' : 'Open the medicine store'
    )
  );
}

/**
 * Expiry alerts for medicines with stock on hand, in three stages:
 *  1. WARNING  — once, when the expiry date is within EXPIRY_WARN_DAYS.
 *  2. EXPIRED  — once, on or after the expiry date.
 *  3. REMINDER — every EXPIRED_REMINDER_DAYS while the expired stock is still in the store.
 * Each stage is claimed atomically, so the check is safe to run any number of times. A new expiry
 * date (new lot, correction) or disposing of the stock ends the cycle.
 */
async function checkMedicineExpiry() {
  const now = Date.now();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const base = { isActive: true, stockUnits: { $gt: 0 } };
  let sent = 0;

  const claimAndSend = async (medicine, claimFilter, set, stage) => {
    const claimed = await MedicineItem.updateOne({ _id: medicine._id, ...claimFilter }, { $set: set });
    if (claimed.modifiedCount === 0) return; // another run got there first
    sent += 1;
    await sendExpiryAlert(medicine, stage);
  };

  // Expired: first alert, then weekly reminders.
  const reminderBefore = new Date(now - EXPIRED_REMINDER_DAYS * DAY_MS + 60 * 1000);
  const expired = await MedicineItem.find({
    ...base,
    expiryDate: { $lt: today },
    $or: [{ expiredAlertSentAt: { $exists: false } }, { expiredAlertSentAt: { $lte: reminderBefore } }],
  });
  for (const medicine of expired) {
    const first = !medicine.expiredAlertSentAt;
    const claim = first ? { expiredAlertSentAt: { $exists: false } } : { expiredAlertSentAt: medicine.expiredAlertSentAt };
    // The first expired alert also covers the warning stage, so a drug found already expired gets one alert, not two.
    await claimAndSend(medicine, claim, { expiredAlertSentAt: new Date(), expiryAlertSentAt: medicine.expiryAlertSentAt || new Date() }, first ? 'EXPIRED' : 'REMINDER');
  }

  // Expiring soon (not yet expired).
  const soon = await MedicineItem.find({
    ...base,
    expiryDate: { $gte: today, $lte: new Date(now + EXPIRY_WARN_DAYS * DAY_MS) },
    expiryAlertSentAt: { $exists: false },
  });
  for (const medicine of soon) {
    await claimAndSend(medicine, { expiryAlertSentAt: { $exists: false } }, { expiryAlertSentAt: new Date() }, 'WARNING');
  }
  return sent;
}

module.exports = { changeMedicineStock, checkLowStock, checkMedicineExpiry, setExpiry, daysToExpiry, unitLabel, EXPIRY_WARN_DAYS, EXPIRED_REMINDER_DAYS, DAY_MS };
