import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

/**
 * Universal DataTable Component for JJ Perfume ERP
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  searchPlaceholder = 'Search records...',
  searchable = true,
  searchFields = null,
  pagination = true,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  initialSort = { key: null, direction: 'asc' },
  onRowClick = null,
  rowClassName = null,
  emptyIcon: EmptyIcon = FolderOpen,
  emptyMessage = 'No records found',
  emptySubtext = 'Try adjusting your filters or search keywords.',
  toolbarLeft = null,
  toolbarRight = null,
  containerClassName = '',
  searchValue: controlledSearchValue = null,
  onSearchChange: controlledOnSearchChange = null,
}) {
  const [internalSearch, setInternalSearch] = useState('');
  const [sortConfig, setSortConfig] = useState(initialSort);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const safeColumns = useMemo(() => (Array.isArray(columns) ? columns : []), [columns]);

  const isControlledSearch = controlledSearchValue !== null;
  const searchQuery = isControlledSearch ? controlledSearchValue : internalSearch;

  // Reset page when search or data length changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  // Extract cell value helper
  const getCellValue = (row, col) => {
    if (!row || !col) return '';
    try {
      if (typeof col.accessor === 'function') {
        return col.accessor(row);
      }
      if (typeof col.accessor === 'string') {
        return row[col.accessor];
      }
      if (col.key && row[col.key] !== undefined) {
        return row[col.key];
      }
    } catch {
      return '';
    }
    return '';
  };

  // 1. Filtered Data (Global Client-side Search)
  const filteredData = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) {
      return safeData;
    }

    const query = searchQuery.toLowerCase().trim();

    return safeData.filter((row) => {
      if (!row) return false;

      // If custom searchFields provided
      if (Array.isArray(searchFields) && searchFields.length > 0) {
        return searchFields.some((field) => {
          let val = '';
          try {
            if (typeof field === 'function') {
              val = field(row);
            } else if (typeof field === 'string') {
              val = field.split('.').reduce((acc, part) => (acc ? acc[part] : ''), row);
            }
          } catch {
            val = '';
          }
          return String(val ?? '').toLowerCase().includes(query);
        });
      }

      // Default: Search across all column values and stringifiable row properties
      const matchesColumn = safeColumns.some((col) => {
        const val = getCellValue(row, col);
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      });

      if (matchesColumn) return true;

      // Fallback check on common entity properties
      const commonFields = [
        row.name,
        row.sku,
        row.barcode,
        row.invoiceNumber,
        row.email,
        row.phone,
        row.customer?.name,
        row.customer?.phone,
        row.store?.name,
        row.brand,
        row.category?.name
      ];
      return commonFields.some((f) => f && String(f).toLowerCase().includes(query));
    });
  }, [safeData, searchQuery, searchFields, safeColumns]);

  // 2. Sorted Data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    const column = safeColumns.find((c) => (c.key || c.accessor) === sortConfig.key);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      let valA, valB;

      try {
        if (typeof column.sortAccessor === 'function') {
          valA = column.sortAccessor(a);
          valB = column.sortAccessor(b);
        } else {
          valA = getCellValue(a, column);
          valB = getCellValue(b, column);
        }
      } catch {
        valA = '';
        valB = '';
      }

      // Handle nulls
      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';

      // Number comparison
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }

      // Parse string numbers (e.g. monetary amounts or numbers stored as strings)
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valB !== 'boolean' && valA !== '' && valB !== '') {
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }

      // Date comparison
      const dateA = Date.parse(valA);
      const dateB = Date.parse(valB);
      if (!isNaN(dateA) && !isNaN(dateB) && typeof valA === 'string' && (valA.includes('-') || valA.includes('/'))) {
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }

      // String comparison
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      const comparison = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig, safeColumns]);

  // 3. Paginated Data
  const totalItems = sortedData.length;
  const totalPages = pagination ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, pagination, safeCurrentPage, pageSize]);

  // Handlers
  const handleSort = (col) => {
    if (col.sortable === false) return;
    const key = col.key || col.accessor;
    if (!key) return;

    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: null, direction: 'asc' }; // reset to unsorted
      }
      return { key, direction: 'asc' };
    });
  };

  const handleSearchInputChange = (e) => {
    const val = e.target.value;
    if (controlledOnSearchChange) {
      controlledOnSearchChange(val);
    } else {
      setInternalSearch(val);
    }
  };

  const handleClearSearch = () => {
    if (controlledOnSearchChange) {
      controlledOnSearchChange('');
    } else {
      setInternalSearch('');
    }
  };

  // Generate pagination page numbers
  const getPageNumbers = () => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safeCurrentPage - delta && i <= safeCurrentPage + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, totalItems);

  return (
    <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col ${containerClassName}`}>
      
      {/* Table Toolbar */}
      {(searchable || toolbarLeft || toolbarRight) && (
        <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left Toolbar (Search or custom filters) */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
            {searchable && (
              <div className="relative flex-1 max-w-sm min-w-[180px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 focus:border-amber-500 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-colors shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            {toolbarLeft}
          </div>

          {/* Right Toolbar */}
          {toolbarRight && (
            <div className="flex items-center gap-2">
              {toolbarRight}
            </div>
          )}
        </div>
      )}

      {/* Table Scroll Area */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse min-w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold text-slate-600 tracking-wide select-none">
              {safeColumns.map((col, idx) => {
                const key = col.key || col.accessor || idx;
                const isSortable = col.sortable !== false && (col.key || col.accessor);
                const isSorted = sortConfig.key === (col.key || col.accessor);
                const alignClass = 
                  col.align === 'right' ? 'text-right justify-end' :
                  col.align === 'center' ? 'text-center justify-center' :
                  'text-left justify-start';

                return (
                  <th
                    key={key}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => isSortable && handleSort(col)}
                    className={`py-3 px-3.5 whitespace-nowrap ${col.headerClassName || ''} ${
                      isSortable ? 'cursor-pointer hover:bg-slate-100/80 transition-colors' : ''
                    }`}
                  >
                    <div className={`flex items-center space-x-1.5 ${alignClass}`}>
                      <span className="font-semibold text-slate-700">{col.header}</span>
                      {isSortable && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            sortConfig.direction === 'asc' ? (
                              <ChevronUp className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-40 hover:opacity-100 transition-opacity" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={Math.max(1, safeColumns.length)} className="py-20 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2.5 opacity-80" />
                  <span className="text-xs text-slate-500 font-light">Loading data records...</span>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={Math.max(1, safeColumns.length)} className="py-16 text-center text-slate-500">
                  <EmptyIcon className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-60" />
                  <p className="font-serif text-sm text-slate-700">{emptyMessage}</p>
                  {emptySubtext && (
                    <p className="text-xs text-slate-400 mt-0.5 font-light">{emptySubtext}</p>
                  )}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => {
                const rowKey = (row && (row.id || row.invoiceNumber || row.sku)) ? (row.id || row.invoiceNumber || row.sku) : rowIdx;
                const customRowClass = typeof rowClassName === 'function' ? rowClassName(row, rowIdx) : rowClassName || '';

                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors duration-150 ${
                      onRowClick ? 'cursor-pointer hover:bg-amber-50/40' : 'hover:bg-slate-50/70'
                    } ${customRowClass}`}
                  >
                    {safeColumns.map((col, colIdx) => {
                      const val = getCellValue(row, col);
                      const key = col.key || col.accessor || colIdx;
                      const alignClass = 
                        col.align === 'right' ? 'text-right' :
                        col.align === 'center' ? 'text-center' :
                        'text-left';

                      return (
                        <td
                          key={key}
                          className={`py-3 px-3.5 ${alignClass} ${col.className || ''}`}
                        >
                          {col.render ? col.render(val, row, rowIdx) : (val !== null && val !== undefined ? String(val) : '—')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Footer Controls */}
      {pagination && !loading && totalItems > 0 && (
        <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          
          {/* Left: Rows Per Page Selector & Total Counter */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-light">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white text-slate-800 border border-slate-200 focus:border-amber-500 rounded px-2 py-1 text-xs focus:outline-none cursor-pointer"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-slate-500 font-light border-l border-slate-200 pl-3">
              Showing <strong className="font-medium text-slate-800 tabular-nums">{startIndex}</strong> to{' '}
              <strong className="font-medium text-slate-800 tabular-nums">{endIndex}</strong> of{' '}
              <strong className="font-medium text-slate-800 tabular-nums">{totalItems}</strong> entries
              {safeData.length !== totalItems && (
                <span className="text-slate-400 ml-1">(filtered from {safeData.length})</span>
              )}
            </div>
          </div>

          {/* Right: Page Navigation Buttons */}
          <div className="flex items-center space-x-1">
            {/* First Page */}
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            {/* Prev Page */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Page Number Pills */}
            <div className="flex items-center space-x-1 px-1">
              {getPageNumbers().map((item, idx) => {
                if (item === '...') {
                  return (
                    <span key={`dots-${idx}`} className="px-1.5 text-slate-400 select-none">
                      …
                    </span>
                  );
                }

                const isActive = item === safeCurrentPage;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(item)}
                    className={`min-w-[24px] h-6 px-1.5 rounded text-[11px] font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-white shadow-xs font-semibold'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {/* Next Page */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
}