import { Router } from 'express';
import {
  getProducts,
  getProductByBarcodeOrSku,
  createProduct,
  updateProduct,
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

export default router;
