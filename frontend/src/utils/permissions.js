/**
 * Check if the current user possesses a specific capability permission.
 * Super Admin (Owner) has unrestricted access to all permissions.
 */
export function hasPermission(user, permissionKey) {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permissionKey);
}

/**
 * Check if the user has at least one of the specified permissions.
 */
export function hasAnyPermission(user, permissionKeys = []) {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return permissionKeys.some((k) => hasPermission(user, k));
}

