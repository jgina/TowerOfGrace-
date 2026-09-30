const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { Order, Gallery, StockLoss, FeedItem } = require('../models');
const losses = require('../controllers/stockLossController');
const notifications = require('../controllers/notificationController');
const marketTrips = require('../controllers/marketTripController');
const reports = require('../controllers/reportController');
const batches = require('../controllers/flockBatchController');
const feeds = require('../controllers/feedController');
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

// Monthly / annual activity statement (printable report)
router.get('/reports/statement', reports.getStatement);

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

// Flock batches — growing birds tracked from arrival; moved into stock only when confirmed ready
const batchRules = [
  body('breed').optional().trim().isLength({ max: 80 }),
  body('supplier').optional().trim().isLength({ max: 150 }),
  body('house').optional().trim().isLength({ max: 80 }),
  body('purchaseDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid arrival date'),
  body('ageAtPurchaseDays').optional({ values: 'falsy' }).isInt({ min: 1, max: 3650 }).withMessage('Age on arrival must be 1 day or more'),
  body('quantityPurchased').optional().isInt({ min: 1, max: 10000000 }).withMessage('Quantity must be at least 1'),
  body('unitCost').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Cost must be 0 or more'),
  body('targetAgeDays').optional().isInt({ min: 1, max: 3650 }).withMessage('Target age must be at least 1 day'),
  body('targetWeightKg').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Target weight must be 0 or more'),
  body('notes').optional().trim().isLength({ max: 1000 }),
];
router.get('/batches', batches.listBatches);
router.get('/batches/:id', batches.getBatch);
router.post(
  '/batches',
  validate([
    body('category').isMongoId().withMessage('Choose a category'),
    body('quantityPurchased').isInt({ min: 1, max: 10000000 }).withMessage('Enter how many birds arrived'),
    body('targetAgeDays').isInt({ min: 1, max: 3650 }).withMessage('Enter the age (in days) the birds are sold at'),
    body('batchCode').optional({ values: 'falsy' }).trim().isLength({ max: 40 }),
    ...batchRules,
  ]),
  batches.createBatch
);
router.put('/batches/:id', validate(batchRules), batches.updateBatch);
router.post(
  '/batches/:id/mortality',
  validate([
    body('quantity').isInt({ min: 1 }).withMessage('Enter how many birds died'),
    body('reason').isIn(StockLoss.REASONS).withMessage('Choose a reason'),
    body('date').optional({ values: 'falsy' }).isISO8601(),
    body('note').optional().trim().isLength({ max: 500 }),
  ]),
  batches.recordMortality
);
router.post(
  '/batches/:id/weighings',
  validate([
    body('avgWeightKg').isFloat({ gt: 0, max: 100 }).withMessage('Enter the average weight in kg'),
    body('sampleSize').optional({ values: 'falsy' }).isInt({ min: 1 }),
    body('date').optional({ values: 'falsy' }).isISO8601(),
    body('note').optional().trim().isLength({ max: 500 }),
  ]),
  batches.recordWeighing
);
router.post(
  '/batches/:id/transfer',
  validate([
    body('allocations').isArray({ min: 1, max: 20 }).withMessage('Choose where the birds go'),
    body('allocations.*.productId').isMongoId().withMessage('Choose a product for every line'),
    body('allocations.*.quantity').isInt({ min: 0 }).withMessage('Quantities must be whole numbers'),
    body('note').optional().trim().isLength({ max: 500 }),
  ]),
  batches.transferToStock
);
router.post('/batches/:id/close', validate([body('reason').optional().trim().isLength({ max: 500 })]), batches.closeBatch);

// Feed store — bags bought, bags fed daily (optionally per batch), remaining stock and low-feed alerts
const feedRules = [
  body('name').optional().trim().notEmpty().withMessage('Feed name is required').isLength({ max: 100 }),
  body('brand').optional().trim().isLength({ max: 80 }),
  body('feedType').optional().isIn(FeedItem.TYPES),
  body('bagSizeKg').optional({ values: 'falsy' }).isFloat({ min: 0.1, max: 1000 }).withMessage('Bag size must be more than 0 kg'),
  body('lowStockBags').optional().isFloat({ min: 0, max: 100000 }).withMessage('Alert level must be 0 or more bags'),
  body('notes').optional().trim().isLength({ max: 500 }),
  body('isActive').optional().isBoolean(),
];
router.get('/feeds', feeds.listFeeds);
router.get('/feeds/transactions', feeds.listTransactions);
router.get('/feeds/batch/:batchId', feeds.batchFeedUsage);
router.get('/feeds/targets', feeds.feedingTargets);
router.post(
  '/feeds',
  validate([body('name').trim().notEmpty().withMessage('Feed name is required'), body('openingBags').optional({ values: 'falsy' }).isFloat({ min: 0 }), ...feedRules]),
  feeds.createFeed
);
router.put('/feeds/:id', validate(feedRules), feeds.updateFeed);
router.post(
  '/feeds/usage',
  validate([
    body('date').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date'),
    body('lines').isArray({ min: 1, max: 30 }).withMessage('Add at least one feed used'),
    body('lines.*.feedId').isMongoId().withMessage('Choose a feed on every line'),
    body('lines.*.bags').isFloat({ gt: 0, max: 100000 }).withMessage('Bags used must be more than 0'),
    body('lines.*.fedTo').optional({ values: 'falsy' }).isIn(['FARM', 'BATCH', 'STOCK', 'GROUP']).withMessage('Choose who was fed'),
    body('lines.*.batchId').optional({ values: 'falsy' }).isMongoId(),
    body('lines.*.productId').optional({ values: 'falsy' }).isMongoId(),
    body('lines.*.groupName').optional().trim().isLength({ max: 120 }),
    body('note').optional().trim().isLength({ max: 500 }),
  ]),
  feeds.recordUsage
);
router.post(
  '/feeds/:id/purchases',
  validate([
    body('bags').isFloat({ gt: 0, max: 100000 }).withMessage('Bags bought must be more than 0'),
    body('costPerBag').optional({ values: 'falsy' }).isFloat({ min: 0 }),
    body('supplier').optional().trim().isLength({ max: 150 }),
    body('date').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date'),
    body('note').optional().trim().isLength({ max: 500 }),
  ]),
  feeds.recordPurchase
);
router.post(
  '/feeds/:id/adjust',
  validate([body('note').trim().notEmpty().withMessage('Give a reason for the correction').isLength({ max: 500 }), body('date').optional({ values: 'falsy' }).isISO8601()]),
  feeds.adjustStock
);

// Market trips — stock taken to market, then reconciled as sold / returned / lost
router.get('/market-trips', marketTrips.listTrips);
router.get('/market-trips/:id', marketTrips.getTrip);
router.post(
  '/market-trips',
  validate([
    body('market').trim().notEmpty().withMessage('Enter the market or destination').isLength({ max: 150 }),
    body('tripDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid trip date'),
    body('responsiblePerson').optional().trim().isLength({ max: 120 }),
    body('vehicle').optional().trim().isLength({ max: 80 }),
    body('notes').optional().trim().isLength({ max: 1000 }),
    body('items').isArray({ min: 1, max: 50 }).withMessage('Add at least one product'),
    body('items.*.productId').isMongoId().withMessage('Choose a product for every line'),
    body('items.*.quantity').isInt({ min: 1, max: 1000000 }).withMessage('Every line needs a quantity of at least 1'),
  ]),
  marketTrips.createTrip
);
router.post(
  '/market-trips/:id/close',
  validate([body('items').isArray({ min: 1 }).withMessage('Enter the results for every item'), body('closingNotes').optional().trim().isLength({ max: 1000 })]),
  marketTrips.closeTrip
);
router.post('/market-trips/:id/cancel', validate([body('reason').optional().trim().isLength({ max: 500 })]), marketTrips.cancelTrip);

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
