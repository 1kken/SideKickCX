import { supabase } from '$lib/supabaseClient';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();
    
    if (!email || !password) {
      return fail(400, { 
        error: true, 
        message: 'Email and password are required' 
      });
    }

    try {
      console.log('Attempting login with email:', email);
      
      // Query the users table directly to find a user with the provided email and password
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      console.log('Query result - users:', users);
      console.log('Query result - error:', error);

      if (error || !users) {
        return fail(401, { 
          error: true, 
          message: 'Invalid email or password'
        });
      }

      // Set session cookie or token if needed
      // cookies.set('session', token, { path: '/' });
      
      // Return successful response with user ID and redirect info
      // The client will use this data to store userId in sessionStorage and redirect
      return {
        success: true,
        userId: users.id,
        redirectTo: '/customer_page'
      };
      
      // Alternative approach: direct server-side redirect
      // Uncomment this and remove the return above if you prefer server-side redirect
      // throw redirect(302, '/customer_page');
      
    } catch (err) {
      console.error('Login error:', err);
      return fail(500, { 
        error: true, 
        message: 'An unexpected error occurred'
      });
    }
  }
}; 