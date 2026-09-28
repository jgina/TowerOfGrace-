const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Runs the given express-validator chains and rejects with a 400 listing each failed field.
const validate = (chains) => async (req, res, next) => {
  await Promise.all(chains.map((chain) => chain.run(req)));
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return next(ApiError.badRequest(details[0].message, details));
};

module.exports = validate;
