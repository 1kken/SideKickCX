// +page.server.ts
import { supabase } from '$lib/supabaseClient';
import type { Instrument } from '$lib/types';
import type { Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const { data, error } = await supabase.from('instruments').select();

	if (error) {
		return { instruments: [] as Instrument[] };
	}

	return {
		instruments: data as Instrument[]
	};
};

export const actions: Actions = {
	login: async (event) => {
		console.log('login action');
	}
};
