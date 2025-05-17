import type { PageServerLoad, Actions } from './$types';
import { supabase } from '$lib/supabaseClient';
import type { Ticket } from './types';
import { fail } from '@sveltejs/kit';

export const load = (async ({ fetch }) => {
	try {
		// Fetch tickets
		const { data: ticketsData, error: ticketsError } = await supabase
			.from('tickets')
			.select('*');

		if (ticketsError) {
			console.error('Error fetching tickets:', ticketsError);
			return { tickets: [] as Ticket[] };
		}

		// Fetch messages for all tickets
		const { data: messagesData, error: messagesError } = await supabase
			.from('ticket_messages')
			.select('*')
			.order('sent_at', { ascending: true });

		if (messagesError) {
			console.error('Error fetching messages:', messagesError);
		}

		// Group messages by ticket_id
		const messagesByTicket = (messagesData || []).reduce((acc, message) => {
			if (!acc[message.ticket_id]) {
				acc[message.ticket_id] = [];
			}
			acc[message.ticket_id].push({
				sender: message.is_agent ? 'agent' : 'user',
				text: message.message
			});
			return acc;
		}, {});

		// Initialize messages array if it's not present
		const ticketsWithMessages = (ticketsData || []).map(ticket => {
			const ticketMessages = messagesByTicket[ticket.id] || [];
			// If no messages in DB but ticket has message field, add it as first message
			if (ticketMessages.length === 0 && ticket.message) {
				ticketMessages.push({ sender: 'user', text: ticket.message });
			}
			
			return {
				...ticket,
				messages: ticketMessages
			};
		});

		return { tickets: ticketsWithMessages as Ticket[] };
	} catch (err) {
		console.error('Unexpected error in load function:', err);
		return { tickets: [] as Ticket[] };
	}
}) satisfies PageServerLoad;

// Function to get all context for a specific customer
async function getCustomerContext(customerId: number) {
	try {
		// Get user details
		const { data: userData, error: userError } = await supabase
			.from('users')
			.select('*')
			.eq('id', customerId)
			.single();

		if (userError) {
			console.error('Error fetching user:', userError);
			return null;
		}
		
		// Get user's orders and related information
		const { data: ordersData, error: ordersError } = await supabase
			.from('orders')
			.select(`
				*,
				order_items (
					*,
					product:products (*)
				),
				shipping_details (*),
				payments (*)
			`)
			.eq('user_id', customerId);

		if (ordersError) {
			console.error('Error fetching orders:', ordersError);
		}

		// Get previous tickets and interactions
		const { data: previousTickets, error: ticketsError } = await supabase
			.from('tickets')
			.select(`
				*,
				messages:ticket_messages (*)
			`)
			.eq('user_id', customerId)
			.order('created_at', { ascending: false });

		if (ticketsError) {
			console.error('Error fetching previous tickets:', ticketsError);
		}

		// Get chatbot interactions
		const { data: chatbotLogs, error: chatbotError } = await supabase
			.from('chatbot_logs')
			.select('*')
			.eq('user_id', customerId)
			.order('created_at', { ascending: false });

		if (chatbotError) {
			console.error('Error fetching chatbot logs:', chatbotError);
		}

		// Get user interactions (FAQs, etc.)
		const { data: userInteractions, error: interactionsError } = await supabase
			.from('user_interactions')
			.select('*')
			.eq('user_id', customerId);

		if (interactionsError) {
			console.error('Error fetching user interactions:', interactionsError);
		}

		return {
			user: userData,
			orders: ordersData || [],
			previousTickets: previousTickets || [],
			chatbotLogs: chatbotLogs || [],
			userInteractions: userInteractions || []
		};
	} catch (err) {
		console.error('Error getting customer context:', err);
		return null;
	}
}

export const actions: Actions = {
	sendMessage: async ({ request }) => {
		console.log('Form submission received');
		const formData = await request.formData();
		
		// Log all form data for debugging
		for (const pair of formData.entries()) {
			console.log(`${pair[0]}: ${pair[1]}`);
		}
		
		const ticketId = Number(formData.get('ticketId'));
		const message = formData.get('message') as string;
		const userId = Number(formData.get('userId'));
		const isAgent = formData.get('isAgent') === 'true';  // Fix the boolean conversion

		console.log('Parsed values:', { ticketId, message, userId, isAgent });

		if (!ticketId || !message || !userId) {
			console.error('Missing required fields', { ticketId, message, userId });
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			console.log('Attempting to insert message into database');
			// Insert message into ticket_messages table
			const { data, error } = await supabase
				.from('ticket_messages')
				.insert({
					ticket_id: ticketId,
					sender_id: userId,
					message,
					is_agent: isAgent
				});

			if (error) {
				console.error('Error sending message:', error);
				return fail(500, { error: 'Failed to send message' });
			}

			console.log('Message sent successfully:', data);
			return { success: true };
		} catch (err) {
			console.error('Unexpected error in sendMessage action:', err);
			return fail(500, { error: 'An unexpected error occurred' });
		}
	},
	
	getAiResponse: async ({ request }) => {
		const formData = await request.formData();
		const ticketId = Number(formData.get('ticketId'));
		const query = formData.get('query') as string;
		const userId = Number(formData.get('userId'));
		
		console.log('Received AI query request:', { ticketId, query, userId });
		
		if (!ticketId || !query || !userId) {
			console.error('Missing required fields:', { ticketId, query, userId });
			return { success: true, aiResponse: "I couldn't process that query. Missing required information." };
		}
		
		try {
			// First, get ticket details to get user ID
			const { data: ticketData, error: ticketError } = await supabase
				.from('tickets')
				.select('user_id')
				.eq('id', ticketId)
				.single();
				
			if (ticketError) {
				console.error('Error fetching ticket:', ticketError);
				return { success: true, aiResponse: "I couldn't retrieve ticket information. Please try again." };
			}
			
			const customerId = ticketData.user_id;
			console.log('Found customer ID:', customerId);
			
			// Save the query to agent_queries table
			try {
				await supabase
					.from('agent_queries')
					.insert({
						agent_id: userId,
						customer_id: customerId,
						ticket_id: ticketId,
						query_text: query
					});
			} catch (queryError) {
				console.error('Error saving agent query:', queryError);
				// Continue anyway - this is not critical
			}
			
			// TEMPORARY SOLUTION: Return a mock response until Pinecone API is properly configured
			console.log('Returning mock response instead of calling Pinecone API');
			
			// Create a contextual response based on the query
			let mockResponse = '';
			
			const queryLower = query.toLowerCase();
			if (queryLower.includes('order') && (queryLower.includes('moving') || queryLower.includes('status'))) {
				mockResponse = `Based on the customer's record (ID: ${customerId}), their most recent order (Order #${ticketId + 100}) is currently showing as "processing". The delay appears to be due to a stock verification issue with one of the items. The warehouse team has been notified and they should update the status within 24 hours.`;
			} else if (queryLower.includes('customer') || queryLower.includes('history')) {
				mockResponse = `Customer ${customerId} has been with us for about 6 months. They've placed 3 orders totaling approximately $1,200. Their previous support tickets were mostly about delivery timing questions. No major issues have been reported before this current ticket.`;
			} else if (queryLower.includes('payment') || queryLower.includes('refund')) {
				mockResponse = `According to our records, the customer has used credit card payments for all past orders. Their last payment of $349.99 was processed successfully on ${new Date(Date.now() - 7*24*60*60*1000).toLocaleDateString()}. There are no pending refunds or disputed charges on their account.`;
			} else if (queryLower.includes('address') || queryLower.includes('shipping')) {
				mockResponse = `The customer's shipping address is listed as "123 Example St, Anytown, USA". Their most recent order is set to be delivered to this address. Past orders have been successfully delivered to the same location with no reported issues.`;
			} else {
				mockResponse = `I've analyzed the customer's history and current ticket. This appears to be related to their recent order from last week. Their order status is currently "processing" and they've contacted support once before about shipping times. The customer has purchased several items from our Electronics category in the past.`;
			}
			
			console.log('Returning mock response:', mockResponse);
			
			// Return successful response with the mock data
			return {
				success: true,
				aiResponse: mockResponse
			};
			
		} catch (err) {
			console.error('Error in getAiResponse action:', err);
			return { 
				success: true, 
				aiResponse: "I'm having trouble accessing the customer information system right now. Please try again in a moment."
			};
		}
	}
};
