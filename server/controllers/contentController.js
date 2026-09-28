const { Content } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getSettings } = require('../services/settingsService');

function assertKey(key) {
  if (!Content.KEYS.includes(key)) throw ApiError.notFound('Unknown content section');
}

// Returns every CMS section in one call so the site can render with a single request.
exports.getAllContent = asyncHandler(async (req, res) => {
  const docs = await Content.find().lean();
  const content = Object.fromEntries(docs.map((doc) => [doc.key, doc.data]));
  content.settings = await getSettings();
  res.json({ success: true, content });
});

exports.getContent = asyncHandler(async (req, res) => {
  assertKey(req.params.key);
  if (req.params.key === 'settings') return res.json({ success: true, key: 'settings', data: await getSettings() });
  const doc = await Content.findOne({ key: req.params.key }).lean();
  return res.json({ success: true, key: req.params.key, data: doc?.data || {}, updatedAt: doc?.updatedAt });
});

exports.updateContent = asyncHandler(async (req, res) => {
  assertKey(req.params.key);
  const data = req.body.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw ApiError.badRequest('Content data must be an object');
  if (JSON.stringify(data).length > 200000) throw ApiError.badRequest('This section is too large');

  const doc = await Content.findOneAndUpdate(
    { key: req.params.key },
    { data, updatedBy: req.user._id },
    { returnDocument: 'after', upsert: true, runValidators: true }
  );
  res.json({ success: true, key: doc.key, data: doc.data, updatedAt: doc.updatedAt });
});
