const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { optionalAuth } = require('../middleware/auth');
const payments = require('../controllers/paymentController');

router.get('/config', payments.getPaymentConfig);
router.post(
  '/initialize',
  optionalAuth,
  validate([body('orderId').isMongoId().withMessage('Invalid order'), body('email').optional().isEmail()]),
  payments.initializePayment
);
router.get('/verify', payments.verifyPayment);
router.post('/webhook/paystack', payments.paystackWebhook);
router.post('/webhook/flutterwave', payments.flutterwaveWebhook);

module.exports = router;
