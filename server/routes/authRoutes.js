const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const auth = require('../controllers/authController');

const passwordRule = (field) =>
  body(field)
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain a letter')
    .matches(/\d/)
    .withMessage('Password must contain a number');

router.post(
  '/register',
  authLimiter,
  validate([
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
    body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail({ gmail_remove_dots: false }),
    body('phone').optional({ values: 'falsy' }).trim().isLength({ min: 7, max: 30 }).withMessage('Enter a valid phone number'),
    passwordRule('password'),
  ]),
  auth.register
);

router.post(
  '/login',
  authLimiter,
  validate([
    body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail({ gmail_remove_dots: false }),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ]),
  auth.login
);

router.post('/logout', auth.logout);
router.get('/me', protect, auth.me);
router.patch(
  '/me',
  protect,
  validate([
    body('name').optional().trim().notEmpty().isLength({ max: 120 }),
    body('phone').optional({ values: 'falsy' }).trim().isLength({ min: 7, max: 30 }),
  ]),
  auth.updateProfile
);
router.patch(
  '/password',
  protect,
  authLimiter,
  validate([body('currentPassword').isString().notEmpty().withMessage('Current password is required'), passwordRule('newPassword')]),
  auth.changePassword
);

module.exports = router;
