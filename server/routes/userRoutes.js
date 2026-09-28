const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const users = require('../controllers/userController');

const addressRules = [
  body('address').trim().notEmpty().withMessage('Address is required').isLength({ max: 300 }),
  body('city').trim().notEmpty().withMessage('City is required').isLength({ max: 80 }),
  body('state').trim().notEmpty().withMessage('State is required').isLength({ max: 80 }),
  body('label').optional().trim().isLength({ max: 50 }),
  body('fullName').optional().trim().isLength({ max: 120 }),
  body('phone').optional().trim().isLength({ max: 30 }),
  body('isDefault').optional().isBoolean(),
];

router.use(protect);
router.get('/me/addresses', users.listAddresses);
router.post('/me/addresses', validate(addressRules), users.addAddress);
router.put('/me/addresses/:addressId', validate(addressRules), users.updateAddress);
router.delete('/me/addresses/:addressId', users.deleteAddress);

module.exports = router;
