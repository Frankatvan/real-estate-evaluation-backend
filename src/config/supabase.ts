import { createClient } from '@supabase/supabase-js';
import logger from './logger';

/**
 * Supabase Configuration
 * Database and authentication service configuration
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Supabase connection test
 */
export const testSupabaseConnection = async () => {
  try {
    const { error } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    if (error) {
      logger.error('Supabase connection test failed', { error: error.message });
      return false;
    }

    logger.info('Supabase connection test successful');
    return true;
  } catch (error: any) {
    logger.error('Supabase connection test failed', { error: error.message });
    return false;
  }
};

/**
 * Supabase health check
 */
export const supabaseHealthCheck = async () => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    const status = !error && data !== null ? 'healthy' : 'unhealthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      error: error?.message
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
};