import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Hardcoded Pinecone API key
const PINECONE_API_KEY = 'pcsk_2nm9Xt_LwdC14C39DkR1noNYs6KHjbneS55wRcWKvgJ3P6zvxoV5dsz7hLzWUii3Uka7Bd';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const assistantId = formData.get('assistantId') as string || 'sidekickcx';
    
    if (!file || !(file instanceof File)) {
      return json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Create a new FormData instance for the Pinecone API
    const pineconeFormData = new FormData();
    pineconeFormData.append('file', file);
    
    try {
      console.log(`Uploading file to Pinecone Assistant: ${assistantId}`);
      console.log('PINECONE_API_KEY available?', !!PINECONE_API_KEY, 'Length:', PINECONE_API_KEY.length);
      
      const response = await fetch(`https://prod-1-data.ke.pinecone.io/assistant/files/${assistantId}`, {
        method: 'POST',
        headers: {
          'Api-Key': PINECONE_API_KEY
        },
        body: pineconeFormData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Pinecone API Error:', response.status, errorText);
        throw new Error(`Failed to upload file: ${response.statusText} - ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('Pinecone API Response:', JSON.stringify(responseData));
      return json(responseData);
    } catch (error) {
      console.error('Error uploading file to Pinecone:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in Pinecone file upload endpoint:', error);
    return json({ error: 'Failed to upload file to assistant' }, { status: 500 });
  }
}; 