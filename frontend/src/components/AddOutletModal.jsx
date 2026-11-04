import React, { useState, useEffect } from 'react';
import { X, MapPin, Building2, Plus, CheckCircle2, AlertCircle, Phone, FileText } from 'lucide-react';
import { storeService } from '../services/api';
import statesAndCitiesData from '../data/statesAndCities.json';

export default function AddOutletModal({ onClose, onStoreCreated, onCityCreated, initialTab = 'store' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --- Tab 1: City Form State ---
  const [selectedState, setSelectedState] = useState('Gujarat');
  const [stateName, setStateName] = useState('Gujarat');
  const [stateCode, setStateCode] = useState('24');
  const [cityName, setCityName] = useState('');
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [customCityName, setCustomCityName] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [cityErrors, setCityErrors] = useState({});
  const [cityTouched, setCityTouched] = useState({});

  // --- Tab 2: Store Form State ---
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

  // Cities for Tab 1
  const currentStateData = statesAndCitiesData.find((s) => s.state === selectedState) || statesAndCitiesData[0];
  const tab1Cities = currentStateData ? currentStateData.cities : [];

  // Cities for Tab 2
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

  // --- Tab 1 Handlers ---
  const handleStateChange = (e) => {
    const newStateName = e.target.value;
    setSelectedState(newStateName);
    setStateName(newStateName);

    const foundState = statesAndCitiesData.find((s) => s.state === newStateName);
    if (foundState) {
      setStateCode(foundState.code);
    }

    setCityName('');
    setIsCustomCity(false);
    setCustomCityName('');
    setJurisdiction('');

    setCityErrors((prev) => ({
      ...prev,
      stateName: undefined,
      stateCode: undefined,
      cityName: undefined,
    }));
  };

  const handleCityChange = (e) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomCity(true);
      setCityName('');
      setCustomCityName('');
      setJurisdiction('');
    } else {
      setIsCustomCity(false);
      setCityName(val);
      setCustomCityName('');
      setJurisdiction(val ? `Subject to ${val} Jurisdiction.` : '');
    }

    if (cityErrors.cityName) {
      setCityErrors((prev) => ({ ...prev, cityName: undefined }));
    }
  };

  const handleCustomCityChange = (e) => {
    const val = e.target.value;
    setCustomCityName(val);
    setCityName(val);
    setJurisdiction(val.trim() ? `Subject to ${val.trim()} Jurisdiction.` : '');

    if (cityErrors.cityName) {
      setCityErrors((prev) => ({ ...prev, cityName: undefined }));
    }
  };

  // --- Tab 2 Handlers ---
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

    setStoreErrors((prev) => ({
      ...prev,
      storeCityName: undefined,
      storeGstin: undefined,
    }));
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

    if (storeErrors.storeCityName) {
      setStoreErrors((prev) => ({ ...prev, storeCityName: undefined }));
    }
  };

  const handleStoreCustomCityChange = (e) => {
    const val = e.target.value;
    setStoreCustomCityName(val);
    setStoreCityName(val);

    if (storeErrors.storeCityName) {
      setStoreErrors((prev) => ({ ...prev, storeCityName: undefined }));
    }
  };

  // --- Strict Validation Functions ---

  // Validate Indian Mobile Number (10 digits starting with 6,7,8,9)
  const validateMobile = (phone) => {
    if (!phone || !phone.trim()) {
      return 'Mobile number is required.';
    }
    const cleanDigits = phone.replace(/\D/g, '');
    let std10 = cleanDigits;
    if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
      std10 = cleanDigits.slice(2);
    } else if (cleanDigits.length === 11 && cleanDigits.startsWith('0')) {
      std10 = cleanDigits.slice(1);
    }

    if (std10.length !== 10) {
      return `Mobile number must be 10 digits (currently ${std10.length}).`;
    }
    if (!/^[6-9]/.test(std10)) {
      return 'Mobile number must start with 6, 7, 8, or 9 (e.g. +91 98765 43210).';
    }
    if (/^(\d)\1{9}$/.test(std10)) {
      return 'Please enter a valid, non-repetitive mobile number.';
    }
    return null;
  };

  // Validate Indian GSTIN (15 characters statutory format with state prefix check)
  const validateGSTIN = (gstin, expectedCode) => {
    if (!gstin || !gstin.trim()) {
      return null; // Optional
    }
    const val = gstin.trim().toUpperCase();
    if (val.length !== 15) {
      return `GSTIN must be exactly 15 characters (currently ${val.length}/15).`;
    }
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(val)) {
      return 'Invalid GSTIN format. Expected: 2 state digits + 10-char PAN + 1 entity + "Z" + 1 check digit (e.g. 24AABCJ1234F1Z5).';
    }
    if (expectedCode && val.slice(0, 2) !== expectedCode) {
      return `GSTIN state prefix "${val.slice(0, 2)}" does not match selected state code "${expectedCode}".`;
    }
    return null;
  };

  // --- Validation Logic for Tab 1 (City) ---
  const validateCity = () => {
    const errors = {};
    const effectiveCity = (isCustomCity ? customCityName : cityName).trim();

    if (!effectiveCity) {
      errors.cityName = 'Please select or enter a city name.';
    } else if (effectiveCity.length < 2) {
      errors.cityName = 'City name must be at least 2 characters.';
    } else if (!/^[a-zA-Z\s.-]+$/.test(effectiveCity)) {
      errors.cityName = 'City name should only contain letters and spaces.';
    } else if (cities.some((c) => c.name.toLowerCase() === effectiveCity.toLowerCase())) {
      errors.cityName = `City "${effectiveCity}" is already registered in the system.`;
    }

    const trimmedState = (stateName || '').trim();
    if (!trimmedState) {
      errors.stateName = 'State is required.';
    } else if (trimmedState.length < 2) {
      errors.stateName = 'State must be at least 2 characters.';
    }

    const trimmedCode = (stateCode || '').trim();
    if (!trimmedCode) {
      errors.stateCode = 'State GST code is required.';
    } else if (!/^\d{2}$/.test(trimmedCode)) {
      errors.stateCode = 'State code must be 2 numeric digits (e.g. 24).';
    }

    if (jurisdiction && jurisdiction.length > 255) {
      errors.jurisdiction = 'Jurisdiction note cannot exceed 255 characters.';
    }

    return errors;
  };

  // --- Validation Logic for Tab 2 (Store) ---
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

    // Mobile validation
    const phoneErr = validateMobile(storePhone);
    if (phoneErr) {
      errors.storePhone = phoneErr;
    }

    // GSTIN validation
    const gstinErr = validateGSTIN(storeGstin, storeStateCode);
    if (gstinErr) {
      errors.storeGstin = gstinErr;
    }

    // UPI ID validation
    const trimmedUpi = (storeUpi || '').trim();
    if (!trimmedUpi) {
      errors.storeUpi = 'Store UPI ID is required for QR billing.';
    } else if (!trimmedUpi.includes('@') || trimmedUpi.length < 5) {
      errors.storeUpi = 'Invalid UPI ID format (e.g. jiperfume@icici). Must contain "@".';
    }

    return errors;
  };

  const handleCreateCity = async (e) => {
    e.preventDefault();
    setCityTouched({ cityName: true, stateName: true, stateCode: true, jurisdiction: true });

    const errors = validateCity();
    setCityErrors(errors);
    if (Object.keys(errors).length > 0) {
      setErrorMsg('Please correct the highlighted errors before saving.');
      return;
    }

    const finalCityName = (isCustomCity ? customCityName : cityName).trim();

    try {
      setSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await storeService.createCity({
        name: finalCityName,
        state: stateName.trim(),
        stateCode: stateCode.trim(),
        jurisdictionText: jurisdiction.trim() || `Subject to ${finalCityName} Jurisdiction.`,
      });

      if (res.success && res.data) {
        setSuccessMsg(`City "${res.data.name}" added successfully! Proceeding to create outlet...`);
        setCityName('');
        setCustomCityName('');
        setIsCustomCity(false);
        setJurisdiction('');
        setCityErrors({});
        setCityTouched({});
        if (onCityCreated) {
          onCityCreated(res.data);
        }
        await fetchCities();
        setStoreState(stateName.trim());
        setStoreStateCode(stateCode.trim());
        setStoreCityName(res.data.name);
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
    setStoreTouched({
      storeCityName: true,
      storeName: true,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto no-scrollbar">
        
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
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 sm:px-6 pt-3.5 flex flex-wrap gap-2 border-b border-slate-100">
          <button
            type="button"
            onClick={() => { setActiveTab('city'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'city'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">1. Add New City</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('store'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'store'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">2. Add Boutique Outlet</span>
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
          {activeTab === 'city' ? (
            <form onSubmit={handleCreateCity} noValidate className="space-y-3.5">
              
              {/* State Dropdown & State Code */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    State / Region *
                  </label>
                  <select
                    value={selectedState}
                    onChange={handleStateChange}
                    onBlur={() => setCityTouched((prev) => ({ ...prev, stateName: true }))}
                    className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer transition ${
                      cityErrors.stateName && cityTouched.stateName
                        ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                        : 'border-slate-200 focus:border-amber-500'
                    }`}
                  >
                    {statesAndCitiesData.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.state} (GST: {s.code})
                      </option>
                    ))}
                  </select>
                  {cityErrors.stateName && cityTouched.stateName && (
                    <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{cityErrors.stateName}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    GST Code *
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={stateCode}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono focus:outline-none cursor-default"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block leading-tight">
                    State Code (GST)
                  </span>
                </div>
              </div>

              {/* City Name Dropdown */}
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  City Name * <span className="text-slate-400 font-normal">(Curated from {selectedState})</span>
                </label>
                <select
                  value={isCustomCity ? '__custom__' : cityName}
                  onChange={handleCityChange}
                  onBlur={() => setCityTouched((prev) => ({ ...prev, cityName: true }))}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none cursor-pointer transition ${
                    cityErrors.cityName && cityTouched.cityName
                      ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                      : 'border-slate-200 focus:border-amber-500'
                  }`}
                >
                  <option value="">-- Choose City in {selectedState} --</option>
                  {tab1Cities.map((ct) => {
                    const isRegistered = cities.some((c) => c.name.toLowerCase() === ct.toLowerCase());
                    return (
                      <option key={ct} value={ct} disabled={isRegistered} className={isRegistered ? 'text-slate-400 bg-slate-100' : 'text-slate-900'}>
                        {ct} {isRegistered ? '✓ (Already Added)' : ''}
                      </option>
                    );
                  })}
                  <option value="__custom__" className="text-amber-700 font-medium">
                    + Enter Other / Custom City...
                  </option>
                </select>

                {isCustomCity && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    <input
                      type="text"
                      autoFocus
                      value={customCityName}
                      onChange={handleCustomCityChange}
                      onBlur={() => setCityTouched((prev) => ({ ...prev, cityName: true }))}
                      placeholder={`Enter custom city name in ${selectedState}...`}
                      className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none transition ${
                        cityErrors.cityName && cityTouched.cityName
                          ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500'
                          : 'border-amber-400 focus:border-amber-500 ring-2 ring-amber-500/10'
                      }`}
                    />
                  </div>
                )}

                {cityErrors.cityName && cityTouched.cityName && (
                  <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{cityErrors.cityName}</span>
                  </p>
                )}
              </div>

              {/* Legal Jurisdiction */}
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Legal Jurisdiction Note <span className="text-slate-400 font-normal">(Printed on Invoice)</span>
                </label>
                <input
                  type="text"
                  maxLength={255}
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  placeholder={`Subject to ${cityName || 'City'} Jurisdiction.`}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-xs transition shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                <span>{submitting ? 'Saving City...' : 'Save City & Proceed to Add Store'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateStore} noValidate className="space-y-3">
              
              {/* Tab 2: State & City Dropdowns powered by JSON data */}
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

              {/* Phone & GSTIN with Strict Validations */}
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
                          // Format nicely on blur
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
          )}
        </div>

      </div>
    </div>
  );
}
