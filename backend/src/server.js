import './config/env.js';
import app from './app.js';
import { initLowStockCron } from './jobs/lowStockCron.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✨ JJ PERFUME ERP Backend is running on http://localhost:${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/v1/health`);

  // Initialize automated background Cron jobs
  initLowStockCron();
});
