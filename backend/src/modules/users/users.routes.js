import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from './users.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();

router.get('/', authenticate, authorize(['SUPER_ADMIN']), getUsers);
router.post('/', authenticate, authorize(['SUPER_ADMIN']), createUser);
router.put('/:id', authenticate, authorize(['SUPER_ADMIN']), updateUser);
router.delete('/:id', authenticate, authorize(['SUPER_ADMIN']), deleteUser);

export default router;
