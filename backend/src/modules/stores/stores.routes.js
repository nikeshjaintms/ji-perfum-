import { Router } from 'express';
import { 
  getStores, 
  getCities, 
  getStoreDetails, 
  createCity, 
  createStore,
  updateStore,
  deleteStore,
  deleteCity
} from './stores.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();

router.get('/cities', authenticate, getCities);
router.post('/cities', authenticate, authorize(['stores:manage']), createCity);
router.delete('/cities/:id', authenticate, authorize(['stores:manage']), deleteCity);

router.get('/', authenticate, getStores);
router.post('/', authenticate, authorize(['stores:manage']), createStore);
router.put('/:id', authenticate, authorize(['stores:manage']), updateStore);
router.delete('/:id', authenticate, authorize(['stores:manage']), deleteStore);

router.get('/:id', authenticate, getStoreDetails);

export default router;
