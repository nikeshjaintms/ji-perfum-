import { PrismaClient, Role, Concentration } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting JJ / J I PERFUME database seeding with Multi-City Architecture...');

  // 1. Seed Cities
  const citiesData = [
    { name: 'Mandvi', state: 'Gujarat', stateCode: '24', jurisdictionText: 'Subject to Mandvi Jurisdiction.' },
    { name: 'Mumbai', state: 'Maharashtra', stateCode: '27', jurisdictionText: 'Subject to Mumbai Jurisdiction.' },
    { name: 'Delhi', state: 'Delhi', stateCode: '07', jurisdictionText: 'Subject to Delhi Jurisdiction.' },
    { name: 'Bengaluru', state: 'Karnataka', stateCode: '29', jurisdictionText: 'Subject to Bengaluru Jurisdiction.' },
  ];

  const cities = {};
  for (const c of citiesData) {
    const city = await prisma.city.upsert({
      where: { name: c.name },
      update: c,
      create: c,
    });
    cities[c.name] = city;
  }
  console.log('✅ Multi-City entities seeded:', Object.keys(cities));

  // 2. Seed Stores / Warehouses
  const storesData = [
    {
      name: 'Mandvi Heritage Boutique',
      code: 'MANDVI-01',
      cityId: cities['Mandvi'].id,
      address: 'Heritage Bazar, Near Main Gate, Mandvi - 370465, Kutch, Gujarat',
      phone: '+91 98765 43210',
      gstin: '24AABCJ1234F1Z5',
      upiId: 'jiperfume.mandvi@icici',
      isRetailCounter: true,
    },
    {
      name: 'Mumbai Bandra Flagship',
      code: 'MUMBAI-01',
      cityId: cities['Mumbai'].id,
      address: 'Shop 12, Luxury Galleria, Linking Road, Bandra West, Mumbai - 400050',
      phone: '+91 98200 11223',
      gstin: '27AABCJ1234F1Z5',
      upiId: 'jiperfume.mumbai@icici',
      isRetailCounter: true,
    },
    {
      name: 'Delhi South Ext Boutique',
      code: 'DELHI-01',
      cityId: cities['Delhi'].id,
      address: 'D-14, South Extension Part II, New Delhi - 110049',
      phone: '+91 98112 34567',
      gstin: '07AABCJ1234F1Z5',
      upiId: 'jiperfume.delhi@icici',
      isRetailCounter: true,
    },
    {
      name: 'Bengaluru Indiranagar Outlet',
      code: 'BLR-01',
      cityId: cities['Bengaluru'].id,
      address: '100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru - 560038',
      phone: '+91 99001 12233',
      gstin: '29AABCJ1234F1Z5',
      upiId: 'jiperfume.blr@icici',
      isRetailCounter: true,
    },
  ];

  const stores = {};
  for (const s of storesData) {
    const store = await prisma.store.upsert({
      where: { code: s.code },
      update: s,
      create: s,
    });
    stores[s.code] = store;
  }
  console.log('✅ Multi-City Stores seeded');

  // 3. Seed Users with assigned store
  const passwordHash = await bcrypt.hash('admin123', 10);
  const cashierPasswordHash = await bcrypt.hash('cashier123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@jjperfume.com' },
    update: { assignedStoreId: stores['MANDVI-01'].id },
    create: {
      name: 'Super Admin',
      email: 'admin@jjperfume.com',
      passwordHash,
      role: Role.SUPER_ADMIN,
      assignedStoreId: stores['MANDVI-01'].id,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@jjperfume.com' },
    update: { assignedStoreId: stores['MANDVI-01'].id },
    create: {
      name: 'Mandvi Boutique Cashier',
      email: 'cashier@jjperfume.com',
      passwordHash: cashierPasswordHash,
      role: Role.CASHIER,
      assignedStoreId: stores['MANDVI-01'].id,
    },
  });

  console.log('✅ Users seeded with assigned stores');

  // 4. Seed Categories
  const categoriesData = [
    { name: 'Oriental & Oud', slug: 'oriental-oud', description: 'Deep, rich agarwood, royal amber, and exotic middle-eastern spices.' },
    { name: 'Floral & Rose', slug: 'floral-rose', description: 'Damask rose, jasmine sambac, iris and lush floral bouquets.' },
    { name: 'Fresh & Aquatic', slug: 'fresh-aquatic', description: 'Crisp bergamot, sea salt, marine breeze, and zesty citrus.' },
    { name: 'Woody & Amber', slug: 'woody-amber', description: 'Cedarwood, sandalwood, vetiver, and smoky warm amber.' },
    { name: 'Gourmand & Vanilla', slug: 'gourmand-vanilla', description: 'Madagascar vanilla, roasted tonka bean, dark cocoa and caramel.' },
  ];

  const categories = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categories[cat.slug] = created;
  }

  // 5. Seed Luxury Fragrances with city stock allocations
  const productsData = [
    {
      name: 'JJ Royal Oud Royale',
      sku: 'JJ-OUD-100',
      barcode: '890123456001',
      brand: 'J I PERFUME',
      description: 'Signature royal blend of aged Cambodian oud, smoked ambergris, and sweet Taif rose.',
      fragranceNotes: 'Top: Saffron, Bergamot | Heart: Taif Rose, Geranium | Base: Cambodian Oud, Amber, White Musk',
      concentration: Concentration.EXTRAIT_DE_PARFUM,
      volumeMl: 100,
      purchaseCost: 2800.00,
      sellingPrice: 7499.00,
      taxRate: 18.00,
      reorderLevel: 8,
      categoryId: categories['oriental-oud'].id,
      cityStocks: { 'MANDVI-01': 30, 'MUMBAI-01': 45, 'DELHI-01': 20, 'BLR-01': 15 },
    },
    {
      name: 'JJ Imperial Blue Azure',
      sku: 'JJ-AZUR-100',
      barcode: '890123456002',
      brand: 'J I PERFUME',
      description: 'Fresh aquatic luxury with crisp sea minerals, sparkling Italian lemon, and cedar.',
      fragranceNotes: 'Top: Calabrian Lemon, Sea Salt | Heart: Rosemary, Aquatic Breeze | Base: Atlas Cedar, Ambergris',
      concentration: Concentration.EAU_DE_PARFUM,
      volumeMl: 100,
      purchaseCost: 1900.00,
      sellingPrice: 5299.00,
      taxRate: 18.00,
      reorderLevel: 10,
      categoryId: categories['fresh-aquatic'].id,
      cityStocks: { 'MANDVI-01': 40, 'MUMBAI-01': 60, 'DELHI-01': 25, 'BLR-01': 20 },
    },
    {
      name: 'JJ Velvet Rose & Saffron',
      sku: 'JJ-ROSE-50',
      barcode: '890123456003',
      brand: 'J I PERFUME',
      description: 'An intoxicating bouquet of midnight blooming roses wrapped in precious Kashmiri saffron.',
      fragranceNotes: 'Top: Kashmiri Saffron, Pink Pepper | Heart: Damask Rose, Peony | Base: Sandalwood, Patchouli',
      concentration: Concentration.EAU_DE_PARFUM,
      volumeMl: 50,
      purchaseCost: 1400.00,
      sellingPrice: 3899.00,
      taxRate: 18.00,
      reorderLevel: 5,
      categoryId: categories['floral-rose'].id,
      cityStocks: { 'MANDVI-01': 25, 'MUMBAI-01': 35, 'DELHI-01': 15, 'BLR-01': 10 },
    },
    {
      name: 'JJ Santal Noir Prestige',
      sku: 'JJ-SANT-100',
      barcode: '890123456004',
      brand: 'J I PERFUME',
      description: 'Creamy Mysore sandalwood fused with roasted cardamom, iris, and leather notes.',
      fragranceNotes: 'Top: Cardamom, Violet Leaf | Heart: Tuscan Iris, Papyrus | Base: Mysore Sandalwood, Leather',
      concentration: Concentration.EXTRAIT_DE_PARFUM,
      volumeMl: 100,
      purchaseCost: 3100.00,
      sellingPrice: 8199.00,
      taxRate: 18.00,
      reorderLevel: 6,
      categoryId: categories['woody-amber'].id,
      cityStocks: { 'MANDVI-01': 20, 'MUMBAI-01': 28, 'DELHI-01': 12, 'BLR-01': 8 },
    },
    {
      name: 'JJ Golden Vanilla Elixir',
      sku: 'JJ-VANL-50',
      barcode: '890123456005',
      brand: 'J I PERFUME',
      description: 'Ultra-decadent Bourbon vanilla infused with toasted praline, cocoa butter, and blonde woods.',
      fragranceNotes: 'Top: Roasted Almond, Rum | Heart: Bourbon Vanilla, Heliotrope | Base: Tonka Bean, Benzoin',
      concentration: Concentration.EAU_DE_PARFUM,
      volumeMl: 50,
      purchaseCost: 1300.00,
      sellingPrice: 3499.00,
      taxRate: 18.00,
      reorderLevel: 10,
      categoryId: categories['gourmand-vanilla'].id,
      cityStocks: { 'MANDVI-01': 35, 'MUMBAI-01': 50, 'DELHI-01': 20, 'BLR-01': 15 },
    },
    {
      name: 'JJ Musk Al Khaleej Attar',
      sku: 'JJ-ATT-12',
      barcode: '890123456006',
      brand: 'J I PERFUME',
      description: 'Pure concentrated perfume oil with velvety soft white musk, lily of the valley, and amber.',
      fragranceNotes: 'Top: Lily of the Valley | Heart: White Lotus, Jasmine | Base: Royal White Musk, Sandalwood',
      concentration: Concentration.ATTAR_OIL,
      volumeMl: 12,
      purchaseCost: 650.00,
      sellingPrice: 1999.00,
      taxRate: 18.00,
      reorderLevel: 15,
      categoryId: categories['oriental-oud'].id,
      cityStocks: { 'MANDVI-01': 50, 'MUMBAI-01': 80, 'DELHI-01': 30, 'BLR-01': 25 },
    },
  ];

  for (const prod of productsData) {
    const { cityStocks, ...prodFields } = prod;
    const totalAggStock = Object.values(cityStocks).reduce((a, b) => a + b, 0);

    const product = await prisma.product.upsert({
      where: { sku: prod.sku },
      update: { ...prodFields, stockQuantity: totalAggStock },
      create: { ...prodFields, stockQuantity: totalAggStock },
    });

    // Seed location-wise stock balances
    for (const [storeCode, qty] of Object.entries(cityStocks)) {
      const store = stores[storeCode];
      if (store) {
        await prisma.stockBalance.upsert({
          where: {
            productId_storeId: {
              productId: product.id,
              storeId: store.id,
            },
          },
          update: { quantity: qty },
          create: {
            productId: product.id,
            storeId: store.id,
            quantity: qty,
            reorderLevel: prod.reorderLevel,
          },
        });
      }
    }
  }
  console.log('✅ Perfume Products & City-wise Stock Balances seeded');

  console.log('🎉 Multi-City Database Seeding Complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
