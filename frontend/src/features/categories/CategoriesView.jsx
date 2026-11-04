import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DataTable from '../../components/DataTable';
import {
  FolderTree,
  Plus,
  Edit3,
  Trash2,
  Tag,
  Package,
  Sparkles,
  AlertCircle,
  RefreshCw,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';
import { categoryService } from '../../services/api';

export default function CategoriesView({ onNavigateToProducts = null }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCategories, setTotalCategories] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '' });
  const [formErrors, setFormErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const params = {
        page,
        limit: pageSize,
      };

      if (search && search.trim()) {
        params.search = search.trim();
      }

      if (sortConfig && sortConfig.key) {
        params.sortBy = sortConfig.key;
        params.sortOrder = sortConfig.direction || 'asc';
      }

      const res = await categoryService.getCategories(params);
      setCategories(res.data || []);
      if (res.pagination) {
        setTotalCategories(res.pagination.total);
      } else {
        setTotalCategories((res.data || []).length);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load categories from database.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, sortConfig]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSearchChange = (newSearch) => {
    setSearch(newSearch);
    setPage(1);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleSortChange = (newSort) => {
    setSortConfig(newSort);
    setPage(1);
  };

  const slugify = (text) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    const newSlug = isSlugManuallyEdited ? formData.slug : slugify(val);
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: newSlug,
    }));
    if (formErrors.name) {
      setFormErrors((prev) => ({ ...prev, name: '' }));
    }
  };

  const handleSlugChange = (e) => {
    setIsSlugManuallyEdited(true);
    const val = e.target.value.toLowerCase().replace(/\s+/g, '-');
    setFormData((prev) => ({
      ...prev,
      slug: val,
    }));
    if (formErrors.slug) {
      setFormErrors((prev) => ({ ...prev, slug: '' }));
    }
  };

  const handleNameBlur = (e) => {
    const currentName = e?.target?.value ?? formData.name;
    const currentSlug = isSlugManuallyEdited ? formData.slug : slugify(currentName);
    const errs = validateCategoryForm({ ...formData, name: currentName, slug: currentSlug });
    if (errs.name) {
      setFormErrors((prev) => ({ ...prev, name: errs.name }));
    }
  };

  const handleSlugBlur = (e) => {
    const currentSlug = e?.target?.value ?? formData.slug;
    const errs = validateCategoryForm({ ...formData, slug: currentSlug });
    if (errs.slug) {
      setFormErrors((prev) => ({ ...prev, slug: errs.slug }));
    }
  };

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', slug: '', description: '' });
    setIsSlugManuallyEdited(false);
    setFormErrors({});
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
    });
    setIsSlugManuallyEdited(true);
    setFormErrors({});
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (cat) => {
    setCategoryToDelete(cat);
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const validateCategoryForm = (customData = formData) => {
    const errors = {};
    const nameTrim = (customData.name || '').trim();

    // 1. Name Validation
    if (!nameTrim) {
      errors.name = 'Category name is required';
    } else if (nameTrim.length < 2) {
      errors.name = 'Category name must be at least 2 characters';
    } else if (nameTrim.length > 50) {
      errors.name = 'Category name cannot exceed 50 characters';
    } else if (/^[0-9]+$/.test(nameTrim)) {
      errors.name = 'Category name cannot be only numbers';
    } else if (!/^[a-zA-Z0-9\s&,.'\-_/()]+$/.test(nameTrim)) {
      errors.name = 'Category name contains invalid characters. Use letters, numbers, spaces and &, -';
    } else {
      // Local duplicate name check
      const duplicate = categories.find(
        (c) => c.name.toLowerCase() === nameTrim.toLowerCase() && c.id !== editingCategory?.id
      );
      if (duplicate) {
        errors.name = `Category "${nameTrim}" already exists. Please choose a unique name.`;
      }
    }

    // 2. Slug Validation
    const rawSlug = customData.slug !== undefined && customData.slug !== ''
      ? customData.slug.trim()
      : slugify(nameTrim);

    if (rawSlug) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rawSlug)) {
        errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens (e.g. floral-rose)';
      } else if (rawSlug.length < 2) {
        errors.slug = 'Slug must be at least 2 characters';
      } else if (rawSlug.length > 60) {
        errors.slug = 'Slug cannot exceed 60 characters';
      } else {
        const duplicateSlug = categories.find(
          (c) => c.slug === rawSlug && c.id !== editingCategory?.id
        );
        if (duplicateSlug) {
          errors.slug = `URL slug "${rawSlug}" is already in use. Please modify it.`;
        }
      }
    }

    // 3. Description Validation
    if (customData.description && customData.description.trim().length > 500) {
      errors.description = 'Description cannot exceed 500 characters';
    }

    return errors;
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const validationErrors = validateCategoryForm();
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }
    setFormErrors({});

    try {
      setSubmitting(true);
      setErrorMsg('');

      const cleanName = formData.name.trim();
      const cleanSlug = formData.slug ? formData.slug.trim() : slugify(cleanName);
      const payload = {
        name: cleanName,
        slug: cleanSlug,
        description: formData.description ? formData.description.trim() : '',
      };

      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, payload);
      } else {
        await categoryService.createCategory(payload);
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      const serverMsg = err.response?.data?.message || 'Failed to save category. Please check your inputs.';
      setErrorMsg(serverMsg);
      const lower = serverMsg.toLowerCase();
      if (lower.includes('already exists') || lower.includes('duplicate') || lower.includes('conflict')) {
        if (lower.includes('slug')) {
          setFormErrors((prev) => ({ ...prev, slug: serverMsg }));
        } else {
          setFormErrors((prev) => ({ ...prev, name: serverMsg }));
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      setDeleting(true);
      setDeleteError('');
      await categoryService.deleteCategory(categoryToDelete.id);
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'Category & Olfactory Family',
      sortAccessor: (cat) => cat.name,
      sortable: true,
      className: 'min-w-[180px]',
      render: (_, cat) => (
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <div className="font-serif font-semibold text-slate-900 text-sm">{cat.name}</div>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center space-x-1">
              <span>/{cat.slug}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description & Olfactory Notes',
      accessor: 'description',
      sortable: false,
      render: (desc) => (
        <div className="text-xs text-slate-600 font-light max-w-xs md:max-w-sm line-clamp-2 italic">
          {desc || <span className="text-slate-400 not-italic">No olfactory profile description recorded</span>}
        </div>
      ),
    },
    {
      key: 'productsCount',
      header: 'Products Linked',
      sortAccessor: (cat) => cat._count?.products || 0,
      sortable: true,
      align: 'center',
      className: 'whitespace-nowrap',
      headerClassName: 'whitespace-nowrap',
      render: (_, cat) => {
        const count = cat._count?.products || 0;
        if (count > 0 && onNavigateToProducts) {
          return (
            <button
              type="button"
              onClick={() => onNavigateToProducts(cat.id)}
              title={`View ${count} fragrances in ${cat.name}`}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold tabular-nums border bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 transition-colors cursor-pointer group shadow-2xs whitespace-nowrap"
            >
              <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="whitespace-nowrap">{count} {count === 1 ? 'fragrance' : 'fragrances'}</span>
              <ArrowRight className="w-3 h-3 text-amber-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          );
        }

        return (
          <span
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium tabular-nums border whitespace-nowrap ${
              count > 0
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="whitespace-nowrap">{count} {count === 1 ? 'fragrance' : 'fragrances'}</span>
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Created On',
      accessor: 'createdAt',
      sortable: true,
      className: 'text-slate-500 font-light text-xs tabular-nums whitespace-nowrap',
      headerClassName: 'whitespace-nowrap',
      render: (val) =>
        new Date(val).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      align: 'right',
      className: 'whitespace-nowrap',
      headerClassName: 'whitespace-nowrap',
      render: (_, cat) => (
        <div className="flex items-center justify-end space-x-1.5 whitespace-nowrap">
          <button
            type="button"
            onClick={() => handleOpenEditModal(cat)}
            className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition cursor-pointer"
            title="Edit Category Details"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenDeleteModal(cat)}
            className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
            title="Delete Category"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ], [onNavigateToProducts]);

  return (
    <div className="max-w-[1700px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <h2 className="text-2xl font-serif font-semibold text-slate-900">Category Master</h2>
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold border border-amber-300 whitespace-nowrap">
              {totalCategories} Categories
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Boutique fragrance olfactory families, aroma classifications, and product collections.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          id="add-category-master-btn"
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center space-x-1.5 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add category</span>
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Categories DataTable */}
      <DataTable
        columns={columns}
        data={categories}
        loading={loading}
        serverSide={true}
        totalCount={totalCategories}
        page={page}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        searchValue={search}
        onSearchChange={handleSearchChange}
        sortConfig={sortConfig}
        onSortChange={handleSortChange}
        searchPlaceholder="Instant search category name, slug, description..."
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50, 100]}
        emptyIcon={Layers}
        emptyMessage="No categories found"
        emptySubtext="Use 'Add category' above to create your first olfactory family."
        initialSort={{ key: 'name', direction: 'asc' }}
        toolbarRight={
          <button
            type="button"
            onClick={fetchCategories}
            title="Refresh categories"
            className="p-1.5 sm:p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 shadow-2xs transition cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        }
      />

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <span className="text-[11px] text-amber-700 font-semibold uppercase tracking-wider block">
                    Olfactory Master Data
                  </span>
                  <h3 className="text-base font-serif font-semibold text-slate-900">
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div role="alert" className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} noValidate className="mt-4 space-y-4">
              {/* Category Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="category-name-input" className="text-xs font-semibold text-slate-700 block">
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {(formData.name || '').length}/50
                  </span>
                </div>
                <input
                  id="category-name-input"
                  type="text"
                  maxLength={50}
                  placeholder="e.g. Floral & Rose, Woody & Amber"
                  value={formData.name}
                  onChange={handleNameChange}
                  onBlur={handleNameBlur}
                  aria-invalid={!!formErrors.name}
                  aria-describedby={formErrors.name ? 'category-name-error' : undefined}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none transition ${
                    formErrors.name
                      ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                      : 'border-slate-200 focus:border-amber-500'
                  }`}
                />
                {formErrors.name && (
                  <p id="category-name-error" className="text-[11px] text-rose-600 mt-1 flex items-center space-x-1 animate-in fade-in">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{formErrors.name}</span>
                  </p>
                )}
              </div>

              {/* URL Slug */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="category-slug-input" className="text-xs font-semibold text-slate-700">
                    URL Slug
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {isSlugManuallyEdited ? 'custom slug' : 'auto-generated'}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">/</span>
                  <input
                    id="category-slug-input"
                    type="text"
                    maxLength={60}
                    placeholder="floral-rose"
                    value={formData.slug}
                    onChange={handleSlugChange}
                    onBlur={handleSlugBlur}
                    aria-invalid={!!formErrors.slug}
                    aria-describedby={formErrors.slug ? 'category-slug-error' : undefined}
                    className={`w-full pl-6 pr-3 py-2 bg-slate-50 border rounded-xl text-xs font-mono text-slate-900 focus:outline-none transition ${
                      formErrors.slug
                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                        : 'border-slate-200 focus:border-amber-500'
                    }`}
                  />
                </div>
                {formErrors.slug && (
                  <p id="category-slug-error" className="text-[11px] text-rose-600 mt-1 flex items-center space-x-1 animate-in fade-in">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{formErrors.slug}</span>
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="category-desc-input" className="text-xs font-semibold text-slate-700 block">
                    Olfactory Profile & Aroma Notes (Optional)
                  </label>
                  <span className={`text-[10px] font-mono tabular-nums ${
                    (formData.description || '').length > 480 ? 'text-rose-500 font-semibold' : 'text-slate-400'
                  }`}>
                    {(formData.description || '').length}/500
                  </span>
                </div>
                <textarea
                  id="category-desc-input"
                  rows="3"
                  maxLength={500}
                  placeholder="e.g. Damask rose, jasmine sambac, iris and lush floral bouquets."
                  value={formData.description}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, description: e.target.value }));
                    if (formErrors.description) setFormErrors((prev) => ({ ...prev, description: '' }));
                  }}
                  aria-invalid={!!formErrors.description}
                  aria-describedby={formErrors.description ? 'category-desc-error' : undefined}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:outline-none transition resize-none ${
                    formErrors.description
                      ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                      : 'border-slate-200 focus:border-amber-500'
                  }`}
                />
                {formErrors.description && (
                  <p id="category-desc-error" className="text-[11px] text-rose-600 mt-1 flex items-center space-x-1 animate-in fade-in">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{formErrors.description}</span>
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center space-x-3 pb-3.5 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-serif font-semibold text-slate-900">
                  Delete Category
                </h3>
                <p className="text-xs text-slate-500">
                  Confirm deletion of olfactory classification
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-4 text-xs text-slate-600 leading-relaxed">
              {(categoryToDelete._count?.products || 0) > 0 ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1.5">
                  <div className="font-semibold flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Cannot delete this category</span>
                  </div>
                  <p>
                    Category <strong>'{categoryToDelete.name}'</strong> is currently assigned to{' '}
                    <strong>{categoryToDelete._count.products}</strong> active product(s).
                  </p>
                  <p className="text-amber-800">
                    To maintain catalog consistency, please edit those products and assign them to another category before deleting this one.
                  </p>
                </div>
              ) : (
                <p>
                  Are you sure you want to permanently delete category <strong>'{categoryToDelete.name}'</strong>?
                  This action cannot be undone.
                </p>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:space-x-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              {(categoryToDelete._count?.products || 0) === 0 && (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition shadow-sm flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {deleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{deleting ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

