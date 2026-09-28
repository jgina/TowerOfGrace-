const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { formLimiter } = require('../middleware/rateLimiters');
const { BulkOrder } = require('../models');
const gallery = require('../controllers/galleryController');
const content = require('../controllers/contentController');
const contact = require('../controllers/contactController');
const bulk = require('../controllers/bulkOrderController');
const certifications = require('../controllers/certificationController');

const email = (field = 'email') =>
  body(field).trim().isEmail().withMessage('A valid email is required').normalizeEmail({ gmail_remove_dots: false });

router.get('/gallery', gallery.listGallery);
router.get('/content', content.getAllContent);
router.get('/content/:key', content.getContent);
router.get('/certifications', certifications.listPublicCertifications);

router.post(
  '/contact',
  formLimiter,
  validate([
    body('name').trim().notEmpty().withMessage('Your name is required').isLength({ max: 120 }),
    email(),
    body('phone').optional({ values: 'falsy' }).trim().isLength({ min: 7, max: 30 }).withMessage('Enter a valid phone number'),
    body('subject').optional().trim().isLength({ max: 200 }),
    body('message').trim().isLength({ min: 10, max: 5000 }).withMessage('Please write a message of at least 10 characters'),
  ]),
  contact.createMessage
);

router.post(
  '/bulk-orders',
  formLimiter,
  validate([
    body('businessName').trim().notEmpty().withMessage('Business name is required').isLength({ max: 150 }),
    body('businessType').optional().isIn(BulkOrder.BUSINESS_TYPES),
    body('contactPerson').trim().notEmpty().withMessage('Contact person is required').isLength({ max: 120 }),
    body('phone').trim().isLength({ min: 7, max: 30 }).withMessage('A valid phone number is required'),
    email(),
    body('product').trim().notEmpty().withMessage('Please choose a product').isLength({ max: 150 }),
    body('quantity').trim().notEmpty().withMessage('Quantity is required').isLength({ max: 100 }),
    body('preferredWeight').optional().trim().isLength({ max: 100 }),
    body('deliveryLocation').trim().notEmpty().withMessage('Delivery location is required').isLength({ max: 300 }),
    body('message').optional().trim().isLength({ max: 3000 }),
  ]),
  bulk.createBulkOrder
);

module.exports = router;
