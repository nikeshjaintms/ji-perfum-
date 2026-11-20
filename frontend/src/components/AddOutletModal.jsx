import React, { useState, useEffect } from 'react';
import { X, Building2, Plus, CheckCircle2, AlertCircle, Phone, FileText } from 'lucide-react';
import { storeService } from '../services/api';
import statesAndCitiesData from '../data/statesAndCities.json';

export default function AddOutletModal({ onClose, onStoreCreated }) {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Store Form State
  const [storeState, setStoreState] = useState('Gujarat');
  const [storeStateCode, setStoreStateCode] = useState('24');
  const [storeCityName, setStoreCityName] = useState('');
  const [isStoreCustomCity, setIsStoreCustomCity] = useState(false);
  const [storeCustomCityName, setStoreCustomCityName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeGstin, setStoreGstin] = useState('');
  const [storeUpi, setStoreUpi] = useState('jiperfume@icici');
  const [storeErrors, setStoreErrors] = useState({});
  const [storeTouched, setStoreTouched] = useState({});

  // Cities for current selected state
  const currentStoreStateData = statesAndCitiesData.find((s) => s.state === storeState) || statesAndCitiesData[0];
  const tab2Cities = currentStoreStateData ? currentStoreStateData.cities : [];

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      setLoading(true);
      const res = await storeService.getCities();
      if (res.success && res.data) {
        setCities(res.data);
      }
    } catch (err) {
      console.error('Failed to load cities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreStateChange = (e) => {
    const newState = e.target.value;
    setStoreState(newState);
    const found = statesAndCitiesData.find((s) => s.state === newState);
    if (found) {
      setStoreStateCode(found.code);
    }
    setStoreCityName('');
    setIsStoreCustomCity(false);
    setStoreCustomCityName('');
    setStoreErrors((prev) => ({ ...prev, storeCityName: undefined }));
  };

  const handleStoreCityChange = (e) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsStoreCustomCity(true);
      setStoreCityName('');
      setStoreCustomCityName('');
    } else {
      setIsStoreCustomCity(false);
      setStoreCityName(val);
      setStoreCustomCityName('');
    }
    setStoreErrors((prev) => ({ ...prev, storeCityName: undefined }));
  };

  const handleStoreCustomCityChange = (e) => {
    setStoreCustomCityName(e.target.value);
    if (storeErrors.storeCityName) {
      setStoreErrors((prev) => ({ ...prev, storeCityName: undefined }));
    }
  };

  const validateMobile = (phone) => {
    const cleanDigits = (phone || '').replace(/\D/g, '');
    let std10 = cleanDigits;
    if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
      std10 = cleanDigits.slice(2);
    } else if (cleanDigits.length === 11 && cleanDigits.startsWith('0')) {
      std10 = cleanDigits.slice(1);
    }
    if (!std10) {
      return 'Mobile number is required.';
    }
    if (std10.length !== 10) {
      return 'Mobile number must be exactly 10 digits.';
    }
    if (!/^[6-9]/.test(std10)) {
      return 'Mobile number must start with 6, 7, 8, or 9.';
    }
    return undefined;
  };

  const validateGSTIN = (gstin, expectedCode) => {
    const trimmed = (gstin || '').trim().toUpperCase();
    if (!trimmed) {
      return undefined; // Optional
    }
    if (trimmed.length !== 15) {
      return 'GSTIN must be exactly 15 characters long.';
    }
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(trimmed)) {
      return 'Invalid GSTIN structure (Format: 22AAAAA0000A1Z5).';
    }
    if (expectedCode && !trimmed.startsWith(expectedCode)) {
      return `First 2 digits of GSTIN must match State GST code (${expectedCode}) for ${storeState}.`;
    }
    return undefined;
  };

  const validateStore = () => {
    const errors = {};
    const effectiveCity = (isStoreCustomCity ? storeCustomCityName : storeCityName).trim();

    if (!effectiveCity) {
      errors.storeCityName = 'Please select a city from the list.';
    } else if (effectiveCity.length < 2) {
      errors.storeCityName = 'City name must be at least 2 characters.';
    }

    const trimmedName = (storeName || '').trim();
    if (!trimmedName) {
      errors.storeName = 'Boutique / Outlet name is required.';
    } else if (trimmedName.length < 3) {
      errors.storeName = 'Outlet name must be at least 3 characters.';
    }

    const trimmedAddress = (storeAddress || '').trim();
    if (!trimmedAddress) {
      errors.storeAddress = 'Store address is required.';
    } else if (trimmedAddress.length < 5) {
      errors.storeAddress = 'Please enter a complete address (min 5 characters).';
    }

    const phoneErr = validateMobile(storePhone);
    if (phoneErr) {
      errors.storePhone = phoneErr;
    }

    const gstinErr = validateGSTIN(storeGstin, storeStateCode);
    if (gstinErr) {
      errors.storeGstin = gstinErr;
    }

    const trimmedUpi = (storeUpi || '').trim();
    if (!trimmedUpi) {
      errors.storeUpi = 'Store UPI ID is required for QR billing.';
    } else if (!trimmedUpi.includes('@') || trimmedUpi.length < 5) {
      errors.storeUpi = 'Invalid UPI ID format (e.g. jiperfume@icici). Must contain "@".';
    }

    return errors;
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setStoreTouched({
      storeName: true,
      storeCityName: true,
      storeAddress: true,
      storePhone: true,
      storeGstin: true,
      storeUpi: true,
    });

    const errors = validateStore();
    setStoreErrors(errors);
    if (Object.keys(errors).length > 0) {
      setErrorMsg('Please correct the highlighted errors before submitting.');
      return;
    }

    const effectiveCity = (isStoreCustomCity ? storeCustomCityName : storeCityName).trim();
    const existingDbCity = cities.find((c) => c.name.toLowerCase() === effectiveCity.toLowerCase());

    try {
      setSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await storeService.createStore({
        name: storeName.trim(),
        cityId: existingDbCity?.id || undefined,
        cityName: effectiveCity,
        state: storeState,
        stateCode: storeStateCode,
        address: storeAddress.trim(),
        phone: storePhone.trim(),
        gstin: storeGstin.trim().toUpperCase() || null,
        upiId: storeUpi.trim() || 'jiperfume@icici',
      });

      if (res.success && res.data) {
        setSuccessMsg(`Boutique Outlet "${res.data.name}" added successfully!`);
        setStoreErrors({});
        setStoreTouched({});
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-amber-600 font-semibold block">
                Boutique Counter Setup
              </span>
              <h3 className="text-base font-serif text-slate-900 font-bold">
                Add Boutique Outlet
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alert Messages */}
        <div className="px-6 pt-3">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Body Form */}
        <div className="p-4 sm:p-6 pt-3">
          <form onSubmit={handleCreateStore} noValidate className="space-y-3.5">
            {/* State & City Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  State / Region *
                </label>
                <select
                  value={storeState}
                  onChange={handleStoreStateChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer"
                >
                  {statesAndCitiesData.map((s) => (
                    <option key={s.state} value={s.state}>
                      {s.state} (GST: {s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Select City * <span className="text-slate-400 font-normal">({storeState})</span>
                </label>
                <select
                  value={isStoreCustomCity ? '__custom__' : storeCityName}
                  onChange={handleStoreCityChange}
                  onBlur={() => setStoreTouched((prev) => ({ ...prev, storeCityName: true }))}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer transition ${
                    storeErrors.storeCityName && storeTouched.storeCityName
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                      : 'border-slate-200 focus:border-amber-500'
                  }`}
                >
                  <option value="">-- Choose City in {storeState} --</option>
                  {tab2Cities.map((ct) => (
                    <option key={ct} value={ct}>
                      {ct}
                    </option>
                  ))}
                  <option value="__custom__" className="text-amber-700 font-medium">
                    + Enter Other / Custom City...
                  </option>
                </select>

                {isStoreCustomCity && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    <input
                      type="text"
                      autoFocus
                      value={storeCustomCityName}
                      onChange={handleStoreCustomCityChange}
                      onBlur={() => setStoreTouched((prev) => ({ ...prev, storeCityName: true }))}
                      placeholder={`Enter custom city name in ${storeState}...`}
                      className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none transition ${
                        storeErrors.storeCityName && storeTouched.storeCityName
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                          : 'border-amber-400 focus:border-amber-500 ring-2 ring-amber-500/10'
                      }`}
                    />
                  </div>
                )}

                {storeErrors.storeCityName && storeTouched.storeCityName && (
                  <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{storeErrors.storeCityName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Outlet Name */}
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Boutique / Outlet Name * <span className="text-slate-400 font-normal">(e.g. Heritage Perfume Galleria)</span>
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => {
                  setStoreName(e.target.value);
                  if (storeErrors.storeName) {
                    setStoreErrors((prev) => ({ ...prev, storeName: undefined }));
                  }
                }}
                onBlur={() => setStoreTouched((prev) => ({ ...prev, storeName: true }))}
                placeholder="e.g. Heritage Perfume Galleria"
                className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none transition ${
                  storeErrors.storeName && storeTouched.storeName
                    ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                    : 'border-slate-200 focus:border-amber-500'
                }`}
              />
              {storeErrors.storeName && storeTouched.storeName && (
                <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{storeErrors.storeName}</span>
                </p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Store Address *</label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => {
                  setStoreAddress(e.target.value);
                  if (storeErrors.storeAddress) {
                    setStoreErrors((prev) => ({ ...prev, storeAddress: undefined }));
                  }
                }}
                onBlur={() => setStoreTouched((prev) => ({ ...prev, storeAddress: true }))}
                placeholder="Shop number, commercial complex, street, area..."
                className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none transition ${
                  storeErrors.storeAddress && storeTouched.storeAddress
                    ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                    : 'border-slate-200 focus:border-amber-500'
                }`}
              />
              {storeErrors.storeAddress && storeTouched.storeAddress && (
                <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{storeErrors.storeAddress}</span>
                </p>
              )}
            </div>

            {/* Phone & GSTIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Mobile Number */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 block">
                    Mobile Number *
                  </label>
                  <span className="text-[10px] text-slate-400">10 Digits</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="tel"
                    value={storePhone}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setStorePhone(raw);
                      if (storeErrors.storePhone) {
                        setStoreErrors((prev) => ({ ...prev, storePhone: undefined }));
                      }
                    }}
                    onBlur={() => {
                      setStoreTouched((prev) => ({ ...prev, storePhone: true }));
                      const err = validateMobile(storePhone);
                      if (err) {
                        setStoreErrors((prev) => ({ ...prev, storePhone: err }));
                      } else {
                        const cleanDigits = storePhone.replace(/\D/g, '');
                        const std10 = cleanDigits.length === 12 ? cleanDigits.slice(2) : cleanDigits.length === 11 ? cleanDigits.slice(1) : cleanDigits;
                        if (std10.length === 10) {
                          setStorePhone(`+91 ${std10.slice(0, 5)} ${std10.slice(5)}`);
                        }
                      }
                    }}
                    placeholder="+91 98765 43210"
                    className={`w-full pl-8 pr-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none font-mono transition ${
                      storeErrors.storePhone && storeTouched.storePhone
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                        : 'border-slate-200 focus:border-amber-500'
                    }`}
                  />
                </div>
                {storeErrors.storePhone && storeTouched.storePhone && (
                  <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{storeErrors.storePhone}</span>
                  </p>
                )}
              </div>

              {/* GSTIN */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 block">
                    GSTIN <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <span className={`text-[10px] font-mono ${storeGstin.length === 15 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    {storeGstin.length}/15
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    maxLength={15}
                    value={storeGstin}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setStoreGstin(val);
                      if (storeErrors.storeGstin) {
                        setStoreErrors((prev) => ({ ...prev, storeGstin: undefined }));
                      }
                    }}
                    onBlur={() => {
                      setStoreTouched((prev) => ({ ...prev, storeGstin: true }));
                      const err = validateGSTIN(storeGstin, storeStateCode);
                      if (err) {
                        setStoreErrors((prev) => ({ ...prev, storeGstin: err }));
                      }
                    }}
                    placeholder={`${storeStateCode}AABCJ1234F1Z5`}
                    className={`w-full pl-8 pr-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none font-mono uppercase tracking-wider transition ${
                      storeErrors.storeGstin && storeTouched.storeGstin
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                        : 'border-slate-200 focus:border-amber-500'
                    }`}
                  />
                </div>
                {storeErrors.storeGstin && storeTouched.storeGstin && (
                  <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{storeErrors.storeGstin}</span>
                  </p>
                )}
              </div>
            </div>

            {/* UPI ID */}
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Store UPI ID for Dynamic QR *
              </label>
              <input
                type="text"
                value={storeUpi}
                onChange={(e) => {
                  setStoreUpi(e.target.value);
                  if (storeErrors.storeUpi) {
                    setStoreErrors((prev) => ({ ...prev, storeUpi: undefined }));
                  }
                }}
                onBlur={() => setStoreTouched((prev) => ({ ...prev, storeUpi: true }))}
                placeholder="jiperfume@icici"
                className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none font-mono transition ${
                  storeErrors.storeUpi && storeTouched.storeUpi
                    ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                    : 'border-slate-200 focus:border-amber-500'
                }`}
              />
              {storeErrors.storeUpi && storeTouched.storeUpi && (
                <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{storeErrors.storeUpi}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs transition shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? 'Creating Outlet...' : 'Create Boutique Outlet'}</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
