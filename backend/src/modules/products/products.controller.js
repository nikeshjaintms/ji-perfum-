import { prisma } from '../../config/prisma.js';

export const getProducts = async (req, res) => {
  try {
    const { search, categoryId, concentration, isActive, storeId, page, limit, sortBy, sortOrder, inStockOnly } = req.query;

    const where = {};

    if (isActive !== undefined && isActive !== 'ALL') {
      where.isActive = isActive === 'true';
    }

    if (inStockOnly === 'true') {
      if (storeId) {
        where.stockBalances = {
          some: {
            storeId,
            quantity: { gt: 0 },
          },
        };
      } else {
        where.stockQuantity = { gt: 0 };
      }
    }

    if (categoryId && categoryId !== 'ALL') {
      where.categoryId = categoryId;
    }

    if (concentration && concentration !== 'ALL') {
      where.concentration = concentration;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { sku: { contains: q } },
        { barcode: { contains: q } },
        { fragranceNotes: { contains: q } },
      ];
    }

    let orderBy = { name: 'asc' };
    if (sortBy) {
      const allowedSort = ['name', 'sku', 'sellingPrice', 'stockQuantity', 'createdAt'];
      if (allowedSort.includes(sortBy)) {
        orderBy = { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' };
      }
    }

    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : null;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10) || 10) : null;

    const include = {
      category: true,
      stockBalances: {
        include: {
          store: {
            include: { city: true },
          },
        },
      },
    };

    if (pageNum && limitNum) {
      const skip = (pageNum - 1) * limitNum;
      const take = limitNum;

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include,
          orderBy,
          take,
          skip,
        }),
        prisma.product.count({ where }),
      ]);

      // If storeId provided, attach store-specific stock count
      const mappedProducts = products.map((p) => {
        const totalChainStock = p.stockBalances && p.stockBalances.length > 0
          ? p.stockBalances.reduce((sum, b) => sum + Number(b.quantity || 0), 0)
          : Math.max(0, p.stockQuantity || 0);

        let storeStock = totalChainStock;
        if (storeId) {
          const bal = p.stockBalances.find((b) => b.storeId === storeId);
          storeStock = bal ? bal.quantity : 0;
        }
        return {
          ...p,
          stockQuantity: totalChainStock,
          currentStoreStock: storeStock,
        };
      });

      return res.json({
        success: true,
        count: mappedProducts.length,
        data: mappedProducts,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    }

    // Default without pagination (e.g. POS catalog)
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include,
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    // If storeId provided, attach store-specific stock count
    const mappedProducts = products.map((p) => {
      const totalChainStock = p.stockBalances && p.stockBalances.length > 0
        ? p.stockBalances.reduce((sum, b) => sum + Number(b.quantity || 0), 0)
        : Math.max(0, p.stockQuantity || 0);

      let storeStock = totalChainStock;
      if (storeId) {
        const bal = p.stockBalances.find((b) => b.storeId === storeId);
        storeStock = bal ? bal.quantity : 0;
      }
      return {
        ...p,
        stockQuantity: totalChainStock,
        currentStoreStock: storeStock,
      };
    });

    return res.json({
      success: true,
      count: mappedProducts.length,
      data: mappedProducts,
      pagination: {
        total,
        page: 1,
        limit: total,
        totalPages: 1,
      },
    });
  } catch (error) {
    console.error('getProducts error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

export const getProductByBarcodeOrSku = async (req, res) => {
  try {
    const { code } = req.params;
    const { storeId } = req.query;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Barcode or SKU is required' });
    }

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode: code.trim() },
          { sku: code.trim() },
        ],
        isActive: true,
      },
      include: {
        category: true,
        stockBalances: {
          include: {
            store: {
              include: { city: true },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found with this Barcode/SKU' });
    }

    const totalChainStock = product.stockBalances && product.stockBalances.length > 0
      ? product.stockBalances.reduce((sum, b) => sum + Number(b.quantity || 0), 0)
      : Math.max(0, product.stockQuantity || 0);

    let storeStock = totalChainStock;
    if (storeId) {
      const bal = product.stockBalances.find((b) => b.storeId === storeId);
      storeStock = bal ? bal.quantity : 0;
    }

    return res.json({
      success: true,
      data: {
        ...product,
        stockQuantity: totalChainStock,
        currentStoreStock: storeStock,
      },
    });
  } catch (error) {
    console.error('getProductByBarcodeOrSku error:', error);
    return res.status(500).json({ success: false, message: 'Lookup failed' });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      barcode,
      brand,
      imageUrl,
      description,
      fragranceNotes,
      concentration,
      volumeMl,
      purchaseCost,
      sellingPrice,
      taxRate,
      stockQuantity,
      reorderLevel,
      categoryId,
      storeStocks, // optional: { [storeId]: qty }
    } = req.body;

    if (!name || !sku || !purchaseCost || !sellingPrice || !categoryId) {
      return res.status(400).json({ success: false, message: 'Name, SKU, purchase cost, selling price and category are required.' });
    }

    const existingSku = await prisma.product.findUnique({ where: { sku: sku.trim() } });
    if (existingSku) {
      return res.status(400).json({ success: false, message: 'SKU already exists.' });
    }

    if (barcode) {
      const existingBarcode = await prisma.product.findUnique({ where: { barcode: barcode.trim() } });
      if (existingBarcode) {
        return res.status(400).json({ success: false, message: 'Barcode already exists.' });
      }
    }

    const stores = await prisma.store.findMany({ where: { isActive: true } });
    const initialQty = Number(stockQuantity) || 0;

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          barcode: barcode ? barcode.trim() : null,
          brand: brand ? brand.trim() : 'J I PERFUME',
          imageUrl: imageUrl ? imageUrl.trim() : null,
          description,
          fragranceNotes,
          concentration: concentration || 'EAU_DE_PARFUM',
          volumeMl: Number(volumeMl) || 100,
          purchaseCost: Number(purchaseCost),
          sellingPrice: Number(sellingPrice),
          taxRate: taxRate !== undefined ? Number(taxRate) : 18.00,
          stockQuantity: initialQty,
          reorderLevel: Number(reorderLevel) || 10,
          categoryId,
        },
      });

      // Create stock balance for each active store
      let calculatedTotal = 0;
      for (const st of stores) {
        const storeQty = storeStocks && storeStocks[st.id] !== undefined
          ? Number(storeStocks[st.id])
          : (initialQty > 0 ? Math.floor(initialQty / stores.length) : 0);
        calculatedTotal += storeQty;
        await tx.stockBalance.create({
          data: {
            productId: created.id,
            storeId: st.id,
            quantity: storeQty,
            reorderLevel: Number(reorderLevel) || 5,
          },
        });
      }

      // Keep aggregate stockQuantity in sync with the sum of store balances
      const updatedCreated = await tx.product.update({
        where: { id: created.id },
        data: { stockQuantity: calculatedTotal },
      });

      return updatedCreated;
    });

    const fullProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: true,
        stockBalances: { include: { store: { include: { city: true } } } },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully with Multi-City stock',
      data: fullProduct,
    });
  } catch (error) {
    console.error('createProduct error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create product' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updatePayload = {};
    if (data.name) updatePayload.name = data.name.trim();
    if (data.brand !== undefined) updatePayload.brand = data.brand ? data.brand.trim() : 'J I PERFUME';
    if (data.imageUrl !== undefined) updatePayload.imageUrl = data.imageUrl ? data.imageUrl.trim() : null;
    if (data.barcode !== undefined) updatePayload.barcode = data.barcode ? data.barcode.trim() : null;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.fragranceNotes !== undefined) updatePayload.fragranceNotes = data.fragranceNotes;
    if (data.concentration) updatePayload.concentration = data.concentration;
    if (data.volumeMl) updatePayload.volumeMl = Number(data.volumeMl);
    if (data.purchaseCost !== undefined) updatePayload.purchaseCost = Number(data.purchaseCost);
    if (data.sellingPrice !== undefined) updatePayload.sellingPrice = Number(data.sellingPrice);
    if (data.taxRate !== undefined) updatePayload.taxRate = Number(data.taxRate);
    if (data.isActive !== undefined) updatePayload.isActive = Boolean(data.isActive);
    if (data.categoryId) updatePayload.categoryId = data.categoryId;

    const updated = await prisma.$transaction(async (tx) => {
      // If store-specific stock is passed
      if (data.storeStocks && typeof data.storeStocks === 'object') {
        let total = 0;
        for (const [sId, qty] of Object.entries(data.storeStocks)) {
          const numQty = Number(qty);
          total += numQty;
          await tx.stockBalance.upsert({
            where: {
              productId_storeId: { productId: id, storeId: sId },
            },
            update: { quantity: numQty },
            create: { productId: id, storeId: sId, quantity: numQty },
          });
        }
        updatePayload.stockQuantity = total;
      }

      return tx.product.update({
        where: { id },
        data: updatePayload,
        include: {
          category: true,
          stockBalances: { include: { store: { include: { city: true } } } },
        },
      });
    });

    return res.json({
      success: true,
      message: 'Product updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('updateProduct error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

export const getCategories = async (req, res) => {
  try {
    const { search, page, limit, sortBy, sortOrder } = req.query;

    const where = {};
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { slug: { contains: q } },
        { description: { contains: q } },
      ];
    }

    let orderBy = { name: 'asc' };
    if (sortBy) {
      const allowedSort = ['name', 'slug', 'createdAt'];
      if (allowedSort.includes(sortBy)) {
        orderBy = { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' };
      }
    }

    const include = {
      _count: {
        select: { products: true },
      },
    };

    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : null;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10) || 10) : null;

    if (pageNum && limitNum) {
      const skip = (pageNum - 1) * limitNum;
      const [categories, total] = await Promise.all([
        prisma.category.findMany({
          where,
          include,
          orderBy,
          take: limitNum,
          skip,
        }),
        prisma.category.count({ where }),
      ]);

      return res.json({
        success: true,
        count: categories.length,
        data: categories,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        include,
        orderBy,
      }),
      prisma.category.count({ where }),
    ]);

    return res.json({
      success: true,
      count: categories.length,
      data: categories,
      pagination: {
        total,
        page: 1,
        limit: total,
        totalPages: 1,
      },
    });
  } catch (error) {
    console.error('getCategories error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch categories: ' + error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, slug, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const cleanName = name.trim();
    const cleanSlug = (slug && slug.trim())
      ? slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      : cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    // Check if name or slug already exists
    const existing = await prisma.category.findFirst({
      where: {
        OR: [{ name: cleanName }, { slug: cleanSlug }],
      },
    });

    if (existing) {
      const isNameMatch = existing.name.toLowerCase() === cleanName.toLowerCase();
      return res.status(409).json({
        success: false,
        message: isNameMatch
          ? `Category '${cleanName}' already exists.`
          : `Category slug '${cleanSlug}' already exists.`,
      });
    }

    const category = await prisma.category.create({
      data: {
        name: cleanName,
        slug: cleanSlug,
        description: description ? description.trim() : null,
      },
      include: {
        _count: { select: { products: true } },
      },
    });

    return res.status(201).json({
      success: true,
      message: `Category '${category.name}' created successfully.`,
      data: category,
    });
  } catch (error) {
    console.error('createCategory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create category: ' + error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description } = req.body;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    const data = {};
    if (name && name.trim()) {
      data.name = name.trim();
    }
    if (slug && slug.trim()) {
      data.slug = slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    } else if (name && name.trim() && !category.slug) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    if (description !== undefined) {
      data.description = description ? description.trim() : null;
    }

    // Check uniqueness conflict if name or slug changed
    if (data.name || data.slug) {
      const conflict = await prisma.category.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(data.name ? [{ name: data.name }] : []),
            ...(data.slug ? [{ slug: data.slug }] : []),
          ],
        },
      });

      if (conflict) {
        const isNameConflict = data.name && conflict.name.toLowerCase() === data.name.toLowerCase();
        return res.status(409).json({
          success: false,
          message: isNameConflict
            ? `Category '${data.name}' already exists.`
            : `Category slug '${data.slug}' already exists.`,
        });
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data,
      include: {
        _count: { select: { products: true } },
      },
    });

    return res.json({
      success: true,
      message: `Category '${updated.name}' updated successfully.`,
      data: updated,
    });
  } catch (error) {
    console.error('updateCategory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update category: ' + error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    if (category._count?.products > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category '${category.name}' because it contains ${category._count.products} linked product(s). Please reassign or delete the products first.`,
      });
    }

    await prisma.category.delete({ where: { id } });

    return res.json({
      success: true,
      message: `Category '${category.name}' deleted successfully.`,
    });
  } catch (error) {
    console.error('deleteCategory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete category: ' + error.message });
  }
};

export const adjustStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { storeId, quantityChange, notes } = req.body;

    if (!storeId || quantityChange === undefined) {
      return res.status(400).json({ success: false, message: 'Store outlet and quantity are required' });
    }

    const change = Number(quantityChange);
    if (isNaN(change)) {
      return res.status(400).json({ success: false, message: 'Invalid quantity number' });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existingBal = await tx.stockBalance.findUnique({
        where: { productId_storeId: { productId: id, storeId } },
      });

      const currentQty = existingBal ? existingBal.quantity : 0;
      const newQty = Math.max(0, currentQty + change);

      await tx.stockBalance.upsert({
        where: { productId_storeId: { productId: id, storeId } },
        update: { quantity: newQty },
        create: { productId: id, storeId, quantity: newQty },
      });

      // Recalculate total product stock
      const allBalances = await tx.stockBalance.findMany({
        where: { productId: id },
      });
      const newTotal = allBalances.reduce((sum, b) => sum + (b.storeId === storeId ? newQty : b.quantity), 0);

      const updatedProd = await tx.product.update({
        where: { id },
        data: { stockQuantity: newTotal },
        include: {
          category: true,
          stockBalances: { include: { store: { include: { city: true } } } },
        },
      });

      // Log inventory movement
      await tx.stockMovement.create({
        data: {
          productId: id,
          storeId,
          quantityChange: change,
          type: change >= 0 ? 'PURCHASE_RECEIPT' : 'ADJUSTMENT',
          notes: notes || 'Direct inventory stock-in / adjustment',
          createdById: req.user?.id || null,
        },
      });

      return updatedProd;
    });

    return res.json({
      success: true,
      message: `Stock successfully updated (${change >= 0 ? '+' : ''}${change} units)`,
      data: updated,
    });
  } catch (error) {
    console.error('adjustStock error:', error);
    return res.status(500).json({ success: false, message: 'Failed to adjust stock: ' + error.message });
  }
};
