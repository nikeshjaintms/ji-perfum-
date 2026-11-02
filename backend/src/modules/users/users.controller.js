import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';

export const getUsers = async (req, res) => {
  try {
    const { search, role, page, limit, sortBy, sortOrder } = req.query;

    const where = {};

    if (role && role !== 'ALL') {
      where.role = role;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const validRoles = ['SUPER_ADMIN', 'STORE_MANAGER', 'CASHIER', 'VIEWER'];
      const matchedRoles = validRoles.filter((r) =>
        r.toLowerCase().includes(q.toLowerCase())
      );

      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        ...(matchedRoles.length > 0 ? [{ role: { in: matchedRoles } }] : []),
      ];
    }

    let orderBy = { createdAt: 'desc' };
    if (sortBy) {
      const allowedSort = ['name', 'email', 'role', 'createdAt'];
      if (allowedSort.includes(sortBy)) {
        orderBy = { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' };
      }
    }

    const select = {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    };

    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : null;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10) || 10) : null;

    if (pageNum && limitNum) {
      const skip = (pageNum - 1) * limitNum;
      const take = limitNum;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select,
          orderBy,
          take,
          skip,
        }),
        prisma.user.count({ where }),
      ]);

      return res.json({
        success: true,
        data: users,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select,
        orderBy,
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page: 1,
        limit: total,
        totalPages: 1,
      },
    });
  } catch (error) {
    console.error('getUsers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'CASHIER' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ success: true, message: 'User created successfully', data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to create user' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, isActive } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // If email changed, check uniqueness
    if (email && email.toLowerCase().trim() !== user.email.toLowerCase()) {
      const existing = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
      if (existing && existing.id !== id) {
        return res.status(400).json({ success: false, message: 'User with this email already exists' });
      }
    }

    // Prevent demoting the only Super Admin
    if (user.role === 'SUPER_ADMIN' && role && role !== 'SUPER_ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', isActive: true },
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the only active Super Admin owner.',
        });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (password !== undefined && password !== null && password !== '') {
      const trimmedPassword = typeof password === 'string' ? password.trim() : '';
      if (trimmedPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long.',
        });
      }
      updateData.passwordHash = await bcrypt.hash(trimmedPassword, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({
      success: true,
      message: `Staff member '${updated.name}' updated successfully`,
      data: updated,
    });
  } catch (error) {
    console.error('updateUser error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            invoices: true,
            stockLogs: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deleting oneself
    if (req.user?.id === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.',
      });
    }

    // Prevent deleting the only Super Admin
    if (user.role === 'SUPER_ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'SUPER_ADMIN' },
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the only Super Admin owner.',
        });
      }
    }

    // If user has linked transaction records, soft delete / deactivate
    if (user._count?.invoices > 0 || user._count?.stockLogs > 0) {
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      return res.json({
        success: true,
        message: `Staff member '${user.name}' has transaction history and has been deactivated.`,
      });
    }

    // Otherwise, hard delete safely
    await prisma.user.delete({ where: { id } });

    return res.json({
      success: true,
      message: `Staff member '${user.name}' deleted successfully`,
    });
  } catch (error) {
    console.error('deleteUser error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete user' });
  }
};
