// +page.server.ts
import { supabase } from '$lib/supabaseClient';
import { redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	throw redirect(302, '/home_page');
};

export const actions: Actions = {
	login: async (event) => {
		console.log('login action');
	}
};
