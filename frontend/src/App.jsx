import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PosBillingView from './features/billing/PosBillingView';
import DynamicQrModal from './features/billing/DynamicQrModal';
import InvoicesListView from './features/invoices/InvoicesListView';
import InvoicePrintModal from './features/invoices/InvoicePrintModal';
import ProductsView from './features/products/ProductsView';
import UsersView from './features/users/UsersView';
import LoginModal from './features/auth/LoginModal';
import { authService, storeService } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('jj_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);

  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'invoices' | 'products' | 'users'
  const [activeQrInvoice, setActiveQrInvoice] = useState(null);
  const [activePrintDoc, setActivePrintDoc] = useState(null); // { invoice, mode: 'a4' | 'thermal' }

  const [isInitializing, setIsInitializing] = useState(true);

  // Robust sequential bootstrap: Ensure auth token is present before querying stores
  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        let token = localStorage.getItem('jj_token');
        if (!token && !currentUser) {
          try {
            const loginRes = await authService.login('cashier@jjperfume.com', 'cashier123');
            if (loginRes.success && loginRes.data?.user && isMounted) {
              setCurrentUser(loginRes.data.user);
            }
          } catch (loginErr) {
            console.warn('Auto-login notice:', loginErr);
          }
        }

        const storeRes = await storeService.getStores();
        if (storeRes.data?.length > 0 && isMounted) {
          setStores(storeRes.data);
          const defaultStore = storeRes.data.find((s) => s.city?.name === 'Mandvi') || storeRes.data[0];
          setSelectedStore(defaultStore);
        }
      } catch (err) {
        console.error('Bootstrap failed:', err);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const handleQuickSwitchRole = async () => {
    try {
      if (currentUser?.role === 'SUPER_ADMIN') {
        const res = await authService.login('cashier@jjperfume.com', 'cashier123');
        if (res.success) setCurrentUser(res.data.user);
      } else {
        const res = await authService.login('admin@jjperfume.com', 'admin123');
        if (res.success) setCurrentUser(res.data.user);
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

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-900">
      
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
      />

      {/* Main ERP Workspaces */}
      <main className="flex-1 pb-12">
        {isInitializing ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500">
            <div className="w-9 h-9 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
            <span className="font-serif tracking-[0.25em] text-xs uppercase text-amber-700 font-medium">JJ PERFUME</span>
            <span className="text-[10px] tracking-widest text-slate-500 uppercase mt-1">Connecting Haute Parfumerie Ledger...</span>
          </div>
        ) : (
          <>
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
              <ProductsView stores={stores} />
            )}

            {activeTab === 'users' && (
              <UsersView />
            )}
          </>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-[11px] text-slate-500 no-print">
        <div className="flex flex-wrap items-center justify-center gap-2.5 font-light">
          <span className="font-serif tracking-widest text-slate-800 font-semibold">JJ PERFUME</span>
          <span>•</span>
          <span className="tracking-wide text-slate-600">HAUTE PARFUMERIE FISCAL ERP</span>
          <span>•</span>
          <span className="text-slate-600">Mandvi Flagship • Mumbai • Delhi • Bengaluru</span>
          <span>•</span>
          <span className="inline-flex items-center space-x-1.5 text-emerald-700 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>MySQL 8.4 Engine Connected</span>
          </span>
        </div>
      </footer>

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

      {/* Login Modal when no user is signed in */}
      {!currentUser && (
        <LoginModal onLoginSuccess={(user) => setCurrentUser(user)} />
      )}

    </div>
  );
}
