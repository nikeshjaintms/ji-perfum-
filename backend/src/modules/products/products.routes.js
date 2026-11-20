import { Router } from 'express';
import {
  getProducts,
  getProductByBarcodeOrSku,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './products.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();

// Public/Cashier lookup
router.get('/', authenticate, getProducts);
router.get('/lookup/:code', authenticate, getProductByBarcodeOrSku);
router.get('/categories', authenticate, getCategories);

// Category Master Management
router.post('/categories', authenticate, authorize(['categories:manage']), createCategory);
router.put('/categories/:id', authenticate, authorize(['categories:manage']), updateCategory);
router.delete('/categories/:id', authenticate, authorize(['categories:manage']), deleteCategory);

// Fragrance Products Management
router.post('/', authenticate, authorize(['products:create']), createProduct);
router.put('/:id', authenticate, authorize(['products:edit']), updateProduct);
router.delete('/:id', authenticate, authorize(['products:delete']), deleteProduct);
router.post('/:id/adjust-stock', authenticate, authorize(['products:stock']), adjustStock);

export default router;
