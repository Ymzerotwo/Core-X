import { createClient, SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { logger } from './logger.js';

dotenv.config();

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  throw new Error(`❌ CRITICAL: Missing required env vars: ${missingEnv.join(', ')}`);
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const serviceName = process.env.SERVICE_NAME || 'Core-X-Backend';

const clientOptions: SupabaseClientOptions<'public'> = {
  auth: {
    autoRefreshToken: false, 
    persistSession: false,   
  },
  global: {
    headers: { 'x-my-service': serviceName },
  },
};

export const adminDB = createClient(supabaseUrl, supabaseKey, clientOptions);
export const getAdminDB = (): SupabaseClient => adminDB;

let publicClientInstance: SupabaseClient | null = null;

if (supabaseAnonKey) {
  publicClientInstance = createClient(supabaseUrl, supabaseAnonKey, clientOptions);
  logger.info(`[Supabase] 👤 Public client initialized.`);
}


export const getPublicDB = (): SupabaseClient => {
  if (!publicClientInstance) {
    throw new Error('🚫 Public Supabase client is not available. Check SUPABASE_ANON_KEY.');
  }
  return publicClientInstance;
};

export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await adminDB.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;
    logger.info('[Supabase] 🚀 Admin Connection verified.');
    return true;
  } catch (err: any) {
    logger.error('[Supabase] Connection failed', { error: err.message });
    return false;
  }
};
