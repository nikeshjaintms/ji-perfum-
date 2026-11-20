import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FolderTree, ChevronDown, Check, X, Search } from 'lucide-react';

export default function CategoryMultiSelectDropdown({
  categories = [],
  selectedCategoryIds = [], // Array of string IDs
  onChange, // (newIds: string[]) => void
  allCount = undefined,
  placeholder = 'All Categories',
  className = '',
  buttonClassName = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current && categories.length > 5) {
      searchInputRef.current.focus();
    }
  }, [isOpen, categories.length]);

  // Filter categories by search query inside dropdown
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter((cat) => cat.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  // Are all categories selected? (Empty array or all IDs selected = all)
  const isAllSelected = selectedCategoryIds.length === 0;

  // Toggle single category
  const handleToggleCategory = (catId) => {
    let next;
    if (selectedCategoryIds.includes(catId)) {
      next = selectedCategoryIds.filter((id) => id !== catId);
    } else {
      next = [...selectedCategoryIds, catId];
    }
    onChange(next);
  };

  // Select All (resets to empty array = all)
  const handleSelectAll = () => {
    onChange([]);
  };

  // Clear All
  const handleClear = (e) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  // Trigger button label
  const buttonLabel = useMemo(() => {
    if (isAllSelected) {
      return allCount !== undefined ? `${placeholder} (${allCount})` : placeholder;
    }
    if (selectedCategoryIds.length === 1) {
      const match = categories.find((c) => c.id === selectedCategoryIds[0]);
      return match ? match.name : '1 Category';
    }
    return `${selectedCategoryIds.length} Categories`;
  }, [isAllSelected, selectedCategoryIds, categories, placeholder, allCount]);

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-2 pl-2.5 pr-2 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-lg text-xs font-medium text-slate-800 shadow-2xs transition cursor-pointer focus:outline-none max-w-[210px] sm:max-w-[260px] ${
          !isAllSelected ? 'bg-amber-50/70 border-amber-300 text-amber-950 font-semibold' : ''
        } ${buttonClassName}`}
        title={buttonLabel}
      >
        <FolderTree className={`w-3.5 h-3.5 shrink-0 ${!isAllSelected ? 'text-amber-700' : 'text-amber-600'}`} />
        
        <span className="truncate flex-1 text-left min-w-0">
          {buttonLabel}
        </span>

        {/* Selected Count Badge if > 1 */}
        {!isAllSelected && selectedCategoryIds.length > 1 && (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white shrink-0">
            {selectedCategoryIds.length}
          </span>
        )}

        {/* Quick Clear Icon when filtered */}
        {!isAllSelected && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            className="p-0.5 hover:bg-amber-200/60 rounded-full text-amber-800 hover:text-amber-950 transition cursor-pointer"
            title="Reset to All Categories"
          >
            <X className="w-3 h-3" />
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-amber-600' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 mt-1.5 w-64 sm:w-72 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-xs divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header Controls: Search & Select All / Reset */}
          <div className="pb-2 space-y-1.5">
            {categories.length > 5 && (
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter categories..."
                  className="w-full pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] px-1">
              <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                {selectedCategoryIds.length === 0 ? 'All Selected' : `${selectedCategoryIds.length} Selected`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={`cursor-pointer font-semibold transition ${
                    isAllSelected ? 'text-amber-600' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All
                </button>
                {!isAllSelected && (
                  <>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-rose-600 hover:text-rose-800 cursor-pointer font-medium"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Category List with Custom Multi-Select Checkboxes */}
          <div className="py-1 max-h-56 overflow-y-auto space-y-0.5 no-scrollbar">
            {/* "All Fragrances" Option */}
            <button
              type="button"
              onClick={handleSelectAll}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                isAllSelected
                  ? 'bg-amber-50/80 text-amber-900 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                    isAllSelected
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span className="truncate">All Fragrances</span>
              </div>
              {allCount !== undefined && (
                <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
                  {allCount}
                </span>
              )}
            </button>

            {/* Individual Categories */}
            {filteredCategories.map((cat) => {
              const isChecked = selectedCategoryIds.includes(cat.id);
              const count = cat._count?.products;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleToggleCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer ${
                    isChecked
                      ? 'bg-amber-50/80 text-amber-900 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        isChecked
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="truncate">{cat.name}</span>
                  </div>
                  {count !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full shrink-0 ${
                        isChecked ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}

            {filteredCategories.length === 0 && (
              <div className="py-4 text-center text-slate-400 text-xs">
                No categories match "{searchQuery}"
              </div>
            )}
          </div>

          {/* Footer with Apply button */}
          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {isAllSelected ? 'Showing all' : `${selectedCategoryIds.length} of ${categories.length} filtered`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
