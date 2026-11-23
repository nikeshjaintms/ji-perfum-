import { Router } from 'express';
import {
  createInward,
  getInwards,
  getInwardById,
  distributeInwardStock,
  getDistributions,
  getInwardSummary,
} from './inward.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();

// Protect all inward routes with authentication
router.use(authenticate);

// 1. KPI summary & distribution logs
router.get('/summary', authorize(['inward:view', 'products:view']), getInwardSummary);
router.get('/distributions', authorize(['inward:view', 'products:view']), getDistributions);

// 2. Inward consignments CRUD & lookups
router.get('/', authorize(['inward:view', 'products:view']), getInwards);
router.get('/:id', authorize(['inward:view', 'products:view']), getInwardById);
router.post('/', authorize(['inward:create', 'products:create', 'products:stock']), createInward);

// 3. Multi-location stock distribution
router.post('/:id/distribute', authorize(['inward:distribute', 'products:stock']), distributeInwardStock);

export default router;
