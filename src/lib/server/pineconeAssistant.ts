// Pinecone Assistant API key
// You'll need to add your actual API key to .env file
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || '';

/**
 * Upload a file to the Pinecone Assistant
 * @param filePath Path to the file to upload
 * @param assistantId ID of the assistant (defaults to 'sidekickcx')
 */
export async function uploadFileToPinecone(filePath: string, assistantId: string = 'sidekickcx') {
  try {
    const formData = new FormData();
    
    // In a browser environment, you would use the File API
    // For Node.js, you would use the fs module to read the file
    // This is a simplified version
    const fileBlob = await fetch(filePath).then(r => r.blob());
    formData.append('file', fileBlob);
    
    const response = await fetch(`https://prod-1-data.ke.pinecone.io/assistant/files/${assistantId}`, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading file to Pinecone:', error);
    throw error;
  }
}

/**
 * Chat with the Pinecone Assistant
 * @param messages Array of message objects with role and content
 * @param model LLM model to use (defaults to 'gpt-4o')
 * @param stream Whether to stream the response (defaults to false)
 * @param assistantId ID of the assistant (defaults to 'sidekickcx')
 */
export async function chatWithPinecone(
  messages: Array<{role: 'user' | 'assistant', content: string}>,
  model: string = 'gpt-4o',
  stream: boolean = false,
  assistantId: string = 'sidekickcx'
) {
  try {
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
    
    if (!response.ok) {
      throw new Error(`Failed to chat with assistant: ${response.statusText}`);
    }
    
    if (stream) {
      // Return the stream for client-side processing
      return response;
    } else {
      return await response.json();
    }
  } catch (error) {
    console.error('Error chatting with Pinecone:', error);
    throw error;
  }
}

/**
 * Process a streamed response from the Pinecone Assistant
 * This function can be used client-side to handle streaming responses
 */
export async function handleStreamedResponse(response: Response, onChunk: (chunk: any) => void) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is null');
  
  const decoder = new TextDecoder();
  let buffer = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete chunks
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            onChunk(parsed);
          } catch (e) {
            console.error('Error parsing streaming data:', e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
} 