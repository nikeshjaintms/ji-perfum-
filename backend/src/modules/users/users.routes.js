import { Router } from 'express';
import { getUsers, createUser } from './users.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();

router.get('/', authenticate, authorize(['SUPER_ADMIN']), getUsers);
router.post('/', authenticate, authorize(['SUPER_ADMIN']), createUser);

export default router;
