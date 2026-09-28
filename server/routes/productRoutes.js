const router = require('express').Router();
const products = require('../controllers/productController');

// Storefront (public) product endpoints. Admin product management lives under /api/admin/products.
router.get('/', products.listProducts);
router.get('/filters', products.getFilterOptions);
router.get('/:slug', products.getProductBySlug);

module.exports = router;
