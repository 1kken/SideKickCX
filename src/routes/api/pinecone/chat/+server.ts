import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { chatWithPinecone } from '$lib/server/pineconeAssistant';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { messages, model = 'gpt-4o', stream = false, assistantId = 'sidekickcx' } = await request.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'Invalid or missing messages' }, { status: 400 });
    }
    
    const response = await chatWithPinecone(messages, model, stream, assistantId);
    
    if (stream) {
      // For streaming responses, we need to return a ReadableStream
      // SvelteKit handles this differently, but this is a simplified example
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }
    
    return json(response);
  } catch (error) {
    console.error('Error in Pinecone chat endpoint:', error);
    return json({ error: 'Failed to chat with assistant' }, { status: 500 });
  }
}; 