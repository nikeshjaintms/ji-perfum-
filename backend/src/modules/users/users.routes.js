import { Router } from 'express';
import { 
  getUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  getRolesAndPermissions,
  createRole,
  updateRole,
  toggleRolePermission,
  deleteRole,
  resetRole,
  createPermission,
  updatePermission,
  deletePermission
} from './users.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();

// Granular Permissions Master CRUD Routes
router.post('/permissions', authenticate, authorize(['roles:manage']), createPermission);
router.put('/permissions/:id', authenticate, authorize(['roles:manage']), updatePermission);
router.delete('/permissions/:id', authenticate, authorize(['roles:manage']), deletePermission);

// Roles Master CRUD Routes
router.get('/roles-permissions', authenticate, authorize(['roles:view']), getRolesAndPermissions);
router.post('/roles-permissions', authenticate, authorize(['roles:manage']), createRole);
router.put('/roles-permissions/:id', authenticate, authorize(['roles:manage']), updateRole);
router.post('/roles-permissions/:id/toggle', authenticate, authorize(['roles:manage']), toggleRolePermission);
router.delete('/roles-permissions/:id', authenticate, authorize(['roles:manage']), deleteRole);
router.post('/roles-permissions/:id/reset', authenticate, authorize(['roles:manage']), resetRole);

// Users Master Routes
router.get('/', authenticate, authorize(['users:view']), getUsers);
router.post('/', authenticate, authorize(['users:manage']), createUser);
router.put('/:id', authenticate, authorize(['users:manage']), updateUser);
router.delete('/:id', authenticate, authorize(['users:manage']), deleteUser);

export default router;
