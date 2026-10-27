import { Router } from 'express';
import { getStores, getCities, getStoreDetails } from './stores.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getStores);
router.get('/cities', authenticate, getCities);
router.get('/:id', authenticate, getStoreDetails);

export default router;
