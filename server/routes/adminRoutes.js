const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { Order, Gallery, StockLoss } = require('../models');
const losses = require('../controllers/stockLossController');
const notifications = require('../controllers/notificationController');
const admin = require('../controllers/adminController');
const products = require('../controllers/productController');
const orders = require('../controllers/orderController');
const payments = require('../controllers/paymentController');
const gallery = require('../controllers/galleryController');
const content = require('../controllers/contentController');
const contact = require('../controllers/contactController');
const bulk = require('../controllers/bulkOrderController');
const certifications = require('../controllers/certificationController');
const uploads = require('../controllers/uploadController');

router.use(adminOnly);

router.get('/dashboard', admin.getDashboard);

// In-app notifications (bell in the admin top bar)
router.get('/notifications', notifications.listNotifications);
router.post('/notifications/read-all', notifications.markAllRead);
router.patch('/notifications/:id/read', notifications.markRead);

// Uploads (Cloudinary)
router.get('/uploads/status', uploads.uploadStatus);
router.post('/uploads', upload.array('images', 10), uploads.uploadImages);
router.delete('/uploads', uploads.deleteUpload);

// Products
const productRules = [
  body('name').trim().notEmpty().withMessage('Product name is required').isLength({ max: 150 }),
  body('category').isMongoId().withMessage('Please choose a category'),
  body('price').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Price must be 0 or more'),
  body('salePrice').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Sale price must be 0 or more'),
  body('stock').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('Stock must be a whole number of 0 or more'),
  body('variants').optional().isArray({ max: 30 }),
  body('variants.*.label').optional().trim().notEmpty().withMessage('Every option needs a label'),
  body('variants.*.price').optional().isFloat({ min: 0 }).withMessage('Option prices must be 0 or more'),
  body('variants.*.stock').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('Option stock must be a whole number of 0 or more'),
  body('images').optional().isArray({ max: 12 }),
];
router.get('/products', products.adminListProducts);
router.get('/products/:id', products.adminGetProduct);
router.post('/products', validate(productRules), products.createProduct);
router.put('/products/:id', validate(productRules), products.updateProduct);
router.patch('/products/:id', products.patchProductFlags);
router.delete('/products/:id', products.deleteProduct);

// Inventory
router.get('/inventory', admin.listInventory);
router.patch(
  '/inventory/:productId',
  validate([
    body('variantId').optional({ values: 'null' }).isMongoId(),
    body('stock').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('Stock must be a whole number of 0 or more'),
    body('adjustment').optional({ values: 'falsy' }).isInt().withMessage('Adjustment must be a whole number'),
  ]),
  admin.updateInventory
);

// Mortality & losses (deaths, broken eggs, spoilage) — each record deducts stock
router.get('/stock-losses', losses.listLosses);
router.post(
  '/stock-losses',
  validate([
    body('productId').isMongoId().withMessage('Choose a product'),
    body('variantId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid product option'),
    body('quantity').isInt({ min: 1, max: 1000000 }).withMessage('Quantity must be a whole number of at least 1'),
    body('reason').isIn(StockLoss.REASONS).withMessage('Choose a reason'),
    body('occurredOn').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date'),
    body('notes').optional().trim().isLength({ max: 1000 }),
  ]),
  losses.createLoss
);
router.post('/stock-losses/:id/reverse', validate([body('note').optional().trim().isLength({ max: 500 })]), losses.reverseLoss);

// Orders
router.get('/orders', orders.adminListOrders);
router.get('/orders/:id', orders.adminGetOrder);
router.patch(
  '/orders/:id/status',
  validate([body('status').isIn(Order.ORDER_STATUSES).withMessage('Invalid status'), body('note').optional().trim().isLength({ max: 500 })]),
  orders.adminUpdateStatus
);
router.patch(
  '/orders/:id/payment',
  validate([body('paymentStatus').isIn(Order.PAYMENT_STATUSES).withMessage('Invalid payment status')]),
  orders.adminUpdatePayment
);
router.post('/orders/:id/recheck-payment', payments.adminRecheckPayment);
router.post(
  '/orders/:id/confirm-payment',
  validate([body('note').optional().trim().isLength({ max: 500 })]),
  orders.adminConfirmPayment
);
router.post(
  '/orders/:id/reject-proof',
  validate([body('reason').trim().notEmpty().withMessage('Tell the customer why the receipt was rejected').isLength({ max: 500 })]),
  orders.adminRejectProof
);
router.post(
  '/orders/:id/notes',
  validate([body('note').trim().notEmpty().withMessage('Note cannot be empty').isLength({ max: 2000 })]),
  orders.adminAddNote
);

// Customers
router.get('/customers', admin.listCustomers);
router.get('/customers/:id', admin.getCustomer);
router.patch('/customers/:id/status', validate([body('isActive').isBoolean()]), admin.updateCustomerStatus);

// Content
router.put('/content/:key', content.updateContent);

// Gallery
const galleryRules = [
  body('category').isIn(Gallery.CATEGORIES).withMessage('Please choose a gallery category'),
  body('title').optional().trim().isLength({ max: 150 }),
  body('caption').optional().trim().isLength({ max: 500 }),
];
router.post('/gallery', validate(galleryRules), gallery.createGalleryItem);
router.put('/gallery/:id', validate(galleryRules), gallery.updateGalleryItem);
router.delete('/gallery/:id', gallery.deleteGalleryItem);

// Certifications
const certificationRules = [
  body('name').trim().notEmpty().withMessage('Certification name is required'),
  body('issuingOrganisation').trim().notEmpty().withMessage('Issuing organisation is required'),
  body('issueDate').optional({ values: 'falsy' }).isISO8601(),
  body('expiryDate').optional({ values: 'falsy' }).isISO8601(),
  body('status').optional().isIn(['ACTIVE', 'PENDING', 'EXPIRED', 'REVOKED']),
];
router.get('/certifications', certifications.listCertifications);
router.post('/certifications', validate(certificationRules), certifications.createCertification);
router.put('/certifications/:id', validate(certificationRules), certifications.updateCertification);
router.delete('/certifications/:id', certifications.deleteCertification);

// Enquiries
router.get('/messages', contact.listMessages);
router.patch('/messages/:id', contact.updateMessage);
router.delete('/messages/:id', contact.deleteMessage);
router.get('/bulk-orders', bulk.listBulkOrders);
router.patch('/bulk-orders/:id', bulk.updateBulkOrder);
router.delete('/bulk-orders/:id', bulk.deleteBulkOrder);

module.exports = router;
