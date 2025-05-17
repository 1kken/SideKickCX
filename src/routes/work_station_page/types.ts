export type Ticket = {
	id: number;
	user_id: number;
	subject: string;
	message: string;
	messages: Array<{ sender: string; text: string }>;
	status: 'open' | 'closed' | 'pending'; // Extend as needed
	priority: 'low' | 'medium' | 'high'; // Extend as needed
	escalated: boolean;
	created_at: string; // ISO 8601 timestamp
	aiResponses?: Array<{ sender: string; text: string }>;
};
