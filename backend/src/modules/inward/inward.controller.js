import { prisma } from '../../config/prisma.js';

/**
 * Generate atomic sequential Inward Number: INW-YYYY-XXXX
 */
async function generateNextInwardNumber() {
  const year = new Date().getFullYear();
  const prefix = `INW-${year}-`;
  const latest = await prisma.stockInward.findFirst({
    where: { inwardNumber: { startsWith: prefix } },
    orderBy: { inwardNumber: 'desc' },
    select: { inwardNumber: true },
  });

  let nextSeq = 1;
  if (latest?.inwardNumber) {
    const match = latest.inwardNumber.match(new RegExp(`^INW-${year}-(\\d+)$`));
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    } else {
      const totalCount = await prisma.stockInward.count();
      nextSeq = totalCount + 1;
    }
  } else {
    const totalCount = await prisma.stockInward.count();
    nextSeq = totalCount + 1;
  }
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Generate atomic sequential Distribution Number: DST-YYYY-XXXX
 */
async function generateNextDistributionNumber() {
  const year = new Date().getFullYear();
  const prefix = `DST-${year}-`;
  const latest = await prisma.stockDistribution.findFirst({
    where: { distributionNumber: { startsWith: prefix } },
    orderBy: { distributionNumber: 'desc' },
    select: { distributionNumber: true },
  });

  let nextSeq = 1;
  if (latest?.distributionNumber) {
    const match = latest.distributionNumber.match(new RegExp(`^DST-${year}-(\\d+)$`));
    if (match) {
      nextSeq = parseInt(match[1], 10) + 1;
    } else {
      const totalCount = await prisma.stockDistribution.count();
      nextSeq = totalCount + 1;
    }
  } else {
    const totalCount = await prisma.stockDistribution.count();
    nextSeq = totalCount + 1;
  }
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * 1. CREATE STOCK INWARD (Goods Receipt Note / Inward Consignment)
 * Stock arrives from distillery / factory into Central Inward Vault.
 */
export const createInward = async (req, res) => {
  try {
    const {
      supplierName,
      referenceNumber,
      inwardDate,
      notes,
      items, // array of { productId, batchNumber, quantityInwarded, unitCost, notes }
    } = req.body;

    if (!supplierName || !supplierName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Supplier, Distillery, or Consignment Source name is required.',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one fragrance item must be added to the inward consignment.',
      });
    }

    // Validate and sanitize items
    const validatedItems = [];
    let totalQuantity = 0;
    let totalCost = 0;

    for (const item of items) {
      const qty = parseInt(item.quantityInwarded, 10);
      if (!item.productId || isNaN(qty) || qty <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid product and positive inward quantity.',
        });
      }

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { id: true, name: true, sku: true, purchaseCost: true },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.productId} was not found.`,
        });
      }

      const unitCost = item.unitCost !== undefined && item.unitCost !== ''
        ? Number(Number(item.unitCost).toFixed(2))
        : Number(product.purchaseCost || 0);

      const itemTotalCost = Number((unitCost * qty).toFixed(2));

      totalQuantity += qty;
      totalCost += itemTotalCost;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        batchNumber: item.batchNumber ? String(item.batchNumber).trim() : null,
        quantityInwarded: qty,
        unitCost,
        totalCost: itemTotalCost,
        notes: item.notes ? String(item.notes).trim() : null,
      });
    }

    totalCost = Number(totalCost.toFixed(2));

    const inwardNumber = await generateNextInwardNumber();

    const inwardRecord = await prisma.$transaction(async (tx) => {
      // 1. Create StockInward header
      const inward = await tx.stockInward.create({
        data: {
          inwardNumber,
          supplierName: supplierName.trim(),
          referenceNumber: referenceNumber ? referenceNumber.trim() : null,
          inwardDate: inwardDate ? new Date(inwardDate) : new Date(),
          status: 'RECEIVED',
          totalItems: validatedItems.length,
          totalQuantity,
          totalCost,
          notes: notes ? notes.trim() : null,
          createdById: req.user?.id || null,
        },
      });

      // 2. Create StockInwardItems and increment product unallocatedStock
      for (const vi of validatedItems) {
        await tx.stockInwardItem.create({
          data: {
            inwardId: inward.id,
            productId: vi.productId,
            batchNumber: vi.batchNumber,
            quantityInwarded: vi.quantityInwarded,
            quantityDistributed: 0,
            unitCost: vi.unitCost,
            totalCost: vi.totalCost,
            notes: vi.notes,
          },
        });

        // Increment product unallocated central stock
        await tx.product.update({
          where: { id: vi.productId },
          data: {
            unallocatedStock: { increment: vi.quantityInwarded },
          },
        });

        // Log StockMovement audit entry
        await tx.stockMovement.create({
          data: {
            productId: vi.productId,
            quantityChange: vi.quantityInwarded,
            type: 'PURCHASE_RECEIPT',
            referenceId: inwardNumber,
            notes: `Inwarded to Central Vault from ${supplierName.trim()}${vi.batchNumber ? ` (Batch: ${vi.batchNumber})` : ''}`,
            createdById: req.user?.id || null,
          },
        });
      }

      return inward;
    });

    const fullInward = await prisma.stockInward.findUnique({
      where: { id: inwardRecord.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                imageUrl: true,
                concentration: true,
                volumeMl: true,
                sellingPrice: true,
                stockQuantity: true,
                unallocatedStock: true,
                category: { select: { id: true, name: true } },
                stockBalances: {
                  select: {
                    storeId: true,
                    quantity: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: `Stock inward consignment '${inwardNumber}' received successfully into Central Vault.`,
      data: fullInward,
    });
  } catch (error) {
    console.error('createInward error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create stock inward: ' + error.message,
    });
  }
};

/**
 * 2. GET STOCK INWARDS LIST
 * Query parameters: search, status, page, limit, sortBy, sortOrder
 */
export const getInwards = async (req, res) => {
  try {
    const {
      search,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { inwardNumber: { contains: q } },
        { supplierName: { contains: q } },
        { referenceNumber: { contains: q } },
        { notes: { contains: q } },
        {
          items: {
            some: {
              OR: [
                { batchNumber: { contains: q } },
                { product: { name: { contains: q } } },
                { product: { sku: { contains: q } } },
                { product: { barcode: { contains: q } } },
              ],
            },
          },
        },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const allowedSort = ['createdAt', 'inwardDate', 'inwardNumber', 'totalQuantity', 'totalCost', 'status'];
    const safeSort = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
    const orderBy = { [safeSort]: sortOrder === 'asc' ? 'asc' : 'desc' };

    const [inwards, total] = await Promise.all([
      prisma.stockInward.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true, role: true } },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  imageUrl: true,
                  concentration: true,
                  volumeMl: true,
                  unallocatedStock: true,
                  stockQuantity: true,
                  category: { select: { id: true, name: true } },
                  stockBalances: {
                    select: {
                      storeId: true,
                      quantity: true,
                    },
                  },
                },
              },
            },
          },
          distributions: {
            select: {
              id: true,
              distributionNumber: true,
              distributionDate: true,
              totalQuantity: true,
            },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.stockInward.count({ where }),
    ]);

    // Map inwards with calculated pending-to-distribute quantities
    const mapped = inwards.map((inw) => {
      let pendingQuantity = 0;
      let distributedQuantity = 0;

      inw.items.forEach((item) => {
        distributedQuantity += item.quantityDistributed || 0;
        pendingQuantity += Math.max(0, item.quantityInwarded - item.quantityDistributed);
      });

      return {
        ...inw,
        distributedQuantity,
        pendingQuantity,
      };
    });

    return res.json({
      success: true,
      data: mapped,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('getInwards error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stock inwards: ' + error.message,
    });
  }
};

/**
 * 3. GET SINGLE STOCK INWARD DETAILS
 */
export const getInwardById = async (req, res) => {
  try {
    const { id } = req.params;

    const inward = await prisma.stockInward.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                imageUrl: true,
                concentration: true,
                volumeMl: true,
                sellingPrice: true,
                stockQuantity: true,
                unallocatedStock: true,
                category: { select: { id: true, name: true } },
                stockBalances: {
                  select: {
                    storeId: true,
                    quantity: true,
                  },
                },
                stockBalances: {
                  include: { store: { include: { city: true } } },
                },
              },
            },
            distributions: {
              include: {
                distribution: true,
                store: { include: { city: true } },
              },
            },
          },
        },
        distributions: {
          include: {
            createdBy: { select: { id: true, name: true, email: true, role: true } },
            items: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
                store: { include: { city: true } },
              },
            },
          },
          orderBy: { distributionDate: 'desc' },
        },
      },
    });

    if (!inward) {
      return res.status(404).json({
        success: false,
        message: 'Stock inward consignment not found.',
      });
    }

    let pendingQuantity = 0;
    let distributedQuantity = 0;

    inward.items.forEach((item) => {
      distributedQuantity += item.quantityDistributed || 0;
      pendingQuantity += Math.max(0, item.quantityInwarded - item.quantityDistributed);
    });

    return res.json({
      success: true,
      data: {
        ...inward,
        distributedQuantity,
        pendingQuantity,
      },
    });
  } catch (error) {
    console.error('getInwardById error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch inward consignment details: ' + error.message,
    });
  }
};

/**
 * 4. DISTRIBUTE STOCK TO BOUTIQUE LOCATIONS
 * Dispatches stock from an inward consignment (Central Vault) to specific stores.
 * Atomically updates store stock balances, decrements central unallocated stock,
 * updates inward consignment status, and records distribution history.
 */
export const distributeInwardStock = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      notes,
      distributions, // array of { inwardItemId, storeId, quantity } OR { inwardItemId, allocations: { [storeId]: qty } }
    } = req.body;

    const inward = await prisma.stockInward.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!inward) {
      return res.status(404).json({
        success: false,
        message: 'Stock inward consignment not found.',
      });
    }

    if (inward.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot distribute stock from a cancelled inward consignment.',
      });
    }

    if (inward.status === 'FULLY_DISTRIBUTED') {
      return res.status(400).json({
        success: false,
        message: 'This inward consignment has already been fully distributed to locations.',
      });
    }

    if (!Array.isArray(distributions) || distributions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Distribution allocations are required.',
      });
    }

    // Normalize flattened allocation lines
    const normalizedAllocations = [];

    for (const d of distributions) {
      // Format A: { inwardItemId, allocations: { storeId: qty, ... } }
      if (d.allocations && typeof d.allocations === 'object') {
        for (const [sId, rawQty] of Object.entries(d.allocations)) {
          const qty = parseInt(rawQty, 10);
          if (!isNaN(qty) && qty > 0) {
            normalizedAllocations.push({
              inwardItemId: d.inwardItemId,
              storeId: sId,
              quantity: qty,
            });
          }
        }
      }
      // Format B: { inwardItemId, storeId, quantity }
      else if (d.storeId && d.quantity) {
        const qty = parseInt(d.quantity, 10);
        if (!isNaN(qty) && qty > 0) {
          normalizedAllocations.push({
            inwardItemId: d.inwardItemId,
            storeId: d.storeId,
            quantity: qty,
          });
        }
      }
    }

    if (normalizedAllocations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please allocate at least 1 unit to at least one boutique location.',
      });
    }

    // Validate that allocated quantities do NOT exceed available unallocated stock for each inward item
    const requestedByItem = {};
    for (const alloc of normalizedAllocations) {
      requestedByItem[alloc.inwardItemId] = (requestedByItem[alloc.inwardItemId] || 0) + alloc.quantity;
    }

    for (const [inwardItemId, requestedQty] of Object.entries(requestedByItem)) {
      const item = inward.items.find((it) => it.id === inwardItemId);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: `Inward item ID ${inwardItemId} does not belong to this inward consignment.`,
        });
      }

      const availableToDistribute = Math.max(0, item.quantityInwarded - item.quantityDistributed);
      if (requestedQty > availableToDistribute) {
        return res.status(400).json({
          success: false,
          message: `Cannot distribute ${requestedQty} units of '${item.product.name}'. Only ${availableToDistribute} units remain available in this consignment.`,
        });
      }
    }

    const distributionNumber = await generateNextDistributionNumber();
    let totalDistributionQty = 0;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create StockDistribution header
      const distHeader = await tx.stockDistribution.create({
        data: {
          distributionNumber,
          inwardId: inward.id,
          distributionDate: new Date(),
          notes: notes ? notes.trim() : `Dispatched from ${inward.inwardNumber}`,
          totalQuantity: 0, // updated below
          createdById: req.user?.id || null,
        },
      });

      // 2. Process each allocation
      for (const alloc of normalizedAllocations) {
        const item = inward.items.find((it) => it.id === alloc.inwardItemId);
        totalDistributionQty += alloc.quantity;

        // Verify store exists
        const store = await tx.store.findUnique({
          where: { id: alloc.storeId },
          select: { id: true, name: true, city: { select: { name: true } } },
        });

        if (!store) {
          throw new Error(`Boutique store with ID ${alloc.storeId} was not found.`);
        }

        // Create StockDistributionItem
        await tx.stockDistributionItem.create({
          data: {
            distributionId: distHeader.id,
            inwardItemId: alloc.inwardItemId,
            productId: item.productId,
            storeId: alloc.storeId,
            quantity: alloc.quantity,
          },
        });

        // Increment Store StockBalance
        await tx.stockBalance.upsert({
          where: {
            productId_storeId: {
              productId: item.productId,
              storeId: alloc.storeId,
            },
          },
          update: { quantity: { increment: alloc.quantity } },
          create: {
            productId: item.productId,
            storeId: alloc.storeId,
            quantity: alloc.quantity,
          },
        });

        // Increment total product stock and decrement unallocated central stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { increment: alloc.quantity },
            unallocatedStock: { decrement: alloc.quantity },
          },
        });

        // Increment quantityDistributed on StockInwardItem
        await tx.stockInwardItem.update({
          where: { id: alloc.inwardItemId },
          data: {
            quantityDistributed: { increment: alloc.quantity },
          },
        });

        // Log StockMovement of type TRANSFER
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            storeId: alloc.storeId,
            quantityChange: alloc.quantity,
            type: 'TRANSFER',
            referenceId: distributionNumber,
            notes: `Stock dispatched from Inward ${inward.inwardNumber} to ${store.city?.name || ''} - ${store.name}`,
            createdById: req.user?.id || null,
          },
        });
      }

      // Update totalQuantity on StockDistribution header
      await tx.stockDistribution.update({
        where: { id: distHeader.id },
        data: { totalQuantity: totalDistributionQty },
      });

      // 3. Check overall inward status
      const updatedItems = await tx.stockInwardItem.findMany({
        where: { inwardId: inward.id },
      });

      const allFullyDistributed = updatedItems.every(
        (it) => it.quantityDistributed >= it.quantityInwarded
      );

      const anyDistributed = updatedItems.some(
        (it) => it.quantityDistributed > 0
      );

      const newStatus = allFullyDistributed
        ? 'FULLY_DISTRIBUTED'
        : (anyDistributed ? 'PARTIALLY_DISTRIBUTED' : 'RECEIVED');

      await tx.stockInward.update({
        where: { id: inward.id },
        data: { status: newStatus },
      });

      return { distHeader, totalDistributionQty };
    });

    // Fetch full distribution with details
    const fullDist = await prisma.stockDistribution.findUnique({
      where: { id: result.distHeader.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        inward: { select: { id: true, inwardNumber: true, supplierName: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, volumeMl: true } },
            store: { include: { city: true } },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: `Stock distribution '${distributionNumber}' processed successfully (${result.totalDistributionQty} units allocated).`,
      data: fullDist,
    });
  } catch (error) {
    console.error('distributeInwardStock error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to distribute stock to locations: ' + error.message,
    });
  }
};

/**
 * 5. GET ALL DISTRIBUTION CHALLANS / DISPATCH HISTORY
 */
export const getDistributions = async (req, res) => {
  try {
    const {
      search,
      storeId,
      inwardId,
      page = 1,
      limit = 10,
    } = req.query;

    const where = {};

    if (inwardId) {
      where.inwardId = inwardId;
    }

    if (storeId) {
      where.items = { some: { storeId } };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { distributionNumber: { contains: q } },
        { notes: { contains: q } },
        { inward: { inwardNumber: { contains: q } } },
        { inward: { supplierName: { contains: q } } },
        { items: { some: { product: { name: { contains: q } } } } },
        { items: { some: { product: { sku: { contains: q } } } } },
        { items: { some: { store: { name: { contains: q } } } } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const [distributions, total] = await Promise.all([
      prisma.stockDistribution.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true, role: true } },
          inward: { select: { id: true, inwardNumber: true, supplierName: true, status: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, volumeMl: true, imageUrl: true } },
              store: { include: { city: true } },
            },
          },
        },
        orderBy: { distributionDate: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.stockDistribution.count({ where }),
    ]);

    return res.json({
      success: true,
      data: distributions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('getDistributions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch distribution records: ' + error.message,
    });
  }
};

/**
 * 6. GET INWARD & DISTRIBUTION KPI SUMMARY
 */
export const getInwardSummary = async (req, res) => {
  try {
    const [
      totalInwardsCount,
      receivedCount,
      partiallyDistributedCount,
      fullyDistributedCount,
      inwardItemsAgg,
      totalDistributionsCount,
      distributionsAgg,
      productsWithUnallocated,
    ] = await Promise.all([
      prisma.stockInward.count(),
      prisma.stockInward.count({ where: { status: 'RECEIVED' } }),
      prisma.stockInward.count({ where: { status: 'PARTIALLY_DISTRIBUTED' } }),
      prisma.stockInward.count({ where: { status: 'FULLY_DISTRIBUTED' } }),
      prisma.stockInwardItem.aggregate({
        _sum: {
          quantityInwarded: true,
          quantityDistributed: true,
          totalCost: true,
        },
      }),
      prisma.stockDistribution.count(),
      prisma.stockDistribution.aggregate({
        _sum: {
          totalQuantity: true,
        },
      }),
      prisma.product.findMany({
        where: {
          isActive: true,
          unallocatedStock: { gt: 0 },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          volumeMl: true,
          imageUrl: true,
          unallocatedStock: true,
          stockQuantity: true,
          category: { select: { name: true } },
        },
        orderBy: { unallocatedStock: 'desc' },
      }),
    ]);

    const totalInwardedUnits = inwardItemsAgg._sum.quantityInwarded || 0;
    const totalDistributedUnits = inwardItemsAgg._sum.quantityDistributed || 0;
    const totalUnallocatedUnits = Math.max(0, totalInwardedUnits - totalDistributedUnits);
    const totalInwardValuation = Number(inwardItemsAgg._sum.totalCost || 0);

    return res.json({
      success: true,
      data: {
        totalInwardsCount,
        receivedCount,
        partiallyDistributedCount,
        fullyDistributedCount,
        pendingConsignmentsCount: receivedCount + partiallyDistributedCount,
        totalInwardedUnits,
        totalDistributedUnits,
        totalUnallocatedUnits,
        totalInwardValuation,
        totalDistributionsCount,
        productsWithUnallocated,
      },
    });
  } catch (error) {
    console.error('getInwardSummary error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch inward summary KPIs: ' + error.message,
    });
  }
};
