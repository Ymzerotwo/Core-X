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
    headers: { 'x-my-service': 'Core-X-Backend' },
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
  } catch (err) {
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
 * designed for backend operations. It bypasses Row Level Security (RLS).
 *
 * 🔐 Security & Architecture:
 * - Uses `SERVICE_ROLE_KEY`: Grants full admin access to the database.
 * - `persistSession: false`: CRITICAL setting. The backend is stateless; we do
 * not store admin session tokens on the server file system to prevent leaks.
 * - `autoRefreshToken: false`: Service Role keys do not expire, so refresh is disabled.
 *
 * 🚀 Usage Examples:
 * ------------------
 * 1. Import the admin client:
 * import supabaseAdmin from '../config/supabase.js';
 *
 * 2. Database Operations (Bypassing RLS):
 * // This will return data even if RLS policies usually forbid it
 * const { data, error } = await supabaseAdmin.from('private_table').select('*');
 *
 * 3. Auth Administration (Manage Users):
 * // Create or delete users programmatically
 * const { data } = await supabaseAdmin.auth.admin.createUser({ email: '...', password: '...' });
 * const { error } = await supabaseAdmin.auth.admin.deleteUser('user_uuid');
 *
 * 🧪 Connection Testing:
 * ----------------------
 * The file includes a `testSupabaseConnection()` function that verifies the
 * Service Role Key validity by attempting a lightweight admin operation on startup.
 *
 * ⚠️ WARNING:
 * Never expose the `supabaseAdmin` client or the Service Role Key to the client-side
 * (Browser/Mobile App). It has full control over your database.
 */