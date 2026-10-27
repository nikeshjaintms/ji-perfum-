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
