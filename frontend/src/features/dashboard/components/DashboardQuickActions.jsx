import React from 'react';
import { ShoppingBag, Plus, PackageCheck, Receipt, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hasPermission } from '../../../utils/permissions';

export default function DashboardQuickActions({
  currentUser,
  onOpenNewBill,
  onNavigateTab,
}) {
  const navigate = useNavigate();

  const canBill = hasPermission(currentUser, 'billing:create');
  const canAddProduct = hasPermission(currentUser, 'products:create');
  const canManageStock = hasPermission(currentUser, 'products:stock');
  const canViewInvoices = hasPermission(currentUser, 'invoices:view');
  const canManageUsers = hasPermission(currentUser, 'users:manage');

  const actions = [
    {
      label: 'New POS Bill',
      icon: ShoppingBag,
      allowed: canBill,
      color: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20',
      action: () => navigate('/billing'),
    },
    {
      label: 'Add Fragrance',
      icon: Plus,
      allowed: canAddProduct,
      color: 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20',
      action: () => {
        if (onNavigateTab) onNavigateTab('products');
        else navigate('/admin/products');
      },
    },
    {
      label: 'Inventory Stock In',
      icon: PackageCheck,
      allowed: canManageStock,
      color: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-sm',
      action: () => {
        if (onNavigateTab) onNavigateTab('products');
        else navigate('/admin/products');
      },
    },
    {
      label: 'Sales Invoices',
      icon: Receipt,
      allowed: canViewInvoices,
      color: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-sm',
      action: () => navigate('/invoices'),
    },
    {
      label: 'Manage Staff',
      icon: Users,
      allowed: canManageUsers,
      color: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-sm',
      action: () => {
        if (onNavigateTab) onNavigateTab('users');
        else navigate('/admin/users');
      },
    },
  ];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider pr-2 border-r border-slate-200 hidden sm:inline">
          Quick Shortcuts:
        </span>
        {actions.filter((a) => a.allowed).map((act, idx) => {
          const Icon = act.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={act.action}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shadow transition-all cursor-pointer ${act.color}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{act.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
