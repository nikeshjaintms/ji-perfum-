import { Router } from 'express';
import { getStores, getCities, getStoreDetails, createCity, createStore } from './stores.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getStores);
router.post('/', authenticate, authorize(['SUPER_ADMIN', 'STORE_MANAGER']), createStore);

router.get('/cities', authenticate, getCities);
router.post('/cities', authenticate, authorize(['SUPER_ADMIN', 'STORE_MANAGER']), createCity);

router.get('/:id', authenticate, getStoreDetails);

export default router;
