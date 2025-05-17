import { supabase } from '$lib/supabaseClient';
import type { PageServerLoad } from './$types';

export const load = (async () => {
  try {
    // Simple query to verify connection
    const { data, error } = await supabase
      .from('users')
      .select('count()', { count: 'exact' });
      
    if (error) {
      return {
        status: 'error',
        message: error.message,
        details: error
      };
    }
    
    return {
      status: 'success',
      data,
      message: 'Successfully connected to Supabase'
    };
  } catch (e) {
    console.error('Supabase connection test error:', e);
    return {
      status: 'error',
      message: e instanceof Error ? e.message : 'Unknown error occurred',
      details: e
    };
  }
}) satisfies PageServerLoad; 