import React, { useState, useEffect } from 'react';
import { X, MapPin, Building2, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { storeService } from '../services/api';

export default function AddOutletModal({ onClose, onStoreCreated }) {
  const [activeTab, setActiveTab] = useState('city'); // 'city' | 'store'
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // City form
  const [cityName, setCityName] = useState('');
  const [stateName, setStateName] = useState('Gujarat');
  const [stateCode, setStateCode] = useState('24');
  const [jurisdiction, setJurisdiction] = useState('');

  // Store form
  const [selectedCityId, setSelectedCityId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeGstin, setStoreGstin] = useState('');
  const [storeUpi, setStoreUpi] = useState('jiperfume@icici');

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      setLoading(true);
      const res = await storeService.getCities();
      if (res.success && res.data) {
        setCities(res.data);
        if (res.data.length > 0 && !selectedCityId) {
          setSelectedCityId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load cities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCity = async (e) => {
    e.preventDefault();
    if (!cityName.trim()) {
      setErrorMsg('Please enter a city name.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await storeService.createCity({
        name: cityName.trim(),
        state: stateName.trim(),
        stateCode: stateCode.trim(),
        jurisdictionText: jurisdiction.trim() || `Subject to ${cityName.trim()} Jurisdiction.`,
      });

      if (res.success && res.data) {
        setSuccessMsg(`City "${res.data.name}" added successfully! You can now create a boutique outlet in this city.`);
        setCityName('');
        setJurisdiction('');
        await fetchCities();
        setSelectedCityId(res.data.id);
        setTimeout(() => {
          setActiveTab('store');
          setSuccessMsg('');
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to create city.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    if (!storeName.trim() || !selectedCityId) {
      setErrorMsg('Store name and city selection are required.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await storeService.createStore({
        name: storeName.trim(),
        cityId: selectedCityId,
        address: storeAddress.trim(),
        phone: storePhone.trim() || '+91 98765 43210',
        gstin: storeGstin.trim() || null,
        upiId: storeUpi.trim() || 'jiperfume@icici',
      });

      if (res.success && res.data) {
        setSuccessMsg(`Boutique Outlet "${res.data.name}" added successfully!`);
        if (onStoreCreated) {
          onStoreCreated(res.data);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to create store outlet.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="bg-slate-50/80 p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-700 flex items-center justify-center">
              {activeTab === 'city' ? <MapPin className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-amber-600 font-semibold block">
                Multi-City Architecture
              </span>
              <h3 className="text-base font-serif text-slate-900 font-bold">
                Add City & Boutique Outlet
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-4 flex space-x-2 border-b border-slate-100">
          <button
            onClick={() => { setActiveTab('city'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition ${
              activeTab === 'city'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>1. Add New City</span>
          </button>
          <button
            onClick={() => { setActiveTab('store'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition ${
              activeTab === 'store'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>2. Add Boutique Outlet</span>
          </button>
        </div>

        {/* Alert Messages */}
        <div className="px-6 pt-3">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Body Form */}
        <div className="p-6 pt-3">
          {activeTab === 'city' ? (
            <form onSubmit={handleCreateCity} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  City Name * (e.g. Ahmedabad, Surat, Jaipur, Dubai)
                </label>
                <input
                  type="text"
                  required
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  placeholder="Enter city name..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">State</label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="Gujarat"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">State Code (GST)</label>
                  <input
                    type="text"
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    placeholder="24"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Legal Jurisdiction Note (Printed on Invoice)
                </label>
                <input
                  type="text"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  placeholder={`Subject to ${cityName || 'City'} Jurisdiction.`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs transition shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{submitting ? 'Saving City...' : 'Save City & Proceed to Add Store'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateStore} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Select City *</label>
                <select
                  value={selectedCityId}
                  onChange={(e) => setSelectedCityId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer"
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Boutique / Outlet Name * (e.g. Ahmedabad Sindhu Bhavan Flagship)
                </label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. Heritage Perfume Galleria"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Address</label>
                <input
                  type="text"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="Street address, shop number, area..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={storeGstin}
                    onChange={(e) => setStoreGstin(e.target.value)}
                    placeholder="24AABCJ1234F1Z5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Store UPI ID for Dynamic QR</label>
                <input
                  type="text"
                  value={storeUpi}
                  onChange={(e) => setStoreUpi(e.target.value)}
                  placeholder="jiperfume@icici"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs transition shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{submitting ? 'Creating Outlet...' : 'Create Boutique Outlet'}</span>
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
