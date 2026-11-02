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
 * Supports both Client-Side and Server-Side Pagination & Searching seamlessly.
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  showSrNo = true,
  srNoHeader = 'Sr No',
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
  // Controlled Search & Debouncing
  searchValue: controlledSearchValue = null,
  onSearchChange: controlledOnSearchChange = null,
  debounceMs = 350,
  // Server-side Pagination & Sorting props
  serverSide = false,
  totalCount = undefined,
  totalRecords = undefined,
  page: controlledPage = undefined,
  currentPage: controlledCurrentPage = undefined,
  onPageChange = null,
  pageSize: controlledPageSize = undefined,
  onPageSizeChange = null,
  sortConfig: controlledSortConfig = null,
  onSortChange = null,
}) {
  // Page state
  const isControlledPage = controlledPage !== undefined || controlledCurrentPage !== undefined;
  const activePageProp = controlledPage !== undefined ? controlledPage : controlledCurrentPage;
  const [internalPage, setInternalPage] = useState(1);
  const activePage = isControlledPage ? activePageProp : internalPage;

  // Page size state
  const isControlledPageSize = controlledPageSize !== undefined;
  const [internalPageSize, setInternalPageSize] = useState(defaultPageSize);
  const activePageSize = isControlledPageSize ? controlledPageSize : internalPageSize;

  // Sorting state
  const isControlledSort = controlledSortConfig !== null && controlledSortConfig !== undefined;
  const [internalSort, setInternalSort] = useState(initialSort);
  const sortConfig = isControlledSort ? controlledSortConfig : internalSort;

  // Search input state (with debouncing for smooth typing)
  const isControlledSearch = controlledSearchValue !== null && controlledSearchValue !== undefined;
  const [searchTerm, setSearchTerm] = useState(isControlledSearch ? controlledSearchValue : '');

  // Keep local search in sync if parent changes searchValue externally
  useEffect(() => {
    if (isControlledSearch) {
      setSearchTerm(controlledSearchValue);
    }
  }, [isControlledSearch, controlledSearchValue]);

  // Debounce search callback for parent / server queries
  useEffect(() => {
    if (!controlledOnSearchChange) return;

    const handler = setTimeout(() => {
      if (searchTerm !== (controlledSearchValue ?? '')) {
        controlledOnSearchChange(searchTerm);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [searchTerm, controlledOnSearchChange, debounceMs, controlledSearchValue]);

  // Reset internal page when client-side search or page size changes
  useEffect(() => {
    if (!serverSide) {
      setInternalPage(1);
    }
  }, [searchTerm, activePageSize, serverSide]);

  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const rawColumns = useMemo(() => (Array.isArray(columns) ? columns : []), [columns]);

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

  // 1. Client-Side Filtered Data
  const filteredData = useMemo(() => {
    if (serverSide) return safeData; // Backend handles filtering
    if (!searchTerm || !searchTerm.trim()) return safeData;

    const query = searchTerm.toLowerCase().trim();

    return safeData.filter((row) => {
      if (!row) return false;

      // Custom search fields provided
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

      // Search across column accessors
      return rawColumns.some((col) => {
        const val = getCellValue(row, col);
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [safeData, searchTerm, searchFields, rawColumns, serverSide]);

  // 2. Client-Side Sorted Data
  const sortedData = useMemo(() => {
    if (serverSide) return filteredData; // Backend handles sorting
    if (!sortConfig || !sortConfig.key) return filteredData;

    const targetCol = rawColumns.find((c) => (c.key || c.accessor) === sortConfig.key);

    return [...filteredData].sort((a, b) => {
      let aVal = '';
      let bVal = '';

      if (targetCol && typeof targetCol.sortAccessor === 'function') {
        aVal = targetCol.sortAccessor(a);
        bVal = targetCol.sortAccessor(b);
      } else {
        aVal = getCellValue(a, { key: sortConfig.key, accessor: sortConfig.key });
        bVal = getCellValue(b, { key: sortConfig.key, accessor: sortConfig.key });
      }

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Numeric comparison
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum) && typeof aVal !== 'boolean') {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // Date comparison
      const aDate = new Date(aVal);
      const bDate = new Date(bVal);
      if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime()) && typeof aVal === 'string' && aVal.length > 8) {
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
      }

      // Alphabetical comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortConfig.direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filteredData, sortConfig, rawColumns, serverSide]);

  // Total items calculation
  const effectiveTotalCount = totalCount !== undefined ? totalCount : totalRecords;
  const totalItems = useMemo(() => {
    if (serverSide && effectiveTotalCount !== undefined) {
      return effectiveTotalCount;
    }
    return sortedData.length;
  }, [serverSide, effectiveTotalCount, sortedData.length]);

  // Total pages
  const totalPages = Math.max(1, Math.ceil(totalItems / activePageSize));

  // Current page boundary safety check
  const safeCurrentPage = Math.min(Math.max(1, activePage), totalPages);

  // Serial Number column (Sr No) automatically computed per page
  const safeColumns = useMemo(() => {
    if (!showSrNo) return rawColumns;

    const hasExistingSr = rawColumns.some(
      (c) =>
        c.key === 'srNo' ||
        c.key === 'sr_no' ||
        c.key === 'serialNo' ||
        c.header === 'Sr No' ||
        c.header === 'Sr. No.' ||
        c.header === 'Sr No.'
    );
    if (hasExistingSr) return rawColumns;

    const srColumn = {
      key: 'srNo',
      header: srNoHeader,
      sortable: false,
      align: 'center',
      width: '56px',
      headerClassName: 'w-12 sm:w-16 text-center text-slate-500 font-medium whitespace-nowrap',
      className: 'w-12 sm:w-16 text-center tabular-nums text-slate-400 font-mono text-[11px] select-none whitespace-nowrap',
      render: (_, __, rowIdx) => {
        const pageNum = Number(safeCurrentPage) || 1;
        const pageSizeNum = Number(activePageSize) || 10;
        return (pageNum - 1) * pageSizeNum + rowIdx + 1;
      },
    };

    return [srColumn, ...rawColumns];
  }, [rawColumns, showSrNo, srNoHeader, safeCurrentPage, activePageSize]);

  // 3. Paginated Data Slice
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    if (serverSide) return sortedData; // Backend handles slice

    const startIndex = (safeCurrentPage - 1) * activePageSize;
    return sortedData.slice(startIndex, startIndex + activePageSize);
  }, [sortedData, pagination, safeCurrentPage, activePageSize, serverSide]);

  // Handlers
  const handleSort = (col) => {
    const key = col.key || col.accessor;
    if (!key) return;

    let newDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      newDirection = 'desc';
    }

    const newSort = { key, direction: newDirection };

    if (onSortChange) {
      onSortChange(newSort);
    }
    if (!isControlledSort) {
      setInternalSort(newSort);
    }
  };

  const handleSearchInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (!isControlledPage && !serverSide) {
      setInternalPage(1);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    if (controlledOnSearchChange) {
      controlledOnSearchChange('');
    }
    if (onPageChange) {
      onPageChange(1);
    }
    if (!isControlledPage) {
      setInternalPage(1);
    }
  };

  const handlePageChange = (newPage) => {
    const clamped = Math.max(1, Math.min(totalPages, newPage));
    if (onPageChange) {
      onPageChange(clamped);
    }
    if (!isControlledPage) {
      setInternalPage(clamped);
    }
  };

  const handlePageSizeChange = (newSize) => {
    const sizeNum = Number(newSize) || defaultPageSize;
    if (onPageSizeChange) {
      onPageSizeChange(sizeNum);
    }
    if (!isControlledPageSize) {
      setInternalPageSize(sizeNum);
    }
    if (onPageChange) {
      onPageChange(1);
    }
    if (!isControlledPage) {
      setInternalPage(1);
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

  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * activePageSize + 1;
  const endIndex = Math.min(safeCurrentPage * activePageSize, totalItems);

  return (
    <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col w-full max-w-full ${containerClassName}`}>
      
      {/* Table Toolbar */}
      {(searchable || toolbarLeft || toolbarRight) && (
        <div className="p-3 sm:p-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 text-xs">
          {/* Left Toolbar (Search or custom filters) */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
            {searchable && (
              <div className="relative flex-1 min-w-0 w-full sm:max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 focus:border-amber-500 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-colors shadow-2xs"
                />
                {searchTerm && (
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
            <div className="flex items-center gap-2 shrink-0">
              {toolbarRight}
            </div>
          )}
        </div>
      )}

      {/* Table Scroll Area with smooth touch scrolling */}
      <div className="overflow-x-auto w-full no-scrollbar">
        <table className="w-full text-left border-collapse min-w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-semibold text-slate-600 tracking-wide select-none">
              {safeColumns.map((col, idx) => {
                const key = col.key || col.accessor || idx;
                const isSortable = col.sortable !== false && (col.key || col.accessor);
                const isSorted = sortConfig && sortConfig.key === (col.key || col.accessor);
                const alignClass = 
                  col.align === 'right' ? 'text-right justify-end' :
                  col.align === 'center' ? 'text-center justify-center' :
                  'text-left justify-start';

                return (
                  <th
                    key={key}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => isSortable && handleSort(col)}
                    className={`py-3 px-3 sm:px-3.5 whitespace-nowrap ${col.headerClassName || ''} ${
                      isSortable ? 'cursor-pointer hover:bg-slate-100/80 transition-colors' : ''
                    }`}
                  >
                    <div className={`flex items-center space-x-1.5 ${alignClass}`}>
                      <span className="font-semibold text-slate-700">{col.header}</span>
                      {isSortable && (
                        <span className="text-slate-400 shrink-0">
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
                          className={`py-3 px-3 sm:px-3.5 ${alignClass} ${col.className || ''}`}
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

      {/* Pagination & Footer Controls - Fully responsive across mobile, tablet, and desktop */}
      {pagination && !loading && totalItems > 0 && (
        <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          
          {/* Left: Rows Per Page Selector & Total Counter */}
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-light text-[11px] sm:text-xs">Rows:</span>
              <select
                id="datatable-page-size-select"
                value={activePageSize}
                onChange={(e) => handlePageSizeChange(e.target.value)}
                className="bg-white text-slate-800 border border-slate-200 focus:border-amber-500 rounded px-1.5 sm:px-2 py-1 text-xs focus:outline-none cursor-pointer shadow-2xs"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-slate-500 font-light border-l border-slate-200 pl-2 sm:pl-3 text-[11px] sm:text-xs whitespace-nowrap">
              Showing <strong className="font-medium text-slate-800 tabular-nums">{startIndex}</strong>–
              <strong className="font-medium text-slate-800 tabular-nums">{endIndex}</strong> of{' '}
              <strong className="font-medium text-slate-800 tabular-nums">{totalItems}</strong>
              {!serverSide && safeData.length !== totalItems && (
                <span className="text-slate-400 ml-1 hidden sm:inline">(filtered from {safeData.length})</span>
              )}
            </div>
          </div>

          {/* Right: Page Navigation Buttons */}
          <div className="flex items-center space-x-1 justify-center w-full sm:w-auto shrink-0 whitespace-nowrap">
            {/* First Page */}
            <button
              type="button"
              onClick={() => handlePageChange(1)}
              disabled={safeCurrentPage === 1}
              className="hidden sm:inline-flex p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            {/* Prev Page */}
            <button
              type="button"
              onClick={() => handlePageChange(Math.max(1, safeCurrentPage - 1))}
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
                    <span key={`dots-${idx}`} className="px-1 text-slate-400 select-none text-xs">
                      …
                    </span>
                  );
                }

                const isActive = item === safeCurrentPage;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handlePageChange(item)}
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
              onClick={() => handlePageChange(Math.min(totalPages, safeCurrentPage + 1))}
              disabled={safeCurrentPage === totalPages}
              className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page */}
            <button
              type="button"
              onClick={() => handlePageChange(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="hidden sm:inline-flex p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
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
