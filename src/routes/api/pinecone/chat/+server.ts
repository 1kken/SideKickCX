import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Hardcoded Pinecone API key
const PINECONE_API_KEY = 'pcsk_2nm9Xt_LwdC14C39DkR1noNYs6KHjbneS55wRcWKvgJ3P6zvxoV5dsz7hLzWUii3Uka7Bd';
// Debug line to check if the API key is available
console.log('PINECONE_API_KEY available?', !!PINECONE_API_KEY, 'Length:', PINECONE_API_KEY.length);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { messages, model = 'gpt-4o', stream = false, assistantId = 'sidekickcx' } = await request.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'Invalid or missing messages' }, { status: 400 });
    }
    
    console.log(`Sending request to Pinecone Assistant: ${assistantId}`);
    console.log('Messages:', JSON.stringify(messages));
    
    // Call Pinecone API directly
    const response = await fetch(`https://prod-1-data.ke.pinecone.io/assistant/chat/${assistantId}`, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages,
        stream,
        model
      })
    });
    
    // Debug line to see the response status
    console.log('Pinecone API Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinecone API Error:', response.status, errorText);
      return json(
        { error: `Failed to chat with assistant: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    if (stream) {
      // For streaming responses, return a ReadableStream
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }
    
    const responseData = await response.json();
    console.log('Pinecone API Response:', JSON.stringify(responseData));
    return json(responseData);
  } catch (error) {
    console.error('Error in Pinecone chat endpoint:', error);
    return json({ error: 'Failed to chat with assistant' }, { status: 500 });
  }
}; 