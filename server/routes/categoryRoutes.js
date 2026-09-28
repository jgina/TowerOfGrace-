const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { adminOnly, optionalAuth } = require('../middleware/auth');
const categories = require('../controllers/categoryController');

const rules = [
  body('name').trim().notEmpty().withMessage('Category name is required').isLength({ max: 80 }),
  body('variantType').optional().isIn(['weight', 'packaging']),
];

router.get('/', optionalAuth, categories.listCategories);
router.get('/:slug', categories.getCategory);
router.post('/', adminOnly, validate(rules), categories.createCategory);
router.put('/:id', adminOnly, validate(rules), categories.updateCategory);
router.delete('/:id', adminOnly, categories.deleteCategory);

module.exports = router;
