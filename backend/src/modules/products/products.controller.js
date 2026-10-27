import { prisma } from '../../config/prisma.js';

export const getProducts = async (req, res) => {
  try {
    const { search, categoryId, concentration, isActive, storeId } = req.query;

    const where = {};

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (concentration) {
      where.concentration = concentration;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } },
        { fragranceNotes: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
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
      orderBy: { name: 'asc' },
    });

    // If storeId provided, attach store-specific stock count
    const mappedProducts = products.map((p) => {
      let storeStock = p.stockQuantity;
      if (storeId) {
        const bal = p.stockBalances.find((b) => b.storeId === storeId);
        storeStock = bal ? bal.quantity : 0;
      }
      return {
        ...p,
        currentStoreStock: storeStock,
      };
    });

    return res.json({
      success: true,
      count: mappedProducts.length,
      data: mappedProducts,
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

    let storeStock = product.stockQuantity;
    if (storeId) {
      const bal = product.stockBalances.find((b) => b.storeId === storeId);
      storeStock = bal ? bal.quantity : 0;
    }

    return res.json({
      success: true,
      data: {
        ...product,
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
      for (const st of stores) {
        const storeQty = storeStocks && storeStocks[st.id] !== undefined ? Number(storeStocks[st.id]) : Math.floor(initialQty / stores.length);
        await tx.stockBalance.create({
          data: {
            productId: created.id,
            storeId: st.id,
            quantity: storeQty,
            reorderLevel: Number(reorderLevel) || 5,
          },
        });
      }

      return created;
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
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
};
