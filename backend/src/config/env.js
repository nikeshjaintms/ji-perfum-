import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../../');

// Default to 'development' if NODE_ENV is not explicitly set
const nodeEnv = process.env.NODE_ENV || 'development';

// 1. Load environment-specific file first (e.g. .env.production or .env.development)
dotenv.config({ path: path.join(backendRoot, `.env.${nodeEnv}`) });

// 2. Fallback to generic .env for any unassigned variables
dotenv.config({ path: path.join(backendRoot, '.env') });

export const isProduction = nodeEnv === 'production';
export const isDevelopment = nodeEnv === 'development';
export const currentEnv = nodeEnv;

console.log(`🔧 Environment loaded: [${nodeEnv.toUpperCase()}]`);
