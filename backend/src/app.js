import './config/env.js';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import productsRoutes from './modules/products/products.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';
import storesRoutes from './modules/stores/stores.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import inwardRoutes from './modules/inward/inward.routes.js';
import { prisma } from './config/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const invoicesDir = path.resolve(__dirname, '../invoices');
const reportsDir = path.resolve(__dirname, '../reports');

const app = express();
app.disable('x-powered-by');

// Serve local invoice PDFs & inventory reports statically with directory index listing disabled
app.use('/invoices', express.static(invoicesDir, { dotfiles: 'ignore', index: false }));
app.use('/reports', express.static(reportsDir, { dotfiles: 'ignore', index: false }));

// Security & CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/v1/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: 'healthy',
      app: 'J I PERFUME ERP API',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message,
    });
  }
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/stores', storesRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/inward', inwardRoutes);

// Centralized 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

export default app;
