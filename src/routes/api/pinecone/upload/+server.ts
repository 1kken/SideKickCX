import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { uploadFileToPinecone } from '$lib/server/pineconeAssistant';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const assistantId = formData.get('assistantId') as string || 'sidekickcx';
    
    if (!file || !(file instanceof File)) {
      return json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Save the file temporarily to process it
    // This is a simplified example - in a real application, you would need to handle this differently
    // based on the platform you're running on (Node.js, browser, etc.)
    const filePath = URL.createObjectURL(file);
    
    try {
      const response = await uploadFileToPinecone(filePath, assistantId);
      // Clean up the temporary file URL
      URL.revokeObjectURL(filePath);
      return json(response);
    } catch (error) {
      // Clean up the temporary file URL in case of error
      URL.revokeObjectURL(filePath);
      throw error;
    }
  } catch (error) {
    console.error('Error in Pinecone file upload endpoint:', error);
    return json({ error: 'Failed to upload file to assistant' }, { status: 500 });
  }
}; 