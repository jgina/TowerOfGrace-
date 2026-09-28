const { Certification } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const pick = require('../utils/pick');
const { deleteImage } = require('../services/uploadService');

const FIELDS = ['name', 'issuingOrganisation', 'certificateNumber', 'issueDate', 'expiryDate', 'image', 'status', 'isPublic'];

const clean = (body) => {
  const data = pick(body, FIELDS);
  ['issueDate', 'expiryDate'].forEach((field) => {
    if (data[field] === '') data[field] = null;
  });
  return data;
};

exports.listPublicCertifications = asyncHandler(async (req, res) => {
  const certifications = await Certification.find({ isPublic: true, status: 'ACTIVE' })
    .sort({ issueDate: -1 })
    .select('-certificateNumber')
    .lean();
  res.json({ success: true, certifications });
});

exports.listCertifications = asyncHandler(async (req, res) => {
  const certifications = await Certification.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, certifications });
});

exports.createCertification = asyncHandler(async (req, res) => {
  const certification = await Certification.create(clean(req.body));
  res.status(201).json({ success: true, certification });
});

exports.updateCertification = asyncHandler(async (req, res) => {
  const certification = await Certification.findById(req.params.id);
  if (!certification) throw ApiError.notFound('Certification not found');
  const data = clean(req.body);
  if (data.image !== undefined && certification.image?.publicId && data.image?.publicId !== certification.image.publicId) {
    await deleteImage(certification.image.publicId);
  }
  Object.assign(certification, data);
  await certification.save();
  res.json({ success: true, certification });
});

exports.deleteCertification = asyncHandler(async (req, res) => {
  const certification = await Certification.findById(req.params.id);
  if (!certification) throw ApiError.notFound('Certification not found');
  await deleteImage(certification.image?.publicId);
  await certification.deleteOne();
  res.json({ success: true });
});
