import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

// Helper to extract a cookie value from the raw Cookie header if needed
const parseCookieHeader = (header, name) => {
  if (!header) return null;
  const match = header.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
};

export const authenticate = async (req, res, next) => {
  try {
    // 1. Check cookies (httpOnly 'token' or 'jj_token')
    let token = req.cookies?.token || req.cookies?.jj_token;

    // 2. Direct fallback to parsing Cookie header
    if (!token && req.headers.cookie) {
      token = parseCookieHeader(req.headers.cookie, 'token') || parseCookieHeader(req.headers.cookie, 'jj_token');
    }

    // 3. Fallback to Authorization: Bearer <token>
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jj_perfume_default_secret');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        isActive: true,
        assignedStoreId: true,
        assignedStore: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive.' });
    }

    // Load active granular permissions assigned to this user's role from role_permissions
    let permissions = [];
    try {
      const roleRows = await prisma.$queryRawUnsafe(
        `SELECT permissions FROM role_permissions WHERE role_id = ?;`,
        user.role
      );
      if (roleRows && roleRows.length > 0) {
        const raw = roleRows[0].permissions;
        permissions = typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
    } catch (err) {
      console.error('Error fetching role permissions for user:', err);
      permissions = [];
    }

    user.permissions = Array.isArray(permissions) ? permissions : [];
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

export const authorize = (requirements = []) => {
  const reqList = Array.isArray(requirements) ? requirements : [requirements];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Super Admin has unrestricted authority over all modules
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const userPerms = req.user.permissions || [];
    const userRole = req.user.role;

    // Check if user has ANY of the required permissions OR matching role
    const hasAccess = reqList.some((item) => {
      if (item.includes(':')) {
        return userPerms.includes(item);
      }
      return item === userRole;
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Your account does not have permission (${reqList.join(' or ')}) to perform this action.`,
      });
    }

    next();
  };
};
