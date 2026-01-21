import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { logger } from './logger.js';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.error('❌ CRITICAL: Supabase URL or Service Role Key is missing from .env file!');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: { 'x-my-service': process.env.SERVICE_NAME || 'Core-X-Backend' },
  },
});

const projectId = supabaseUrl.split('//')[1].split('.')[0];
logger.info(`[Supabase] Admin client initialized for project: ${projectId}`);

export const testSupabaseConnection = async () => {
  try {
    logger.debug('[Supabase] Testing connection...');
    const { error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;
    logger.info('[Supabase] 🚀 Connection successful (Admin Privileges Verified)');
    return true;
  } catch (err: any) {
    logger.error('[Supabase] Connection test failed', { error: err.message });
    return false;
  }
};

if (process.env.TEST_SUPABASE_ON_START === 'true') {
  testSupabaseConnection().then((success) => {
    if (!success && process.env.NODE_ENV === 'production') {
      logger.warn('[Supabase] ⚠️ Starting server despite connection failure (Production Mode)');
    }
  });
}

export default supabaseAdmin;

/*
 * ==============================================================================
 * ⚡ Supabase Admin Configuration (by Ym_zerotwo)
 * ==============================================================================
 *
 * This file initializes a high-privilege Supabase client (Service Role) specifically
 * designed for backend operations. It allows the server to bypass Row Level Security (RLS)
 * to perform administrative tasks (e.g., managing users, deleting data across tenants).
 *
 * ⚙️ Config & Mechanics:
 * 1. Environment Loading: Reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from .env.
 * 2. Client Initialization:
 *    - `persistSession: false`: Server-side clients must be stateless. We use tokens from the request, not a local session file.
 *    - `autoRefreshToken: false`: Service Role keys don't expire, so we disable auto-refresh overhead.
 * 3. Connection Test (`testSupabaseConnection`):
 *    - Performs a lightweight call (`listUsers`) on startup to verify credentials.
 *    - Fails fast (exits process) if keys are missing in production.
 *
 * 📂 External Dependencies:
 * - `@supabase/supabase-js`: The official SDK.
 * - `dotenv`: For loading environment variables.
 * - `./logger.js`: To log connection status and errors.
 *
 * 🔒 Security Features:
 * - **Key Validation**: Checks for key presence before attempting connection.
 * - **Privilege Isolation**: This client is EXCLUSIVE to the backend. It is never exposed to the frontend.
 * - **Statelessness**: Prevents memory leaks and session confusion by disabling persistence.
 *
 * 🚀 Usage:
 * - `const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);`
 */