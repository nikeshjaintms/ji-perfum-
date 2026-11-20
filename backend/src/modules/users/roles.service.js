import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const DEFAULT_MODULES = [
  {
    id: 'dashboard',
    name: 'Executive Dashboard',
    description: 'Executive revenue metrics, sales trends, store performance, inventory valuation, and analytics',
    permissions: [
      { key: 'dashboard:view', name: 'View Dashboard', description: 'Inspect sales trends, KPI cards, performance metrics, and inventory alerts' },
      { key: 'dashboard:export', name: 'Export Reports', description: 'Download analytical datasets and financial statements in CSV format' },
    ],
  },
  {
    id: 'billing',
    name: 'POS & Billing',
    description: 'Point of sale counter, barcode scanning, checkout, discounts, and payment receipts',
    permissions: [
      { key: 'billing:create', name: 'Create Bills', description: 'Create retail invoices and process split/cash/UPI payments' },
      { key: 'billing:discount', name: 'Apply Discounts', description: 'Apply manual fixed or percentage discounts at checkout' },
      { key: 'billing:settle', name: 'Settle Credit/Dues', description: 'Collect pending due balances on credit invoices' },
    ],
  },
  {
    id: 'invoices',
    name: 'Invoices & Receipts',
    description: 'Invoice registry, PDF generation, tax reporting, thermal receipts, and cancellations',
    permissions: [
      { key: 'invoices:view', name: 'View Invoices', description: 'Search and inspect all customer bills and payment statuses' },
      { key: 'invoices:cancel', name: 'Cancel Invoices', description: 'Void or cancel generated invoices with stock reversion' },
      { key: 'invoices:whatsapp', name: 'Send WhatsApp Receipts', description: 'Deliver automated and manual WhatsApp tax invoice bills' },
      { key: 'invoices:print', name: 'Print Invoices & Thermal Receipts', description: 'Generate official A4 tax invoices and POS thermal printouts' },
    ],
  },
  {
    id: 'products',
    name: 'Products Master',
    description: 'Fragrance catalog, SKU management, pricing, notes, volume, and inventory balances',
    permissions: [
      { key: 'products:view', name: 'View Catalog', description: 'Browse products, SKUs, and stock availability' },
      { key: 'products:create', name: 'Add Products', description: 'Create new fragrance SKUs, barcodes, and concentration tiers' },
      { key: 'products:edit', name: 'Edit Products', description: 'Modify prices, description, fragrance notes, volume & images' },
      { key: 'products:delete', name: 'Delete Products', description: 'Remove or archive product SKUs from the catalog' },
      { key: 'products:stock', name: 'Manage Inventory', description: 'Adjust store-specific stock levels and record transfers' },
    ],
  },
  {
    id: 'categories',
    name: 'Category Master',
    description: 'Fragrance scent families, olfactory classifications, and category hierarchy',
    permissions: [
      { key: 'categories:view', name: 'View Categories', description: 'Browse scent categories and associated product counts' },
      { key: 'categories:manage', name: 'Manage Categories', description: 'Create, update, and remove fragrance scent categories' },
    ],
  },
  {
    id: 'stores',
    name: 'Outlet & Store Master',
    description: 'Boutique locations, city registrations, local jurisdictions, and retail counters',
    permissions: [
      { key: 'stores:view', name: 'View Outlets', description: 'Inspect boutique stores, addresses, UPI IDs, and GSTINs' },
      { key: 'stores:manage', name: 'Manage Outlets', description: 'Register new stores, configure cities, and update store parameters' },
    ],
  },
  {
    id: 'users',
    name: 'Users Master',
    description: 'Staff member accounts, store assignments, role designations, and active credentials',
    permissions: [
      { key: 'users:view', name: 'View Staff', description: 'View user accounts, roles, and assigned boutique outlets' },
      { key: 'users:manage', name: 'Manage Staff', description: 'Create staff accounts, reassign outlets, reset passwords, and deactivate' },
    ],
  },
  {
    id: 'roles',
    name: 'Roles & Permissions Master',
    description: 'Security policies, role hierarchies, and granular system permission mapping',
    permissions: [
      { key: 'roles:view', name: 'View Permissions', description: 'Inspect role access matrices and capability definitions' },
      { key: 'roles:manage', name: 'Manage Security Policies', description: 'Configure role assignments and system authorization controls' },
    ],
  },
];

export const SYSTEM_DEFAULT_ROLES = [
  {
    roleId: 'SUPER_ADMIN',
    name: 'Owner (Super Admin)',
    badgeColor: 'amber',
    description: 'Complete unrestricted authority over all outlets, masters, billing, financials, security, and staff.',
    isSystem: true,
    permissions: [
      'dashboard:view', 'dashboard:export',
      'billing:create', 'billing:discount', 'billing:settle',
      'invoices:view', 'invoices:cancel', 'invoices:whatsapp', 'invoices:print',
      'products:view', 'products:create', 'products:edit', 'products:delete', 'products:stock',
      'categories:view', 'categories:manage',
      'stores:view', 'stores:manage',
      'users:view', 'users:manage',
      'roles:view', 'roles:manage',
    ],
  },
  {
    roleId: 'STORE_MANAGER',
    name: 'Store Manager',
    badgeColor: 'blue',
    description: 'Oversees boutique store inventory, staff assignments, stock adjustments, invoice voids, and sales operations.',
    isSystem: true,
    permissions: [
      'dashboard:view', 'dashboard:export',
      'billing:create', 'billing:discount', 'billing:settle',
      'invoices:view', 'invoices:cancel', 'invoices:whatsapp', 'invoices:print',
      'products:view', 'products:create', 'products:edit', 'products:stock',
      'categories:view',
      'stores:view',
      'users:view',
      'roles:view',
    ],
  },
  {
    roleId: 'CASHIER',
    name: 'Cashier',
    badgeColor: 'emerald',
    description: 'Counter sales associate focused on customer billing, UPI QR code collection, cash payments, and receipt generation.',
    isSystem: true,
    permissions: [
      'billing:create', 'billing:discount',
      'invoices:view', 'invoices:whatsapp', 'invoices:print',
      'products:view',
      'categories:view',
      'stores:view',
    ],
  },
  {
    roleId: 'VIEWER',
    name: 'Viewer / Auditor',
    badgeColor: 'slate',
    description: 'Read-only auditor with visibility into products, invoices, and outlets without transactional or modification capabilities.',
    isSystem: true,
    permissions: [
      'invoices:view',
      'products:view',
      'categories:view',
      'stores:view',
    ],
  },
];

let isTableInitialized = false;

export async function ensureRolePermissionsTable() {
  if (isTableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id VARCHAR(100) PRIMARY KEY,
        role_id VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        badge_color VARCHAR(50) DEFAULT 'amber',
        permissions TEXT NOT NULL,
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS system_permissions (
        id VARCHAR(100) PRIMARY KEY,
        permission_key VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        module_id VARCHAR(50) NOT NULL,
        module_name VARCHAR(100) NOT NULL,
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed defaults if empty
    const existing = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM role_permissions;`);
    const count = Number(existing[0]?.count || 0);

    if (count === 0) {
      for (const r of SYSTEM_DEFAULT_ROLES) {
        const id = crypto.randomUUID();
        const permJson = JSON.stringify(r.permissions);
        await prisma.$executeRawUnsafe(
          `INSERT INTO role_permissions (id, role_id, name, description, badge_color, permissions, is_system) 
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          id, r.roleId, r.name, r.description, r.badgeColor, permJson, true
        );
      }
    }

    // Seed permissions defaults if empty
    const existingPerms = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM system_permissions;`);
    const permCount = Number(existingPerms[0]?.count || 0);

    if (permCount === 0) {
      for (const mod of DEFAULT_MODULES) {
        for (const p of mod.permissions) {
          const permId = crypto.randomUUID();
          await prisma.$executeRawUnsafe(
            `INSERT INTO system_permissions (id, permission_key, name, description, module_id, module_name, is_system)
             VALUES (?, ?, ?, ?, ?, ?, ?);`,
            permId, p.key, p.name, p.description, mod.id, mod.name, true
          );
        }
      }
    }

    // Sync any missing default system permissions (e.g. dashboard:view, dashboard:export)
    for (const mod of DEFAULT_MODULES) {
      for (const p of mod.permissions) {
        const found = await prisma.$queryRawUnsafe(
          `SELECT id FROM system_permissions WHERE permission_key = ?;`,
          p.key
        );
        if (!found || found.length === 0) {
          const permId = crypto.randomUUID();
          await prisma.$executeRawUnsafe(
            `INSERT INTO system_permissions (id, permission_key, name, description, module_id, module_name, is_system)
             VALUES (?, ?, ?, ?, ?, ?, ?);`,
            permId, p.key, p.name, p.description, mod.id, mod.name, true
          );
        }
      }
    }

    // Sync default permissions for system roles (SUPER_ADMIN and STORE_MANAGER get dashboard permissions)
    for (const sysRole of SYSTEM_DEFAULT_ROLES) {
      const roleRow = await prisma.$queryRawUnsafe(
        `SELECT permissions FROM role_permissions WHERE role_id = ?;`,
        sysRole.roleId
      );
      if (roleRow && roleRow.length > 0) {
        let currentPerms = [];
        try {
          currentPerms = JSON.parse(roleRow[0].permissions || '[]');
        } catch (e) {
          currentPerms = [];
        }
        let updated = false;
        for (const reqPerm of sysRole.permissions) {
          if (!currentPerms.includes(reqPerm)) {
            currentPerms.push(reqPerm);
            updated = true;
          }
        }
        if (updated) {
          await prisma.$executeRawUnsafe(
            `UPDATE role_permissions SET permissions = ? WHERE role_id = ?;`,
            JSON.stringify(currentPerms),
            sysRole.roleId
          );
        }
      }
    }

    isTableInitialized = true;
  } catch (err) {
    console.error('ensureRolePermissionsTable error:', err);
  }
}

export async function getAllRoles() {
  await ensureRolePermissionsTable();

  // Get user count per role from User table
  const roleCounts = await prisma.user.groupBy({
    by: ['role'],
    _count: { id: true },
  });

  const userCountMap = {};
  roleCounts.forEach((rc) => {
    userCountMap[rc.role] = rc._count.id;
  });

  const rows = await prisma.$queryRawUnsafe(`SELECT * FROM role_permissions ORDER BY is_system DESC, name ASC;`);

  const roles = rows.map((r) => {
    let perms = [];
    try {
      perms = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions;
    } catch {
      perms = [];
    }

    return {
      id: r.role_id,
      roleId: r.role_id,
      name: r.name,
      description: r.description,
      badgeColor: r.badge_color || 'amber',
      isSystem: Boolean(r.is_system),
      userCount: userCountMap[r.role_id] || 0,
      permissions: perms,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });

  // Query permissions dynamically from system_permissions table
  const permRows = await prisma.$queryRawUnsafe(`
    SELECT * FROM system_permissions ORDER BY module_name ASC, is_system DESC, name ASC;
  `);

  // Group permissions by module
  const moduleMap = {};
  for (const p of permRows) {
    if (!moduleMap[p.module_id]) {
      const defMod = DEFAULT_MODULES.find((m) => m.id === p.module_id);
      moduleMap[p.module_id] = {
        id: p.module_id,
        name: p.module_name || defMod?.name || p.module_id,
        description: defMod?.description || `Module for ${p.module_name || p.module_id}`,
        permissions: [],
      };
    }
    moduleMap[p.module_id].permissions.push({
      id: p.id,
      key: p.permission_key,
      name: p.name,
      description: p.description,
      moduleId: p.module_id,
      moduleName: p.module_name,
      isSystem: Boolean(p.is_system),
      createdAt: p.created_at,
    });
  }

  const modules = Object.values(moduleMap);
  const allPermsCount = permRows.length;

  return {
    roles,
    modules,
    summary: {
      totalRoles: roles.length,
      totalModules: modules.length,
      totalPermissions: allPermsCount,
      totalUsers: Object.values(userCountMap).reduce((a, b) => a + b, 0),
    },
  };
}

export async function createCustomRole({ roleId, name, description, badgeColor = 'amber', permissions = [] }) {
  await ensureRolePermissionsTable();

  const cleanRoleId = (roleId || name || '').toUpperCase().trim().replace(/[^A-Z0-9_]/g, '_');
  if (!cleanRoleId) {
    throw new Error('Role identifier or name is required');
  }

  // Check unique
  const existing = await prisma.$queryRawUnsafe(`SELECT id FROM role_permissions WHERE role_id = ?;`, cleanRoleId);
  if (existing.length > 0) {
    throw new Error(`Role "${cleanRoleId}" already exists`);
  }

  const id = crypto.randomUUID();
  const permJson = JSON.stringify(permissions);

  await prisma.$executeRawUnsafe(
    `INSERT INTO role_permissions (id, role_id, name, description, badge_color, permissions, is_system) 
     VALUES (?, ?, ?, ?, ?, ?, FALSE);`,
    id, cleanRoleId, name.trim(), description || '', badgeColor, permJson
  );

  return {
    id: cleanRoleId,
    roleId: cleanRoleId,
    name: name.trim(),
    description,
    badgeColor,
    isSystem: false,
    permissions,
    userCount: 0,
  };
}

export async function updateRoleDetails(roleId, { name, description, badgeColor, permissions }) {
  await ensureRolePermissionsTable();

  const existing = await prisma.$queryRawUnsafe(`SELECT * FROM role_permissions WHERE role_id = ?;`, roleId);
  if (existing.length === 0) {
    throw new Error(`Role "${roleId}" not found`);
  }

  const current = existing[0];
  const newName = name !== undefined ? name.trim() : current.name;
  const newDesc = description !== undefined ? description : current.description;
  const newColor = badgeColor !== undefined ? badgeColor : current.badge_color;
  
  let newPerms = current.permissions;
  if (permissions !== undefined) {
    newPerms = JSON.stringify(permissions);
  }

  await prisma.$executeRawUnsafe(
    `UPDATE role_permissions 
     SET name = ?, description = ?, badge_color = ?, permissions = ? 
     WHERE role_id = ?;`,
    newName, newDesc, newColor, newPerms, roleId
  );

  let parsedPerms = [];
  try {
    parsedPerms = JSON.parse(newPerms);
  } catch {
    parsedPerms = [];
  }

  return {
    id: roleId,
    roleId,
    name: newName,
    description: newDesc,
    badgeColor: newColor,
    permissions: parsedPerms,
  };
}

export async function toggleSinglePermission(roleId, permissionKey) {
  await ensureRolePermissionsTable();

  const existing = await prisma.$queryRawUnsafe(`SELECT permissions, is_system FROM role_permissions WHERE role_id = ?;`, roleId);
  if (existing.length === 0) {
    throw new Error(`Role "${roleId}" not found`);
  }

  let perms = [];
  try {
    perms = JSON.parse(existing[0].permissions);
  } catch {
    perms = [];
  }

  const hasPerm = perms.includes(permissionKey);
  let updatedPerms;
  if (hasPerm) {
    // Don't allow removing roles:manage from SUPER_ADMIN
    if (roleId === 'SUPER_ADMIN' && permissionKey === 'roles:manage') {
      throw new Error('Cannot revoke roles:manage from SUPER_ADMIN');
    }
    updatedPerms = perms.filter((p) => p !== permissionKey);
  } else {
    updatedPerms = [...perms, permissionKey];
  }

  const permJson = JSON.stringify(updatedPerms);
  await prisma.$executeRawUnsafe(
    `UPDATE role_permissions SET permissions = ? WHERE role_id = ?;`,
    permJson, roleId
  );

  return {
    roleId,
    permissionKey,
    granted: !hasPerm,
    permissions: updatedPerms,
  };
}

export async function deleteCustomRole(roleId) {
  await ensureRolePermissionsTable();

  const existing = await prisma.$queryRawUnsafe(`SELECT is_system FROM role_permissions WHERE role_id = ?;`, roleId);
  if (existing.length === 0) {
    throw new Error(`Role "${roleId}" not found`);
  }

  if (existing[0].is_system) {
    throw new Error(`System core role "${roleId}" cannot be deleted. You can modify its permissions instead.`);
  }

  // Check if any users are assigned to this role
  const userCount = await prisma.user.count({ where: { role: roleId } }).catch(() => 0);
  if (userCount > 0) {
    throw new Error(`Cannot delete role "${roleId}": ${userCount} staff member(s) are currently assigned to it.`);
  }

  await prisma.$executeRawUnsafe(`DELETE FROM role_permissions WHERE role_id = ?;`, roleId);
  return { success: true, message: `Role "${roleId}" deleted successfully` };
}

export async function resetSystemRoleToDefault(roleId) {
  await ensureRolePermissionsTable();

  const def = SYSTEM_DEFAULT_ROLES.find((r) => r.roleId === roleId);
  if (!def) {
    throw new Error(`No default template found for "${roleId}"`);
  }

  const permJson = JSON.stringify(def.permissions);
  await prisma.$executeRawUnsafe(
    `UPDATE role_permissions 
     SET name = ?, description = ?, badge_color = ?, permissions = ? 
     WHERE role_id = ?;`,
    def.name, def.description, def.badgeColor, permJson, roleId
  );

  return {
    roleId,
    name: def.name,
    permissions: def.permissions,
  };
}

export async function createPermission({ key, name, description, moduleId, moduleName, grantToAdmin = true }) {
  await ensureRolePermissionsTable();

  const cleanKey = (key || '').toLowerCase().trim().replace(/[^a-z0-9_:-]/g, '_');
  if (!cleanKey || cleanKey.length < 3) {
    throw new Error('Permission key must be at least 3 characters (e.g. reports:view)');
  }

  const cleanName = (name || '').trim();
  if (!cleanName) {
    throw new Error('Permission display name is required');
  }

  const cleanModuleId = (moduleId || 'custom').toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
  const cleanModuleName = (moduleName || cleanModuleId.toUpperCase()).trim();

  // Check unique key
  const existing = await prisma.$queryRawUnsafe(
    `SELECT id FROM system_permissions WHERE permission_key = ?;`,
    cleanKey
  );
  if (existing.length > 0) {
    throw new Error(`Permission key "${cleanKey}" already exists`);
  }

  const id = crypto.randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO system_permissions (id, permission_key, name, description, module_id, module_name, is_system)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    id, cleanKey, cleanName, (description || '').trim(), cleanModuleId, cleanModuleName, false
  );

  // If grantToAdmin, add this permission key to SUPER_ADMIN role
  if (grantToAdmin) {
    const adminRoleRows = await prisma.$queryRawUnsafe(
      `SELECT permissions FROM role_permissions WHERE role_id = 'SUPER_ADMIN';`
    );
    if (adminRoleRows.length > 0) {
      let adminPerms = [];
      try {
        adminPerms = JSON.parse(adminRoleRows[0].permissions);
      } catch {
        adminPerms = [];
      }
      if (!adminPerms.includes(cleanKey)) {
        adminPerms.push(cleanKey);
        await prisma.$executeRawUnsafe(
          `UPDATE role_permissions SET permissions = ? WHERE role_id = 'SUPER_ADMIN';`,
          JSON.stringify(adminPerms)
        );
      }
    }
  }

  return {
    id,
    key: cleanKey,
    name: cleanName,
    description: (description || '').trim(),
    moduleId: cleanModuleId,
    moduleName: cleanModuleName,
    isSystem: false,
  };
}

export async function updatePermission(idOrKey, { name, description, moduleId, moduleName }) {
  await ensureRolePermissionsTable();

  const existing = await prisma.$queryRawUnsafe(
    `SELECT * FROM system_permissions WHERE id = ? OR permission_key = ?;`,
    idOrKey, idOrKey
  );

  if (existing.length === 0) {
    throw new Error(`Permission not found`);
  }

  const perm = existing[0];
  const cleanName = (name || perm.name).trim();
  const cleanDesc = description !== undefined ? description.trim() : perm.description;
  const cleanModuleId = moduleId ? moduleId.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_') : perm.module_id;
  const cleanModuleName = moduleName ? moduleName.trim() : perm.module_name;

  await prisma.$executeRawUnsafe(
    `UPDATE system_permissions 
     SET name = ?, description = ?, module_id = ?, module_name = ?
     WHERE id = ?;`,
    cleanName, cleanDesc, cleanModuleId, cleanModuleName, perm.id
  );

  return {
    id: perm.id,
    key: perm.permission_key,
    name: cleanName,
    description: cleanDesc,
    moduleId: cleanModuleId,
    moduleName: cleanModuleName,
    isSystem: Boolean(perm.is_system),
  };
}

export async function deletePermission(idOrKey) {
  await ensureRolePermissionsTable();

  const existing = await prisma.$queryRawUnsafe(
    `SELECT * FROM system_permissions WHERE id = ? OR permission_key = ?;`,
    idOrKey, idOrKey
  );

  if (existing.length === 0) {
    throw new Error(`Permission not found`);
  }

  const perm = existing[0];
  const keyToRemove = perm.permission_key;

  // Delete from system_permissions
  await prisma.$executeRawUnsafe(`DELETE FROM system_permissions WHERE id = ?;`, perm.id);

  // Strip this permission key from all roles in role_permissions table
  const allRoles = await prisma.$queryRawUnsafe(`SELECT role_id, permissions FROM role_permissions;`);
  for (const r of allRoles) {
    try {
      let perms = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions;
      if (Array.isArray(perms) && perms.includes(keyToRemove)) {
        perms = perms.filter((k) => k !== keyToRemove);
        await prisma.$executeRawUnsafe(
          `UPDATE role_permissions SET permissions = ? WHERE role_id = ?;`,
          JSON.stringify(perms),
          r.role_id
        );
      }
    } catch (err) {
      console.error('Error stripping deleted permission from role:', err);
    }
  }

  return { success: true, message: `Permission "${keyToRemove}" deleted successfully` };
}
