import { Router } from 'express';
import { getStores, getCities, getStoreDetails, createCity, createStore } from './stores.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getStores);
router.post('/', authenticate, createStore);

router.get('/cities', authenticate, getCities);
router.post('/cities', authenticate, createCity);

router.get('/:id', authenticate, getStoreDetails);

export default router;
