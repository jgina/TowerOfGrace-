const router = require('express').Router();
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, optionalAuth } = require('../middleware/auth');
const { formLimiter, trackLimiter } = require('../middleware/rateLimiters');
const { receiptUpload } = require('../middleware/upload');
const { Order } = require('../models');
const orders = require('../controllers/orderController');

const createRules = [
  body('customer.fullName').trim().notEmpty().withMessage('Full name is required').isLength({ max: 120 }),
  body('customer.email').trim().isEmail().withMessage('A valid email is required').normalizeEmail({ gmail_remove_dots: false }),
  body('customer.phone').trim().isLength({ min: 7, max: 30 }).withMessage('A valid phone number is required'),
  body('items').isArray({ min: 1, max: 50 }).withMessage('Your cart is empty'),
  body('items.*.productId').isMongoId().withMessage('Invalid product in cart'),
  body('items.*.variantId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid product option in cart'),
  body('items.*.quantity').isInt({ min: 1, max: 10000 }).withMessage('Invalid quantity'),
  body('deliveryMethod').trim().notEmpty().withMessage('Please choose a delivery method'),
  body('deliveryAddress.address').optional().trim().isLength({ max: 300 }),
  body('deliveryAddress.city').optional().trim().isLength({ max: 80 }),
  body('deliveryAddress.state').optional().trim().isLength({ max: 80 }),
  body('preferredDeliveryDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Invalid delivery date')
    .custom((value) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(value) < today) throw new Error('Preferred delivery date cannot be in the past');
      return true;
    }),
  body('paymentMethod').isIn(Order.PAYMENT_METHODS).withMessage('Please choose a payment method'),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

router.post('/', formLimiter, optionalAuth, validate(createRules), orders.createOrder);
router.post(
  '/payment-proof',
  formLimiter,
  receiptUpload.single('receipt'),
  validate([
    body('orderNumber').trim().notEmpty().withMessage('Order number is required'),
    body('email').trim().isEmail().withMessage('A valid email is required'),
    body('note').optional().trim().isLength({ max: 500 }),
  ]),
  orders.uploadPaymentProof
);
router.get(
  '/track',
  trackLimiter,
  validate([query('orderNumber').trim().notEmpty(), query('email').trim().isEmail()]),
  orders.trackOrder
);
router.get('/mine', protect, orders.myOrders);
router.get('/mine/:id', protect, orders.getMyOrder);
router.post('/mine/:id/cancel', protect, orders.cancelMyOrder);

module.exports = router;
