import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DataTable from '../../components/DataTable';
import {
  Building2,
  Store,
  MapPin,
  Plus,
  RefreshCw,
  Phone,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Globe2,
  Check,
  Search,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { storeService } from '../../services/api';
import AddOutletModal from '../../components/AddOutletModal';
import { hasPermission } from '../../utils/permissions';

export default function OutletsView({ onStoreCreated = null, currentUser = null }) {
  const canManageStores = hasPermission(currentUser, 'stores:manage');
  const [activeSubTab, setActiveSubTab] = useState('stores'); // 'stores' | 'cities'

  // Stores State
  const [stores, setStores] = useState([]);
  const [loadingStores, setLoadingStores] = useState(false);
  const [storesSearch, setStoresSearch] = useState('');
  const [storeSortConfig, setStoreSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Cities State
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [citiesSearch, setCitiesSearch] = useState('');
  const [citySortConfig, setCitySortConfig] = useState({ key: 'name', direction: 'asc' });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState('store'); // 'store' | 'city'

  // Delete Store State
  const [isDeleteStoreModalOpen, setIsDeleteStoreModalOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState(null);
  const [deletingStore, setDeletingStore] = useState(false);
  const [deleteStoreError, setDeleteStoreError] = useState('');

  // Delete City State
  const [isDeleteCityModalOpen, setIsDeleteCityModalOpen] = useState(false);
  const [cityToDelete, setCityToDelete] = useState(null);
  const [deletingCity, setDeletingCity] = useState(false);
  const [deleteCityError, setDeleteCityError] = useState('');

  const fetchStores = useCallback(async () => {
    if (currentUser && !hasPermission(currentUser, 'stores:view')) {
      setLoadingStores(false);
      return;
    }
    try {
      setLoadingStores(true);
      const res = await storeService.getStores();
      if (res.success && res.data) {
        setStores(res.data);
      }
    } catch (err) {
      console.error('Failed to load stores:', err);
    } finally {
      setLoadingStores(false);
    }
  }, [currentUser]);

  const fetchCities = useCallback(async () => {
    if (currentUser && !hasPermission(currentUser, 'stores:view')) {
      setLoadingCities(false);
      return;
    }
    try {
      setLoadingCities(true);
      const res = await storeService.getCities();
      if (res.success && res.data) {
        setCities(res.data);
      }
    } catch (err) {
      console.error('Failed to load cities:', err);
    } finally {
      setLoadingCities(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchStores();
    fetchCities();
  }, [fetchStores, fetchCities]);

  const handleOpenAddOutlet = () => {
    setModalInitialTab('store');
    setIsModalOpen(true);
  };

  const handleOpenAddCity = () => {
    setModalInitialTab('city');
    setIsModalOpen(true);
  };

  const handleModalStoreCreated = (newStore) => {
    fetchStores();
    fetchCities();
    if (onStoreCreated) {
      onStoreCreated(newStore);
    }
  };

  const handleModalCityCreated = () => {
    fetchCities();
    fetchStores();
  };

  const handleOpenDeleteStoreModal = (store) => {
    setStoreToDelete(store);
    setDeleteStoreError('');
    setIsDeleteStoreModalOpen(true);
  };

  const handleConfirmDeleteStore = async () => {
    if (!storeToDelete) return;
    try {
      setDeletingStore(true);
      setDeleteStoreError('');
      await storeService.deleteStore(storeToDelete.id);
      setIsDeleteStoreModalOpen(false);
      setStoreToDelete(null);
      fetchStores();
      fetchCities();
      if (onStoreCreated) {
        onStoreCreated();
      }
    } catch (err) {
      setDeleteStoreError(err.response?.data?.message || 'Failed to delete store outlet');
    } finally {
      setDeletingStore(false);
    }
  };

  const handleOpenDeleteCityModal = (city) => {
    setCityToDelete(city);
    setDeleteCityError('');
    setIsDeleteCityModalOpen(true);
  };

  const handleConfirmDeleteCity = async () => {
    if (!cityToDelete) return;
    try {
      setDeletingCity(true);
      setDeleteCityError('');
      await storeService.deleteCity(cityToDelete.id);
      setIsDeleteCityModalOpen(false);
      setCityToDelete(null);
      fetchCities();
      fetchStores();
    } catch (err) {
      setDeleteCityError(err.response?.data?.message || 'Failed to delete city');
    } finally {
      setDeletingCity(false);
    }
  };

  // Filtered Stores
  const filteredStores = useMemo(() => {
    if (!storesSearch.trim()) return stores;
    const q = storesSearch.toLowerCase().trim();
    return stores.filter((s) => {
      const name = (s.name || '').toLowerCase();
      const code = (s.code || '').toLowerCase();
      const cityName = (s.city?.name || '').toLowerCase();
      const stateName = (s.city?.state || '').toLowerCase();
      const address = (s.address || '').toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      const gstin = (s.gstin || '').toLowerCase();
      return (
        name.includes(q) ||
        code.includes(q) ||
        cityName.includes(q) ||
        stateName.includes(q) ||
        address.includes(q) ||
        phone.includes(q) ||
        gstin.includes(q)
      );
    });
  }, [stores, storesSearch]);

  // Filtered Cities
  const filteredCities = useMemo(() => {
    if (!citiesSearch.trim()) return cities;
    const q = citiesSearch.toLowerCase().trim();
    return cities.filter((c) => {
      const name = (c.name || '').toLowerCase();
      const state = (c.state || '').toLowerCase();
      const stateCode = (c.stateCode || '').toLowerCase();
      const jurisdiction = (c.jurisdictionText || '').toLowerCase();
      return (
        name.includes(q) ||
        state.includes(q) ||
        stateCode.includes(q) ||
        jurisdiction.includes(q)
      );
    });
  }, [cities, citiesSearch]);

  // Store Columns
  const storeColumns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Outlet Name',
        sortAccessor: (s) => s.name,
        sortable: true,
        className: 'min-w-[200px]',
        render: (_, store) => (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-serif font-medium text-slate-900 block truncate">
                {store.name}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 border border-slate-200 mt-0.5">
                {store.code}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'city',
        header: 'City & State',
        sortAccessor: (s) => s.city?.name || '',
        sortable: true,
        className: 'whitespace-nowrap',
        headerClassName: 'whitespace-nowrap',
        render: (_, store) => (
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-medium text-slate-900 text-xs">
              {store.city?.name || 'N/A'}
            </span>
            {store.city?.state && (
              <span className="text-slate-500 text-xs font-light">
                ({store.city.state})
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'address',
        header: 'Address',
        accessor: 'address',
        sortable: false,
        className: 'max-w-xs truncate text-xs text-slate-600 font-light',
        render: (val) => val || '—',
      },
      {
        key: 'phone',
        header: 'Phone / Mobile',
        accessor: 'phone',
        sortable: false,
        className: 'tabular-nums text-xs text-slate-700 whitespace-nowrap',
        headerClassName: 'whitespace-nowrap',
        render: (val) =>
          val ? (
            <span className="inline-flex items-center space-x-1">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{val}</span>
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        key: 'gstin',
        header: 'GSTIN',
        accessor: 'gstin',
        sortable: true,
        className: 'tabular-nums font-mono text-xs whitespace-nowrap',
        headerClassName: 'whitespace-nowrap',
        render: (val) =>
          val ? (
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
              {val}
            </span>
          ) : (
            <span className="text-slate-400 text-xs">Unregistered</span>
          ),
      },
      {
        key: 'upiId',
        header: 'UPI QR ID',
        accessor: 'upiId',
        sortable: false,
        className: 'tabular-nums font-mono text-xs text-slate-600 whitespace-nowrap',
        headerClassName: 'whitespace-nowrap',
        render: (val) =>
          val ? (
            <span className="inline-flex items-center space-x-1 text-slate-700">
              <CreditCard className="w-3 h-3 text-amber-600" />
              <span>{val}</span>
            </span>
          ) : (
            '—'
          ),
      },
      {
        key: 'isRetailCounter',
        header: 'Counter Type',
        sortable: false,
        className: 'whitespace-nowrap',
        headerClassName: 'whitespace-nowrap',
        render: (val) =>
          val !== false ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
              Retail Counter
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              Warehouse / Hub
            </span>
          ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: false,
        className: 'whitespace-nowrap',
        headerClassName: 'whitespace-nowrap',
        render: (_, store) =>
          store.isActive !== false ? (
            <span className="inline-flex items-center space-x-1.5 text-emerald-600 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Active</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1.5 text-slate-400 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
              <span>Inactive</span>
            </span>
          ),
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        align: 'right',
        className: 'whitespace-nowrap',
        headerClassName: 'whitespace-nowrap',
        render: (_, store) => (
          <div className="flex items-center justify-end space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            {canManageStores ? (
              <button
                type="button"
                onClick={() => handleOpenDeleteStoreModal(store)}
                className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                title={`Delete ${store.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 italic">View Only</span>
            )}
          </div>
        ),
      },
    ],
    [canManageStores]
  );

  // City Columns
  const cityColumns = useMemo(
    () => [
      {
        key: 'name',
        header: 'City Name',
        sortAccessor: (c) => c.name,
        sortable: true,
        className: 'min-w-[160px]',
        render: (_, city) => (
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <span className="font-serif font-medium text-slate-900 text-sm">
              {city.name}
            </span>
          </div>
        ),
      },
      {
        key: 'state',
        header: 'State',
        accessor: 'state',
        sortable: true,
        className: 'text-slate-700 text-xs font-medium whitespace-nowrap',
        headerClassName: 'whitespace-nowrap',
      },
      {
        key: 'stateCode',
        header: 'GST State Code',
        accessor: 'stateCode',
        sortable: true,
        className: 'whitespace-nowrap',
        headerClassName: 'whitespace-nowrap',
        render: (val) => (
          <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            {val || '—'}
          </span>
        ),
      },
      {
        key: 'jurisdictionText',
        header: 'Statutory Jurisdiction Clause',
        accessor: 'jurisdictionText',
        sortable: false,
        className: 'text-xs text-slate-600 italic font-serif max-w-sm truncate',
        render: (val) => val || 'Subject to Local Jurisdiction.',
      },
      {
        key: 'storesCount',
        header: 'Registered Outlets',
        sortAccessor: (c) => (c.stores ? c.stores.length : 0),
        sortable: true,
        className: 'whitespace-nowrap',
        headerClassName: 'whitespace-nowrap',
        render: (_, city) => {
          const count = city.stores ? city.stores.length : 0;
          return (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200">
              <Store className="w-3 h-3 text-amber-600 shrink-0" />
              <span>
                {count} {count === 1 ? 'Outlet' : 'Outlets'}
              </span>
            </span>
          );
        },
      },
      {
        key: 'createdAt',
        header: 'Created On',
        accessor: 'createdAt',
        sortable: true,
        className: 'tabular-nums text-slate-500 font-light text-xs whitespace-nowrap',
        headerClassName: 'whitespace-nowrap',
        render: (val) =>
          val
            ? new Date(val).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '—',
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        align: 'right',
        className: 'whitespace-nowrap',
        headerClassName: 'whitespace-nowrap',
        render: (_, city) => (
          <div className="flex items-center justify-end space-x-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            {canManageStores ? (
              <button
                type="button"
                onClick={() => handleOpenDeleteCityModal(city)}
                className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                title={`Delete ${city.name}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 italic">View Only</span>
            )}
          </div>
        ),
      },
    ],
    [canManageStores]
  );

  return (
    <div className="max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-700">
              <Building2 className="w-4 h-4" />
            </div>
            <h2 className="text-2xl font-serif font-semibold text-slate-900">
              Outlet & City Master
            </h2>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Configure boutique counters, billing outlets, GSTIN registrations, and operational cities.
          </p>
        </div>

        {/* Action Buttons */}
        {canManageStores && (
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={handleOpenAddCity}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-md text-xs font-semibold transition shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Add City</span>
            </button>

            <button
              onClick={handleOpenAddOutlet}
              className="flex-1 sm:flex-initial px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-semibold transition shadow-md flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Add Outlet</span>
            </button>
          </div>
        )}
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 mb-6 pb-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveSubTab('stores')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'stores'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5 shrink-0" />
            <span>Boutique Outlets</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                activeSubTab === 'stores'
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {stores.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('cities')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-2 ${
              activeSubTab === 'cities'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>Operating Cities</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                activeSubTab === 'cities'
                  ? 'bg-white/25 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {cities.length}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchStores();
            fetchCities();
          }}
          title="Refresh Outlets & Cities"
          className="p-1.5 sm:p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 shadow-2xs transition cursor-pointer shrink-0"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loadingStores || loadingCities ? 'animate-spin text-amber-500' : ''}`}
          />
        </button>
      </div>

      {/* Main Content Areas */}
      {activeSubTab === 'stores' ? (
        <DataTable
          columns={storeColumns}
          data={filteredStores}
          loading={loadingStores}
          serverSide={false}
          searchValue={storesSearch}
          onSearchChange={setStoresSearch}
          sortConfig={storeSortConfig}
          onSortChange={setStoreSortConfig}
          searchPlaceholder="Search outlet name, code, city, GSTIN, phone..."
          defaultPageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyIcon={Store}
          emptyMessage="No boutique outlets found"
          emptySubtext="Use 'Add Outlet' to configure your first boutique counter."
          initialSort={{ key: 'name', direction: 'asc' }}
        />
      ) : (
        <DataTable
          columns={cityColumns}
          data={filteredCities}
          loading={loadingCities}
          serverSide={false}
          searchValue={citiesSearch}
          onSearchChange={setCitiesSearch}
          sortConfig={citySortConfig}
          onSortChange={setCitySortConfig}
          searchPlaceholder="Search city name, state, GST code, jurisdiction..."
          defaultPageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyIcon={MapPin}
          emptyMessage="No cities found"
          emptySubtext="Use 'Add City' to create state and city tax jurisdiction hubs."
          initialSort={{ key: 'name', direction: 'asc' }}
        />
      )}

      {/* Add City & Outlet Modal */}
      {isModalOpen && (
        <AddOutletModal
          initialTab={modalInitialTab}
          onClose={() => setIsModalOpen(false)}
          onStoreCreated={handleModalStoreCreated}
          onCityCreated={handleModalCityCreated}
        />
      )}

      {/* Delete Store Confirmation Modal */}
      {isDeleteStoreModalOpen && storeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-900 my-auto">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-slate-900">
                  Delete Boutique Outlet
                </h3>
                <p className="text-xs text-slate-500">Remove outlet location</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-900">{storeToDelete.name}</span> (<span className="text-slate-700 font-mono">{storeToDelete.code}</span>) in {storeToDelete.city?.name || 'Main Hub'}?
            </p>

            <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-normal">
              <strong>Note:</strong> Outlets with assigned staff cannot be removed until staff are reassigned. Outlets with past sales invoices will be archived to preserve tax invoices.
            </p>

            {deleteStoreError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{deleteStoreError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteStoreModalOpen(false);
                  setStoreToDelete(null);
                  setDeleteStoreError('');
                }}
                disabled={deletingStore}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStore}
                disabled={deletingStore}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 shadow-sm disabled:opacity-60"
              >
                {deletingStore && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{deletingStore ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete City Confirmation Modal */}
      {isDeleteCityModalOpen && cityToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-900 my-auto">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-semibold text-slate-900">
                  Delete City
                </h3>
                <p className="text-xs text-slate-500">Remove statutory city hub</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-slate-900">{cityToDelete.name}</span> ({cityToDelete.state})?
            </p>

            {cityToDelete.stores && cityToDelete.stores.length > 0 && (
              <p className="text-[11px] text-amber-700 mt-2 bg-amber-50 p-2.5 rounded-lg border border-amber-200 leading-normal">
                <strong>Warning:</strong> This city currently has <strong>{cityToDelete.stores.length}</strong> registered outlet(s). You must delete or reassign all outlets in {cityToDelete.name} before this city can be deleted.
              </p>
            )}

            {deleteCityError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{deleteCityError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteCityModalOpen(false);
                  setCityToDelete(null);
                  setDeleteCityError('');
                }}
                disabled={deletingCity}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCity}
                disabled={deletingCity}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 shadow-sm disabled:opacity-60"
              >
                {deletingCity && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{deletingCity ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

