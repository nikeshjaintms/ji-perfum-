import { Router } from 'express';
import {
  getProducts,
  getProductByBarcodeOrSku,
  createProduct,
  updateProduct,
  adjustStock,
  getCategories,
} from './products.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();

// Public/Cashier lookup
router.get('/', authenticate, getProducts);
router.get('/lookup/:code', authenticate, getProductByBarcodeOrSku);
router.get('/categories', authenticate, getCategories);

// Admin / Store Manager modifications
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'STORE_MANAGER']), createProduct);
router.put('/:id', authenticate, authorize(['SUPER_ADMIN', 'STORE_MANAGER']), updateProduct);
router.post('/:id/adjust-stock', authenticate, authorize(['SUPER_ADMIN', 'STORE_MANAGER']), adjustStock);

export default router;
