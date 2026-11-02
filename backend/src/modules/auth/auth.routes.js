import { Router } from 'express';
import { login, register, logout, getMe, changePassword } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, changePassword);
router.post('/change-password', authenticate, changePassword);

export default router;
