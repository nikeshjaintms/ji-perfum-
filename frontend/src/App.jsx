import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PosBillingView from './features/billing/PosBillingView';
import DynamicQrModal from './features/billing/DynamicQrModal';
import InvoicesListView from './features/invoices/InvoicesListView';
import InvoicePrintModal from './features/invoices/InvoicePrintModal';
import ProductsView from './features/products/ProductsView';
import CategoriesView from './features/categories/CategoriesView';
import UsersView from './features/users/UsersView';
import LoginModal from './features/auth/LoginModal';
import ChangePasswordModal from './features/auth/ChangePasswordModal';
import AddOutletModal from './components/AddOutletModal';
import NewBillModal from './features/billing/NewBillModal';
import { useCart } from './context/CartContext';
import { authService, storeService } from './services/api';

export default function App() {
  const { isCartOpen, closeCart } = useCart();

  // Never assume logged in from localStorage: start as null and verify strictly with server
  const [currentUser, setCurrentUser] = useState(null);

  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);

  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'invoices' | 'products' | 'categories' | 'users'
  const [selectedCategoryInProducts, setSelectedCategoryInProducts] = useState('ALL');
  const [activeQrInvoice, setActiveQrInvoice] = useState(null);
  const [activePrintDoc, setActivePrintDoc] = useState(null); // { invoice, mode: 'a4' | 'thermal' }
  const [isAddOutletOpen, setIsAddOutletOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [isInitializing, setIsInitializing] = useState(true);

  // Global listener for unauthorized (401) events from API calls: instantly lock out unauthenticated users
  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null);
      setStores([]);
      setSelectedStore(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  // Bootstrap session by checking cookie validity with /auth/me
  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const meRes = await authService.getMe();
        if (meRes.success && meRes.data?.user && isMounted) {
          setCurrentUser(meRes.data.user);
          localStorage.setItem('jj_user', JSON.stringify(meRes.data.user));

          const storeRes = await storeService.getStores();
          if (storeRes.data?.length > 0 && isMounted) {
            setStores(storeRes.data);
            const defaultStore = storeRes.data.find((s) => s.city?.name === 'Mandvi') || storeRes.data[0];
            setSelectedStore(defaultStore);
          }
        } else if (isMounted) {
          setCurrentUser(null);
          localStorage.removeItem('jj_user');
        }
      } catch (err) {
        if (isMounted) {
          setCurrentUser(null);
          localStorage.removeItem('jj_user');
        }
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);
    try {
      const storeRes = await storeService.getStores();
      if (storeRes.data?.length > 0) {
        setStores(storeRes.data);
        const defaultStore = storeRes.data.find((s) => s.city?.name === 'Mandvi') || storeRes.data[0];
        setSelectedStore(defaultStore);
      }
    } catch (err) {
      console.error('Failed to load stores after login:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      setCurrentUser(null);
      setStores([]);
      setSelectedStore(null);
    }
  };

  const handleQuickSwitchRole = async () => {
    try {
      const targetEmail = currentUser?.role === 'SUPER_ADMIN' ? 'cashier@jjperfume.com' : 'admin@jjperfume.com';
      const targetPass = currentUser?.role === 'SUPER_ADMIN' ? 'cashier123' : 'admin123';
      const res = await authService.login(targetEmail, targetPass);
      if (res.success && res.data?.user) {
        setCurrentUser(res.data.user);
        await refreshStores();
      }
    } catch (err) {
      console.error('Quick switch error:', err);
    }
  };

  const handleInvoiceCreated = (createdInvoice) => {
    const hasUpiPending = createdInvoice.paymentMethod === 'UPI_QR' || 
      (createdInvoice.paymentMethod === 'SPLIT' && (Number(createdInvoice.splitDetails?.upiAmount || 0) > 0 || !!createdInvoice.qrCode?.upiString));

    if (hasUpiPending) {
      setActiveQrInvoice(createdInvoice);
    } else {
      setActivePrintDoc({ invoice: createdInvoice, mode: 'a4' });
    }
  };

  const refreshStores = async (newStore = null) => {
    try {
      const res = await storeService.getStores();
      if (res.success && res.data) {
        setStores(res.data);
        if (newStore) {
          setSelectedStore(newStore);
        } else if (!selectedStore || !res.data.some((s) => s.id === selectedStore.id)) {
          const defaultStore = res.data.find((s) => s.city?.name === 'Mandvi') || res.data[0];
          setSelectedStore(defaultStore);
        }
      }
    } catch (err) {
      console.error('Failed to refresh stores:', err);
    }
  };

  // 1. Initializing state: warm light paper loader
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center text-slate-700">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-600 rounded-full animate-spin" />
          <p className="text-sm font-medium tracking-wide text-slate-600">Opening the counter…</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state: ZERO pages can be accessed without login
  if (!currentUser) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  // 3. Authenticated ERP application
  return (
    <div className="min-h-screen bg-paper text-slate-900 flex flex-col font-sans overflow-x-hidden">
      
      {/* Navbar with Multi-City Selector & brand identity */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onQuickSwitchRole={handleQuickSwitchRole}
        stores={stores}
        selectedStore={selectedStore}
        onSelectStore={(st) => setSelectedStore(st)}
        onOpenAddOutlet={() => setIsAddOutletOpen(true)}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
      />

      {/* Main ERP Workspaces */}
      <main className="flex-1 pb-10">
        {activeTab === 'pos' && (
          <PosBillingView 
            selectedStore={selectedStore}
            onInvoiceCreated={handleInvoiceCreated} 
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesListView
            stores={stores}
            onOpenQrModal={(inv) => setActiveQrInvoice(inv)}
            onOpenPrintModal={(inv) => setActivePrintDoc({ invoice: inv, mode: 'a4' })}
          />
        )}

        {activeTab === 'products' && (
          <ProductsView 
            stores={stores}
            selectedStore={selectedStore}
            activeCategoryId={selectedCategoryInProducts}
            onSelectCategoryId={setSelectedCategoryInProducts}
            onNavigateToCategoryMaster={() => setActiveTab('categories')}
          />
        )}

        {activeTab === 'categories' && (
          (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'STORE_MANAGER') ? (
            <CategoriesView
              onNavigateToProducts={(catId) => {
                setSelectedCategoryInProducts(catId);
                setActiveTab('products');
              }}
            />
          ) : (
            <div className="py-24 text-center text-sm text-slate-500">
              Access to Category Master is restricted to Store Managers and Owners.
            </div>
          )
        )}

        {activeTab === 'users' && (
          (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'STORE_MANAGER') ? (
            <UsersView />
          ) : (
            <div className="py-24 text-center text-sm text-slate-500">
              Access to Staff Management is restricted to Store Managers and Owners.
            </div>
          )
        )}
      </main>

      {/* Dynamic QR Payment Modal */}
      {activeQrInvoice && (
        <DynamicQrModal
          invoiceData={activeQrInvoice}
          onClose={() => setActiveQrInvoice(null)}
          onPrintInvoice={(inv) => {
            setActiveQrInvoice(null);
            setActivePrintDoc({ invoice: inv, mode: 'a4' });
          }}
          onPrintReceipt={(inv) => {
            setActiveQrInvoice(null);
            setActivePrintDoc({ invoice: inv, mode: 'thermal' });
          }}
        />
      )}

      {/* Printable Invoice & Receipt Modal */}
      {activePrintDoc && (
        <InvoicePrintModal
          invoice={activePrintDoc.invoice}
          mode={activePrintDoc.mode}
          onClose={() => setActivePrintDoc(null)}
        />
      )}

      {/* Add City & Outlet Modal */}
      {isAddOutletOpen && (
        <AddOutletModal
          onClose={() => setIsAddOutletOpen(false)}
          onStoreCreated={(newStore) => {
            refreshStores(newStore);
          }}
        />
      )}

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          currentUser={currentUser}
          onClose={() => setIsChangePasswordOpen(false)}
        />
      )}

      {/* Global New Bill Modal (accessible from any screen) */}
      <NewBillModal
        isOpen={isCartOpen}
        onClose={closeCart}
        selectedStore={selectedStore}
        onInvoiceCreated={handleInvoiceCreated}
        onNavigateToBilling={() => setActiveTab('pos')}
      />

    </div>
  );
}
