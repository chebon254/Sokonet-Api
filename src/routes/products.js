const express = require('express');
const router = express.Router();
const productController = require('../controllers/business/productController');
const { protect, authorize } = require('../middlewares/auth');

// Protect all product routes
router.use(protect);
router.use(authorize('business'));

// Category routes
router.get('/categories', productController.getCategories);
router.post('/categories', productController.createCategory);
router.put('/categories/:id', productController.updateCategory);
router.delete('/categories/:id', productController.deleteCategory);

// Product routes
router.get('/', productController.getProducts);
router.post('/', productController.createProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.patch('/:id/stock', productController.updateStock);

module.exports = router;