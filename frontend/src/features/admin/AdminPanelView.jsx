import React from 'react';
import DashboardView from '../dashboard/DashboardView';
import ProductsView from '../products/ProductsView';
import CategoriesView from '../categories/CategoriesView';
import OutletsView from '../outlets/OutletsView';
import UsersView from '../users/UsersView';
import RolesPermissionsView from './RolesPermissionsView';
import { hasPermission } from '../../utils/permissions';
import { Lock } from 'lucide-react';

export const ADMIN_MASTERS = [
  { id: 'dashboard', label: 'Executive Dashboard', requiredPermission: 'dashboard:view' },
  { id: 'products', label: 'Products Master', requiredPermission: 'products:view' },
  { id: 'categories', label: 'Category Master', requiredPermission: 'categories:view' },
  { id: 'outlets', label: 'Outlet & Store Master', requiredPermission: 'stores:view' },
  { id: 'users', label: 'Users Master', requiredPermission: 'users:view' },
  { id: 'roles', label: 'Roles & Permissions Master', requiredPermission: 'roles:view' },
];

function PermissionDeniedNotice({ masterName, requiredPermission }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm my-8">
      <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">Access Restricted</h3>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        Your role does not have the required <code className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[11px]">{requiredPermission}</code> permission to access <strong>{masterName}</strong>.
      </p>
      <p className="text-[11px] text-slate-400">
        Contact your system administrator or Owner to request access in the Roles & Permissions Master.
      </p>
    </div>
  );
}

export default function AdminPanelView({
  activeMaster = 'products',
  onMasterChange,
  stores = [],
  selectedStore = null,
  currentUser = null,
  onStoreCreated = null,
  selectedCategoryInProducts = 'ALL',
  onSelectCategoryInProducts = null,
}) {
  return (
    <div className="max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 py-5">
      {/* Master View Area with live permission enforcement */}
      {activeMaster === 'dashboard' && (
        !hasPermission(currentUser, 'dashboard:view') ? (
          <PermissionDeniedNotice masterName="Executive Dashboard" requiredPermission="dashboard:view" />
        ) : (
          <DashboardView
            currentUser={currentUser}
            stores={stores}
            selectedStore={selectedStore}
            onNavigateTab={onMasterChange}
          />
        )
      )}

      {activeMaster === 'products' && (
        !hasPermission(currentUser, 'products:view') ? (
          <PermissionDeniedNotice masterName="Products Master" requiredPermission="products:view" />
        ) : (
          <ProductsView
            stores={stores}
            selectedStore={selectedStore}
            currentUser={currentUser}
            activeCategoryId={selectedCategoryInProducts}
            onSelectCategoryId={onSelectCategoryInProducts}
            onNavigateToCategoryMaster={() => onMasterChange && onMasterChange('categories')}
          />
        )
      )}

      {activeMaster === 'categories' && (
        (!hasPermission(currentUser, 'categories:view') && !hasPermission(currentUser, 'categories:manage')) ? (
          <PermissionDeniedNotice masterName="Category Master" requiredPermission="categories:view" />
        ) : (
          <CategoriesView
            currentUser={currentUser}
            onNavigateToProducts={(catId) => {
              if (onSelectCategoryInProducts) onSelectCategoryInProducts(catId);
              if (onMasterChange) onMasterChange('products');
            }}
          />
        )
      )}

      {activeMaster === 'outlets' && (
        (!hasPermission(currentUser, 'stores:view') && !hasPermission(currentUser, 'stores:manage')) ? (
          <PermissionDeniedNotice masterName="Outlet & Store Master" requiredPermission="stores:view" />
        ) : (
          <OutletsView
            currentUser={currentUser}
            onStoreCreated={(newStore) => {
              if (onStoreCreated) onStoreCreated(newStore);
            }}
          />
        )
      )}

      {activeMaster === 'users' && (
        !hasPermission(currentUser, 'users:view') ? (
          <PermissionDeniedNotice masterName="Users Master" requiredPermission="users:view" />
        ) : (
          <UsersView currentUser={currentUser} />
        )
      )}

      {activeMaster === 'roles' && (
        !hasPermission(currentUser, 'roles:view') ? (
          <PermissionDeniedNotice masterName="Roles & Permissions Master" requiredPermission="roles:view" />
        ) : (
          <RolesPermissionsView
            currentUser={currentUser}
            onNavigateToUsers={() => onMasterChange && onMasterChange('users')}
          />
        )
      )}
    </div>
  );
}
