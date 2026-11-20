/**
 * Standalone Runner for Low Stock WhatsApp Alert Cron Job
 * Usage: node src/jobs/runLowStockJob.js [--dry-run]
 */

import '../config/env.js';
import { runLowStockCheckJob } from './lowStockCron.js';

const isDryRun = process.argv.includes('--dry-run');

console.log(`Starting manual Low Stock WhatsApp check (Dry Run: ${isDryRun})...`);

runLowStockCheckJob({ dryRun: isDryRun })
  .then((res) => {
    console.log('Result:', JSON.stringify(res, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal Error:', err);
    process.exit(1);
  });
