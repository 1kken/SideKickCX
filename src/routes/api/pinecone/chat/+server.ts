import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Initialize Supabase client
const supabase = createClient(
  PUBLIC_SUPABASE_URL, 
  PUBLIC_SUPABASE_ANON_KEY
);

// Hardcoded Pinecone API key
const PINECONE_API_KEY = 'pcsk_2nm9Xt_LwdC14C39DkR1noNYs6KHjbneS55wRcWKvgJ3P6zvxoV5dsz7hLzWUii3Uka7Bd';
// Debug line to check if the API key is available
console.log('PINECONE_API_KEY available?', !!PINECONE_API_KEY, 'Length:', PINECONE_API_KEY.length);

// Helper function to classify priority based on message content
function classifyPriority(message: string): 'low' | 'medium' | 'high' {
  const lowPriorityKeywords = ['how to', 'what is', 'where can I find', 'information', 'learn', 'guide'];
  const highPriorityKeywords = ['urgent', 'emergency', 'immediately', 'broke', 'error', 'not working', 'failed', 'issue', 'problem', 'critical', 'broken', 'crash', 'fix', 'serious'];
  
  message = message.toLowerCase();
  
  if (highPriorityKeywords.some(keyword => message.includes(keyword))) {
    return 'high';
  } else if (lowPriorityKeywords.some(keyword => message.includes(keyword))) {
    return 'low';
  } else {
    return 'medium';
  }
}

// Helper function to generate a summary of the conversation
async function summarizeConversation(messages: Array<{role: string, content: string}>): Promise<string> {
  try {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    return lastUserMessage.substring(0, 100) + (lastUserMessage.length > 100 ? '...' : '');
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Failed to generate summary';
  }
}

// Helper function to track user interaction patterns
async function trackUserInteraction(userId: string, question: string): Promise<void> {
  try {
    // Check if similar question exists
    const { data: existingInteractions } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', userId)
      .ilike('question_text', `%${question.substring(0, 20)}%`)
      .limit(1);
      
    if (existingInteractions && existingInteractions.length > 0) {
      // Update existing interaction
      const interaction = existingInteractions[0];
      await supabase
        .from('user_interactions')
        .update({
          repetition_count: interaction.repetition_count + 1,
          last_asked: new Date().toISOString()
        })
        .eq('id', interaction.id);
        
      console.log(`Updated repetition_count for interaction ${interaction.id} to ${interaction.repetition_count + 1}`);
    } else {
      // Create new interaction record
      const { data, error } = await supabase
        .from('user_interactions')
        .insert({
          user_id: userId,
          question_text: question,
          repetition_count: 1,
          summary: question.substring(0, 50) // Simple summary for now
        });
        
      if (error) {
        console.error('Error creating interaction:', error);
      } else {
        console.log('Created new user interaction record');
      }
    }
  } catch (error) {
    console.error('Error tracking user interaction:', error);
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { messages, model = 'gpt-4o', stream = false, assistantId = 'sidekickcx', userId } = await request.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'Invalid or missing messages' }, { status: 400 });
    }
    
    console.log(`Sending request to Pinecone Assistant: ${assistantId}`);
    console.log('Messages:', JSON.stringify(messages));
    
    // Get the latest user message
    const latestUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    let finalMessages = [...messages];
    let useContextFromDatabase = false;
    let additionalResponse = '';
    
    // Check user interaction history if userId is provided
    if (userId) {
      // Check if this is a repeated question
      const { data: userInteractions } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', userId)
        .ilike('question_text', `%${latestUserMessage.substring(0, 20)}%`)
        .limit(1);
      
      if (userInteractions && userInteractions.length > 0) {
        const repetitionCount = userInteractions[0].repetition_count;
        
        if (repetitionCount >= 2) {
          useContextFromDatabase = true;
          console.log(`Detected repeated question (${repetitionCount} times). Using chat logs as context.`);
          
          // Get previous conversations on the same topic
          const { data: chatLogs } = await supabase
            .from('chatbot_logs')
            .select('*')
            .eq('user_id', userId)
            .ilike('question', `%${latestUserMessage.substring(0, 20)}%`)
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (chatLogs && chatLogs.length > 0) {
            // Add context from previous conversations
            const contextMessage = {
              role: 'system',
              content: `The user has asked similar questions before. Here are previous responses: ${
                chatLogs.map(log => `Q: ${log.question} A: ${log.response}`).join(' | ')
              }`
            };
            finalMessages = [contextMessage, ...messages];
          }
        }
      }
    }
    
    console.log('Final messages sent to Pinecone:', JSON.stringify(finalMessages));
    
    // Call Pinecone API with potentially modified messages
    const response = await fetch(`https://prod-1-data.ke.pinecone.io/assistant/chat/${assistantId}`, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: finalMessages,
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
    
    // Process non-streamed response
    let responseData = await response.json();
    console.log('Pinecone API Response (raw):', JSON.stringify(responseData));
    
    // If Pinecone doesn't provide a clear response, use a fallback
    if (!responseData.answer && !responseData.message?.content && 
        (!responseData.choices || !responseData.choices[0]?.message?.content)) {
      console.warn('No clear response found in Pinecone result, using fallback');
      
      // Create a fallback response
      responseData = {
        answer: "I'm sorry, I couldn't generate a specific answer at this moment. Please try asking your question again or rephrase it."
      };
    }
    
    // Classify priority of the question
    const priority = classifyPriority(latestUserMessage);
    console.log(`Question priority classified as: ${priority}`);
    
    // Get summary of conversation
    const summary = await summarizeConversation(messages);
    
    // For high priority, suggest creating a ticket
    if (priority === 'high' && userId) {
      additionalResponse = "\n\nI notice this is a high priority issue. Would you like to create a support ticket so our team can assist you more directly?";
      
      if (responseData.answer) {
        responseData.answer += additionalResponse;
      } else if (responseData.message && responseData.message.content) {
        responseData.message.content += additionalResponse;
      }
    }
    
    // Store the interaction in the database if userId provided
    if (userId) {
      // Extract the actual response content for storage
      const responseContent = responseData.answer || 
                 (responseData.message && responseData.message.content) || 
                 (responseData.choices && responseData.choices[0]?.message?.content) ||
                 'No response content found';
      
      console.log('Storing response in database:', responseContent);
      
      // Track user interaction first
      await trackUserInteraction(userId, latestUserMessage);
      
      // Log the conversation
      const { error: logError } = await supabase
        .from('chatbot_logs')
        .insert({
          user_id: userId,
          question: latestUserMessage,
          response: responseContent,
          handled_by: 'chatbot',
          summary: summary
        });
      
      if (logError) {
        console.error('Error logging chat:', logError);
      }
    }
    
    // Include priority information in the response
    responseData.priority = priority;
    responseData.useContextFromDatabase = useContextFromDatabase;
    
    console.log('Final response sent to client:', JSON.stringify(responseData));
    return json(responseData);
  } catch (error) {
    console.error('Error in Pinecone chat endpoint:', error);
    return json({ 
      error: 'Failed to chat with assistant',
      answer: "I'm sorry, there was an error processing your request. Please try again later."
    }, { status: 500 });
  }
}; 