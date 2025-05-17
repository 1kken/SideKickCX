// +page.server.ts
import { supabase } from '$lib/supabaseClient';
import type { Instrument } from '$lib/types';

export async function load() {
	const { data, error } = await supabase.from('instruments').select();

	if (error) {
		return { instruments: [] as Instrument[] };
	}

	return {
		instruments: data as Instrument[]
	};
}
