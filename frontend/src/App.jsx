import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import Navbar from './components/Navbar';
import AdminSidebar from './features/admin/AdminSidebar';
import AdminHeader from './features/admin/AdminHeader';
import PosBillingView from './features/billing/PosBillingView';
import DynamicQrModal from './features/billing/DynamicQrModal';
import InvoicesListView from './features/invoices/InvoicesListView';
import InvoicePrintModal from './features/invoices/InvoicePrintModal';
import AdminPanelView from './features/admin/AdminPanelView';
import ProductsView from './features/products/ProductsView';
import CategoriesView from './features/categories/CategoriesView';
import OutletsView from './features/outlets/OutletsView';
import LoginModal from './features/auth/LoginModal';
import ChangePasswordModal from './features/auth/ChangePasswordModal';
import AddOutletModal from './components/AddOutletModal';
import NewBillModal from './features/billing/NewBillModal';
import { useCart } from './context/CartContext';
import { authService, storeService } from './services/api';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { hasPermission, hasAnyPermission } from './utils/permissions';

// Helper to determine the first accessible admin master for a user
export function getFirstAllowedAdminTab(user) {
  if (hasPermission(user, 'dashboard:view')) return 'dashboard';
  if (hasPermission(user, 'products:view')) return 'products';
  if (hasPermission(user, 'categories:view')) return 'categories';
  if (hasPermission(user, 'stores:view')) return 'outlets';
  if (hasPermission(user, 'users:view')) return 'users';
  if (hasPermission(user, 'roles:view')) return 'roles';
  return null;
}

// Helper to determine the default landing route based on active permissions
export function getDefaultUserRoute(user) {
  if (!user) return '/login';
  // Admin users (SUPER_ADMIN, STORE_MANAGER) land in the Admin Portal (defaulting to /admin/dashboard)
  if (user.role === 'SUPER_ADMIN' || user.role === 'STORE_MANAGER') {
    const firstAdmin = getFirstAllowedAdminTab(user);
    return `/admin/${firstAdmin || 'dashboard'}`;
  }
  // User Section (CASHIER and counter staff) always stays in retail counter operations
  if (hasPermission(user, 'billing:create')) return '/billing';
  if (hasPermission(user, 'invoices:view')) return '/invoices';
  return '/billing';
}

// Dedicated component for route access restrictions (e.g. /invoices without invoices:view)
function RouteAccessDeniedView({
  currentUser,
  routeName,
  requiredPermission,
  fallbackPath = '/billing',
  fallbackLabel = 'Return to Counter',
  onLogout,
}) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-sm my-12">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-8 h-8" />
      </div>
      <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 mb-3">
        403 Forbidden • Route Restricted
      </span>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied to {routeName}</h2>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        Your account ({currentUser?.email} • {currentUser?.role}) does not have the required <code className="px-2 py-0.5 bg-slate-100 text-rose-700 rounded font-mono text-[11px] font-bold">{requiredPermission}</code> permission to access this route.
      </p>
      <p className="text-[11px] text-slate-400 mb-6">
        Please contact your system administrator or Owner to grant this capability in the Roles & Permissions Master.
      </p>
      <div className="flex items-center justify-center gap-3">
        {fallbackPath && (
          <button
            onClick={() => navigate(fallbackPath)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs transition cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{fallbackLabel}</span>
          </button>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs transition cursor-pointer"
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}

// Dedicated component for unauthorized access to admin portal
function AdminRestrictedView({ currentUser, onReturn, onLogout }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Admin Portal Restricted</h1>
      <p className="text-sm text-slate-400 max-w-md mb-6">
        Your account ({currentUser?.email} • {currentUser?.role}) is designated for Retail POS Counter operations and does not possess administrative privileges.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={onReturn}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to POS Counter</span>
        </button>
        <button
          onClick={onLogout}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

// Dedicated component for distinct Admin master routes (/admin/products, /admin/categories, /admin/outlets, /admin/users, /admin/roles)
function AdminPortalRoute({
  currentUser,
  handleLogout,
  stores,
  selectedStore,
  setSelectedStore,
  refreshStores,
  isSidebarOpen,
  setIsSidebarOpen,
  setIsChangePasswordOpen,
  selectedCategoryInProducts,
  setSelectedCategoryInProducts,
}) {
  const { masterTab } = useParams();
  const navigate = useNavigate();

  const validMasters = ['dashboard', 'products', 'categories', 'outlets', 'users', 'roles'];
  const activeMaster = validMasters.includes(masterTab) ? masterTab : 'dashboard';

  const handleSelectMaster = (m) => {
    navigate(`/admin/${m}`);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-slate-100/70 text-slate-900 font-sans relative">
      {/* Fixed Sticky Left Sidebar with Collapsible Open / Close */}
      <AdminSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        activeMaster={activeMaster}
        onSelectMaster={handleSelectMaster}
        currentUser={currentUser}
        onLogout={() => handleLogout('/admin/login')}
        stores={stores}
        selectedStore={selectedStore}
        onSelectStore={(st) => setSelectedStore(st)}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
      />

      {/* Right Main Content Area: Independent Vertical Scroll */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto min-w-0 w-full">
        <AdminHeader
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          activeMaster={activeMaster}
          currentUser={currentUser}
          onLogout={() => handleLogout('/admin/login')}
          stores={stores}
          selectedStore={selectedStore}
          onSelectStore={(st) => setSelectedStore(st)}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
        />

        <main className="flex-1 pb-16">
          <AdminPanelView
            activeMaster={activeMaster}
            onMasterChange={handleSelectMaster}
            stores={stores}
            selectedStore={selectedStore}
            currentUser={currentUser}
            onStoreCreated={(newStore) => refreshStores(newStore)}
            selectedCategoryInProducts={selectedCategoryInProducts}
            onSelectCategoryInProducts={setSelectedCategoryInProducts}
          />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isCartOpen, closeCart } = useCart();

  const [currentUser, setCurrentUser] = useState(null);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);

  const [adminActiveMaster, setAdminActiveMaster] = useState('products');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const [selectedCategoryInProducts, setSelectedCategoryInProducts] = useState('ALL');
  const [activeQrInvoice, setActiveQrInvoice] = useState(null);
  const [activePrintDoc, setActivePrintDoc] = useState(null);
  const [isAddOutletOpen, setIsAddOutletOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Responsive sidebar listener: auto-collapse when crossing to mobile (<1024px), auto-expand when crossing to desktop (>=1024px)
  useEffect(() => {
    let prevWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      if (prevWidth >= 1024 && currentWidth < 1024) {
        setIsSidebarOpen(false);
      } else if (prevWidth < 1024 && currentWidth >= 1024) {
        setIsSidebarOpen(true);
      }
      prevWidth = currentWidth;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global 401 Unauthorized listener
  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null);
      setStores([]);
      setSelectedStore(null);
      if (location.pathname.startsWith('/admin')) {
        navigate('/admin/login');
      } else {
        navigate('/login');
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [location.pathname, navigate]);

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
            const userStore = meRes.data.user?.assignedStoreId
              ? storeRes.data.find((s) => s.id === meRes.data.user.assignedStoreId)
              : null;
            const defaultStore = userStore || storeRes.data.find((s) => s.city?.name === 'Mandvi') || storeRes.data[0];
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
        const userStore = user?.assignedStoreId
          ? storeRes.data.find((s) => s.id === user.assignedStoreId)
          : null;
        const defaultStore = userStore || storeRes.data.find((s) => s.city?.name === 'Mandvi') || storeRes.data[0];
        setSelectedStore(defaultStore);
      }
    } catch (err) {
      console.error('Failed to load stores after login:', err);
    }
  };

  const handleLogout = async (redirectPath = '/login') => {
    try {
      await authService.logout();
    } finally {
      setCurrentUser(null);
      setStores([]);
      setSelectedStore(null);
      navigate(redirectPath);
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

  const isAdminUser = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'STORE_MANAGER';

  // Initializing state
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center text-slate-700">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-600 rounded-full animate-spin" />
          <p className="text-sm font-medium tracking-wide text-slate-600">Opening the counter…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans overflow-x-hidden">
      <Routes>
        {/* ============================================================ */}
        {/* ADMIN PORTAL LOGIN ROUTE (/admin/login) */}
        {/* ============================================================ */}
        <Route
          path="/admin/login"
          element={
            currentUser && isAdminUser ? (
              <Navigate to={`/admin/${getFirstAllowedAdminTab(currentUser) || 'dashboard'}`} replace />
            ) : (
              <LoginModal
                portalType="admin"
                onLoginSuccess={handleLoginSuccess}
              />
            )
          }
        />

        {/* ============================================================ */}
        {/* ADMIN PORTAL ROOT (/admin) -> REDIRECTS TO FIRST ALLOWED MASTER */}
        {/* ============================================================ */}
        <Route
          path="/admin"
          element={
            !currentUser ? (
              <Navigate to="/admin/login" replace />
            ) : !isAdminUser ? (
              <AdminRestrictedView
                currentUser={currentUser}
                onReturn={() => navigate(getDefaultUserRoute(currentUser))}
                onLogout={() => handleLogout('/admin/login')}
              />
            ) : (
              <Navigate to={`/admin/${getFirstAllowedAdminTab(currentUser) || 'dashboard'}`} replace />
            )
          }
        />

        {/* ============================================================ */}
        {/* ADMIN PORTAL MASTERS ROUTE (/admin/:masterTab) */}
        {/* Distinct URLs: /admin/products, /admin/categories, /admin/outlets, /admin/users, /admin/roles */}
        {/* ============================================================ */}
        <Route
          path="/admin/:masterTab"
          element={
            !currentUser ? (
              <Navigate to="/admin/login" replace />
            ) : !isAdminUser ? (
              <AdminRestrictedView
                currentUser={currentUser}
                onReturn={() => navigate(getDefaultUserRoute(currentUser))}
                onLogout={() => handleLogout('/admin/login')}
              />
            ) : (
              <AdminPortalRoute
                currentUser={currentUser}
                handleLogout={handleLogout}
                stores={stores}
                selectedStore={selectedStore}
                setSelectedStore={setSelectedStore}
                refreshStores={refreshStores}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                setIsChangePasswordOpen={setIsChangePasswordOpen}
                selectedCategoryInProducts={selectedCategoryInProducts}
                setSelectedCategoryInProducts={setSelectedCategoryInProducts}
              />
            )
          }
        />

        {/* ============================================================ */}
        {/* STAFF / CASHIER LOGIN ROUTE (/login) */}
        {/* ============================================================ */}
        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate to={getDefaultUserRoute(currentUser)} replace />
            ) : (
              <LoginModal
                portalType="staff"
                onLoginSuccess={handleLoginSuccess}
              />
            )
          }
        />

        {/* ============================================================ */}
        {/* STAFF / CASHIER ROUTE: POS BILLING COUNTER (/billing) */}
        {/* ============================================================ */}
        <Route
          path="/billing"
          element={
            !currentUser ? (
              <Navigate to="/login" replace />
            ) : !hasPermission(currentUser, 'billing:create') ? (
              <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col">
                <Navbar
                  currentUser={currentUser}
                  onLogout={() => handleLogout('/login')}
                  stores={stores}
                  selectedStore={selectedStore}
                  onSelectStore={(st) => setSelectedStore(st)}
                  onOpenChangePassword={() => setIsChangePasswordOpen(true)}
                />
                <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
                  <RouteAccessDeniedView
                    currentUser={currentUser}
                    routeName="Billing (POS) Counter"
                    requiredPermission="billing:create"
                    fallbackPath={getDefaultUserRoute(currentUser)}
                    fallbackLabel={hasPermission(currentUser, 'invoices:view') ? 'Go to Invoices' : 'Go to Admin Portal'}
                    onLogout={() => handleLogout('/login')}
                  />
                </main>
              </div>
            ) : (
              <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col">
                <Navbar
                  currentUser={currentUser}
                  onLogout={() => handleLogout('/login')}
                  stores={stores}
                  selectedStore={selectedStore}
                  onSelectStore={(st) => setSelectedStore(st)}
                  onOpenChangePassword={() => setIsChangePasswordOpen(true)}
                />
                <main className="flex-1 pb-10">
                  <PosBillingView 
                    selectedStore={selectedStore}
                    currentUser={currentUser}
                    onInvoiceCreated={handleInvoiceCreated} 
                  />
                </main>
              </div>
            )
          }
        />

        {/* ============================================================ */}
        {/* STAFF / USER ROUTE: PRODUCTS MASTER (/products) */}
        {/* ============================================================ */}
        <Route
          path="/products"
          element={
            !currentUser ? (
              <Navigate to="/login" replace />
            ) : (!hasPermission(currentUser, 'products:view') && !hasPermission(currentUser, 'products:create')) ? (
              <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col">
                <Navbar
                  currentUser={currentUser}
                  onLogout={() => handleLogout('/login')}
                  stores={stores}
                  selectedStore={selectedStore}
                  onSelectStore={(st) => setSelectedStore(st)}
                  onOpenChangePassword={() => setIsChangePasswordOpen(true)}
                />
                <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
                  <RouteAccessDeniedView
                    currentUser={currentUser}
                    routeName="Products Master"
                    requiredPermission="products:view"
                    fallbackPath={getDefaultUserRoute(currentUser)}
                    fallbackLabel="Return to Counter"
                    onLogout={() => handleLogout('/login')}
                  />
                </main>
              </div>
            ) : (
              <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col">
                <Navbar
                  currentUser={currentUser}
                  onLogout={() => handleLogout('/login')}
                  stores={stores}
                  selectedStore={selectedStore}
                  onSelectStore={(st) => setSelectedStore(st)}
                  onOpenChangePassword={() => setIsChangePasswordOpen(true)}
                />
                <main className="flex-1 max-w-[1700px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-5">
                  <ProductsView
                    stores={stores}
                    selectedStore={selectedStore}
                    currentUser={currentUser}
                    activeCategoryId={selectedCategoryInProducts}
                    onSelectCategoryId={setSelectedCategoryInProducts}
                    onNavigateToCategoryMaster={() => navigate('/categories')}
                  />
                </main>
              </div>
            )
          }
        />

        {/* ============================================================ */}
        {/* STAFF / USER ROUTE: CATEGORIES MASTER (/categories) */}
        {/* ============================================================ */}
        <Route
          path="/categories"
          element={
            !currentUser ? (
              <Navigate to="/login" replace />
            ) : (!hasPermission(currentUser, 'categories:view') && !hasPermission(currentUser, 'categories:manage')) ? (
              <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col">
                <Navbar
                  currentUser={currentUser}
                  onLogout={() => handleLogout('/login')}
                  stores={stores}
                  selectedStore={selectedStore}
                  onSelectStore={(st) => setSelectedStore(st)}
                  onOpenChangePassword={() => setIsChangePasswordOpen(true)}
                />
                <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
                  <RouteAccessDeniedView
                    currentUser={currentUser}
                    routeName="Category Master"
                    requiredPermission="categories:view"
                    fallbackPath={getDefaultUserRoute(currentUser)}
                    fallbackLabel="Return to Counter"
                    onLogout={() => handleLogout('/login')}
                  />
                </main>
              </div>
            ) : (
              <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col">
                <Navbar
                  currentUser={currentUser}
                  onLogout={() => handleLogout('/login')}
                  stores={stores}
                  selectedStore={selectedStore}
                  onSelectStore={(st) => setSelectedStore(st)}
                  onOpenChangePassword={() => setIsChangePasswordOpen(true)}
                />
                <main className="flex-1 max-w-[1700px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-5">
                  <CategoriesView
                    currentUser={currentUser}
                    onNavigateToProducts={(catId) => {
                      setSelectedCategoryInProducts(catId);
                      navigate('/products');
                    }}
                  />
                </main>
              </div>
            )
          }
        />

        {/* ============================================================ */}
        {/* STAFF / USER ROUTE: OUTLET & STORE MASTER (/outlets) */}
        {/* ============================================================ */}
        <Route
          path="/outlets"
          element={
            !currentUser ? (
              <Navigate to="/login" replace />
            ) : (!hasPermission(currentUser, 'stores:view') && !hasPermission(currentUser, 'stores:manage')) ? (
              <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col">
                <Navbar
                  currentUser={currentUser}
                  onLogout={() => handleLogout('/login')}
                  stores={stores}
                  selectedStore={selectedStore}
                  onSelectStore={(st) => setSelectedStore(st)}
                  onOpenChangePassword={() => setIsChangePasswordOpen(true)}
                />
                <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
                  <RouteAccessDeniedView
                    currentUser={currentUser}
                    routeName="Outlet & Store Master"
                    requiredPermission="stores:view"
                    fallbackPath={getDefaultUserRoute(currentUser)}
                    fallbackLabel="Return to Counter"
                    onLogout={() => handleLogout('/login')}
                  />
                </main>
              </div>
            ) : (
              <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col">
                <Navbar
                  currentUser={currentUser}
                  onLogout={() => handleLogout('/login')}
                  stores={stores}
                  selectedStore={selectedStore}
                  onSelectStore={(st) => setSelectedStore(st)}
                  onOpenChangePassword={() => setIsChangePasswordOpen(true)}
                />
                <main className="flex-1 max-w-[1700px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-5">
                  <OutletsView
                    currentUser={currentUser}
                    onStoreCreated={(newStore) => {
                      refreshStores();
                    }}
                  />
                </main>
              </div>
            )
          }
        />

        {/* Alias /pos -> Redirects to /billing */}
        <Route
          path="/pos"
          element={<Navigate to="/billing" replace />}
        />

        {/* Root (/) -> Redirects to default accessible route */}
        <Route
          path="/"
          element={
            !currentUser ? (
              <Navigate to="/login" replace />
            ) : (
              <Navigate to={getDefaultUserRoute(currentUser)} replace />
            )
          }
        />

        {/* ============================================================ */}
        {/* STAFF / CASHIER ROUTE: INVOICES & RECEIPTS (/invoices) */}
        {/* ============================================================ */}
        <Route
          path="/invoices"
          element={
            !currentUser ? (
              <Navigate to="/login" replace />
            ) : !hasPermission(currentUser, 'invoices:view') ? (
              <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col">
                <Navbar
                  currentUser={currentUser}
                  onLogout={() => handleLogout('/login')}
                  stores={stores}
                  selectedStore={selectedStore}
                  onSelectStore={(st) => setSelectedStore(st)}
                  onOpenChangePassword={() => setIsChangePasswordOpen(true)}
                />
                <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
                  <RouteAccessDeniedView
                    currentUser={currentUser}
                    routeName="Invoices & Receipts"
                    requiredPermission="invoices:view"
                    fallbackPath={getDefaultUserRoute(currentUser)}
                    fallbackLabel={hasPermission(currentUser, 'billing:create') ? 'Return to Billing (POS)' : 'Go to Admin Portal'}
                    onLogout={() => handleLogout('/login')}
                  />
                </main>
              </div>
            ) : (
              <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col">
                <Navbar
                  currentUser={currentUser}
                  onLogout={() => handleLogout('/login')}
                  stores={stores}
                  selectedStore={selectedStore}
                  onSelectStore={(st) => setSelectedStore(st)}
                  onOpenChangePassword={() => setIsChangePasswordOpen(true)}
                />
                <main className="flex-1 pb-10">
                  <InvoicesListView
                    stores={stores}
                    currentUser={currentUser}
                    onOpenQrModal={(inv) => setActiveQrInvoice(inv)}
                    onOpenPrintModal={(inv) => setActivePrintDoc({ invoice: inv, mode: 'a4' })}
                  />
                </main>
              </div>
            )
          }
        />

        {/* Admin 404 fallback */}
        <Route
          path="/admin/*"
          element={<Navigate to="/admin/dashboard" replace />}
        />

        {/* Catch-all */}
        <Route
          path="*"
          element={<Navigate to="/billing" replace />}
        />
      </Routes>

      {/* Global Modals */}
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

      {/* Global New Bill Modal */}
      <NewBillModal
        isOpen={isCartOpen}
        onClose={closeCart}
        selectedStore={selectedStore}
        currentUser={currentUser}
        onInvoiceCreated={handleInvoiceCreated}
        onNavigateToBilling={() => navigate('/')}
      />
    </div>
  );
}
