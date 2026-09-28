const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const pick = require('../utils/pick');

const ADDRESS_FIELDS = ['label', 'fullName', 'phone', 'address', 'city', 'state', 'isDefault'];

function applyDefault(user, addressId) {
  user.addresses.forEach((address) => {
    address.isDefault = String(address._id) === String(addressId);
  });
}

exports.listAddresses = asyncHandler(async (req, res) => {
  res.json({ success: true, addresses: req.user.addresses });
});

exports.addAddress = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.addresses.length >= 10) throw ApiError.badRequest('You can save up to 10 addresses');
  user.addresses.push(pick(req.body, ADDRESS_FIELDS));
  const added = user.addresses[user.addresses.length - 1];
  if (added.isDefault || user.addresses.length === 1) applyDefault(user, added._id);
  await user.save();
  res.status(201).json({ success: true, addresses: user.addresses });
});

exports.updateAddress = asyncHandler(async (req, res) => {
  const user = req.user;
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found');
  Object.assign(address, pick(req.body, ADDRESS_FIELDS));
  if (req.body.isDefault) applyDefault(user, address._id);
  await user.save();
  res.json({ success: true, addresses: user.addresses });
});

exports.deleteAddress = asyncHandler(async (req, res) => {
  const user = req.user;
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found');
  const wasDefault = address.isDefault;
  address.deleteOne();
  if (wasDefault && user.addresses.length) user.addresses[0].isDefault = true;
  await user.save();
  res.json({ success: true, addresses: user.addresses });
});
