import type { PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '$env/static/private';

export type Ticket = {
	id: number;
	user_id: number;
	subject: string;
	message: string;
	status: 'open' | 'closed' | 'pending'; // Extend as needed
	priority: 'low' | 'medium' | 'high'; // Extend as needed
	escalated: boolean;
	created_at: string; // ISO 8601 timestamp
};

export const load = (async () => {
	const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

	const { data, error } = await supabase
		.from('tickets') // 👈 Apply the Ticket type here
		.select('*');

	if (error) {
		console.error('Error fetching tickets:', error);
		return { tickets: [] as Ticket[] }; // 👈 Explicitly typed empty array
	}

	return { tickets: data as Ticket[] };
}) satisfies PageServerLoad;
