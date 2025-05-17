// src/lib/types.ts

export type Conversation = {
	id: string; // UUID
	created_at: string; // ISO timestamp
	updated_at: string;
};

export type Summary = {
	id: string; // UUID
	conversation_id: string; // UUID
	summary: string;
	created_at: string;
	updated_at: string;
};

export type Message = {
	id: string; // UUID
	conversation_id: string; // UUID
	is_agent: boolean;
	content: string;
	created_at: string;
	updated_at: string;
};
