import { prisma } from '../../config/prisma.js';

export const getStores = async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      where: {
        isActive: true,
      },
      include: {
        city: true,
      },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: stores });
  } catch (error) {
    console.error('getStores error:', error);
    try {
      const fallbackStores = await prisma.$queryRawUnsafe(`
        SELECT s.*, 
               c.id AS city_id, 
               c.name AS city_name, 
               c.state AS city_state, 
               c.stateCode AS city_stateCode, 
               c.jurisdictionText AS city_jurisdictionText
        FROM stores s
        INNER JOIN cities c ON s.cityId = c.id
        WHERE s.isActive = 1
        ORDER BY s.name ASC
      `);
      const mapped = (fallbackStores || []).map((row) => ({
        ...row,
        city: {
          id: row.city_id,
          name: row.city_name,
          state: row.city_state,
          stateCode: row.city_stateCode,
          jurisdictionText: row.city_jurisdictionText,
        },
      }));
      return res.json({ success: true, data: mapped });
    } catch (fbErr) {
      return res.status(500).json({ success: false, message: 'Failed to fetch stores' });
    }
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
      return res.status(400).json({ success: false, message: 'City name is required.' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return res.status(400).json({ success: false, message: 'City name must be at least 2 characters.' });
    }

    const trimmedState = state?.trim() || 'Gujarat';
    if (trimmedState.length < 2) {
      return res.status(400).json({ success: false, message: 'State name must be at least 2 characters.' });
    }

    const trimmedStateCode = stateCode?.trim() || '24';
    if (!/^\d{2}$/.test(trimmedStateCode)) {
      return res.status(400).json({ success: false, message: 'State code (GST) must be a 2-digit number (e.g. 24).' });
    }

    const existing = await prisma.city.findFirst({
      where: {
        name: trimmedName,
      },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `City "${trimmedName}" already exists.` });
    }

    const city = await prisma.city.create({
      data: {
        name: trimmedName,
        state: trimmedState,
        stateCode: trimmedStateCode,
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
    const { name, code, cityId, cityName, state, stateCode, address, phone, gstin, upiId, isRetailCounter } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Store/Outlet name is required.' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      return res.status(400).json({ success: false, message: 'Store name must be at least 3 characters.' });
    }

    // Resolve or Auto-Create City
    let resolvedCity = null;
    if (cityId) {
      resolvedCity = await prisma.city.findUnique({ where: { id: cityId } });
    }

    if (!resolvedCity && cityName) {
      const cleanCityName = cityName.trim();
      resolvedCity = await prisma.city.findFirst({
        where: { name: cleanCityName },
      });

      if (!resolvedCity) {
        resolvedCity = await prisma.city.create({
          data: {
            name: cleanCityName,
            state: state?.trim() || 'Gujarat',
            stateCode: stateCode?.trim() || '24',
            jurisdictionText: `Subject to ${cleanCityName} Jurisdiction.`,
          },
        });
      }
    }

    if (!resolvedCity) {
      return res.status(400).json({ success: false, message: 'Please select a valid city for this boutique outlet.' });
    }

    // Check duplicate store name in the same city
    const existingStore = await prisma.store.findFirst({
      where: {
        cityId: resolvedCity.id,
        name: trimmedName,
      },
    });
    if (existingStore) {
      return res.status(400).json({
        success: false,
        message: `An outlet named "${trimmedName}" already exists in ${resolvedCity.name}.`,
      });
    }

    // Validate GSTIN if provided
    let trimmedGstin = gstin?.trim() ? gstin.trim().toUpperCase() : null;
    if (trimmedGstin) {
      if (trimmedGstin.length !== 15) {
        return res.status(400).json({
          success: false,
          message: `GSTIN must be exactly 15 characters (currently ${trimmedGstin.length}).`,
        });
      }

      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(trimmedGstin)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid GSTIN format (e.g. 24AABCJ1234F1Z5). Must follow statutory 15-char structure (2 state digits + 10-char PAN + entity + Z + check digit).',
        });
      }

      // Check state code consistency if city has stateCode
      if (resolvedCity.stateCode && trimmedGstin.slice(0, 2) !== resolvedCity.stateCode) {
        return res.status(400).json({
          success: false,
          message: `GSTIN state prefix "${trimmedGstin.slice(0, 2)}" does not match ${resolvedCity.name}'s state code "${resolvedCity.stateCode}".`,
        });
      }
    }

    // Validate Phone / Mobile Number
    let trimmedPhone = (phone || '').trim();
    if (!trimmedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone/Mobile number is required.',
      });
    }

    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    let standard10 = digitsOnly;
    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      standard10 = digitsOnly.slice(2);
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      standard10 = digitsOnly.slice(1);
    }

    if (standard10.length !== 10) {
      return res.status(400).json({
        success: false,
        message: `Phone number must be a valid 10-digit mobile number (currently ${standard10.length} digits).`,
      });
    }

    if (!/^[6-9]/.test(standard10)) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number must start with 6, 7, 8, or 9 (e.g. +91 98765 43210).',
      });
    }

    const formattedPhone = `+91 ${standard10.slice(0, 5)} ${standard10.slice(5)}`;

    // Validate UPI ID if provided
    let trimmedUpi = upiId?.trim() || 'jiperfume@icici';
    if (!trimmedUpi.includes('@') || trimmedUpi.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Invalid UPI ID format. Must include "@" (e.g. store@icici).',
      });
    }

    const storeCode = code?.trim() || `${trimmedName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}-${Date.now().toString().slice(-4)}`;

    const store = await prisma.store.create({
      data: {
        name: trimmedName,
        code: storeCode,
        cityId: resolvedCity.id,
        address: address?.trim() || `${trimmedName} Flagship Boutique`,
        phone: formattedPhone,
        gstin: trimmedGstin,
        upiId: trimmedUpi,
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
