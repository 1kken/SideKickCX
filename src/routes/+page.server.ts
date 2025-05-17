// +page.server.ts
import { supabase } from '$lib/supabaseClient';
import type { Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {};

export const actions: Actions = {
	login: async (event) => {
		console.log('login action');
	}
};
