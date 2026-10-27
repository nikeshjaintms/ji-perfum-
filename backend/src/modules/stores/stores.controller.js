import { prisma } from '../../config/prisma.js';

export const getStores = async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      where: { isActive: true },
      include: {
        city: true,
      },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: stores });
  } catch (error) {
    console.error('getStores error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch stores' });
  }
};

export const getCities = async (req, res) => {
  try {
    const cities = await prisma.city.findMany({
      include: {
        stores: {
          where: { isActive: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: cities });
  } catch (error) {
    console.error('getCities error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch cities' });
  }
};

export const getStoreDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const store = await prisma.store.findUnique({
      where: { id },
      include: { city: true },
    });
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }
    return res.json({ success: true, data: store });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch store details' });
  }
};

export const createCity = async (req, res) => {
  try {
    const { name, state, stateCode, jurisdictionText } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'City name is required' });
    }

    const trimmedName = name.trim();
    const existing = await prisma.city.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `City "${trimmedName}" already exists.` });
    }

    const city = await prisma.city.create({
      data: {
        name: trimmedName,
        state: state?.trim() || 'Gujarat',
        stateCode: stateCode?.trim() || '24',
        jurisdictionText: jurisdictionText?.trim() || `Subject to ${trimmedName} Jurisdiction.`,
      },
    });

    return res.status(201).json({ success: true, data: city, message: 'City created successfully' });
  } catch (error) {
    console.error('createCity error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create city: ' + error.message });
  }
};

export const createStore = async (req, res) => {
  try {
    const { name, code, cityId, address, phone, gstin, upiId, isRetailCounter } = req.body;
    if (!name || !name.trim() || !cityId) {
      return res.status(400).json({ success: false, message: 'Store name and city are required' });
    }

    const trimmedName = name.trim();
    const storeCode = code?.trim() || `${trimmedName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}-${Date.now().toString().slice(-4)}`;

    const store = await prisma.store.create({
      data: {
        name: trimmedName,
        code: storeCode,
        cityId,
        address: address?.trim() || `${trimmedName} Flagship Boutique`,
        phone: phone?.trim() || '+91 98765 43210',
        gstin: gstin?.trim() || null,
        upiId: upiId?.trim() || 'jjperfumes@icici',
        isRetailCounter: isRetailCounter ?? true,
      },
      include: {
        city: true,
      },
    });

    return res.status(201).json({ success: true, data: store, message: 'Boutique outlet created successfully' });
  } catch (error) {
    console.error('createStore error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create store: ' + error.message });
  }
};

