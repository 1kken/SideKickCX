import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Initialize Supabase client
const supabase = createClient(
  PUBLIC_SUPABASE_URL, 
  PUBLIC_SUPABASE_ANON_KEY
);

// Hardcoded Pinecone API key - in a real application, use environment variables
const PINECONE_API_KEY = 'pcsk_2nm9Xt_LwdC14C39DkR1noNYs6KHjbneS55wRcWKvgJ3P6zvxoV5dsz7hLzWUii3Uka7Bd';
const PINECONE_ASSISTANT_ID = 'sidekickcx';

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
async function trackUserInteraction(userId: string, question: string): Promise<{
  repetitionCount: number;
  hasHighRepetition: boolean;
}> {
  try {
    // Check if similar question exists
    const { data: existingInteractions } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', userId)
      .ilike('question_text', `%${question.substring(0, 20)}%`)
      .limit(1);
      
    let repetitionCount = 1;
    let hasHighRepetition = false;
    
    if (existingInteractions && existingInteractions.length > 0) {
      // Update existing interaction
      const interaction = existingInteractions[0];
      repetitionCount = interaction.repetition_count + 1;
      hasHighRepetition = repetitionCount > 2;
      
      await supabase
        .from('user_interactions')
        .update({
          repetition_count: repetitionCount,
          last_asked: new Date().toISOString()
        })
        .eq('id', interaction.id);
    } else {
      // Create new interaction record
      await supabase
        .from('user_interactions')
        .insert({
          user_id: userId,
          question_text: question,
          repetition_count: 1,
          summary: question.substring(0, 50) // Simple summary for now
        });
    }
    
    return { repetitionCount, hasHighRepetition };
  } catch (error) {
    console.error('Error tracking user interaction:', error);
    return { repetitionCount: 1, hasHighRepetition: false };
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { message, userId, ticketId } = await request.json();
    
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return json({ error: 'Invalid or missing message' }, { status: 400 });
    }
    
    if (!userId) {
      return json({ error: 'User ID is required' }, { status: 400 });
    }
    
    console.log(`Processing customer query for user ${userId}: "${message}"`);
    
    // Check if there's an active ticket - if so, we shouldn't process with Pinecone
    // Messages for active tickets should be handled by the ticket_messages table directly
    if (ticketId) {
      console.log(`Active ticket ID ${ticketId} detected. Skipping Pinecone processing.`);
      
      // Just store the message in chatbot_logs without a response
      try {
        const { error: logError } = await supabase
          .from('chatbot_logs')
          .insert({
            user_id: userId,
            ticket_id: ticketId,
            question: message,
            response: null, // No response since this is handled via ticket
            handled_by: 'agent' // Mark as being handled by agent system
          });
          
        if (logError) {
          console.error('Error logging chat for ticketed message:', logError);
        }
      } catch (dbError) {
        console.error('Exception during database insertion for ticketed message:', dbError);
      }
      
      return json({
        success: true,
        // Don't send any response, just wait for the agent reply
        response: null,
        priority: "medium",
        ticketId: ticketId
      });
    }
    
    // Step 1: Track this interaction and check repetition count
    const { repetitionCount, hasHighRepetition } = await trackUserInteraction(userId, message);
    console.log(`Repetition count: ${repetitionCount}, High repetition: ${hasHighRepetition}`);
    
    // Step 2: Prepare context data for repeated questions
    let contextData = {};
    if (hasHighRepetition) {
      // Query relevant tables to provide context about products, orders, etc.
      const promises = [
        supabase.from('products').select('*').limit(5),
        supabase.from('orders').select('*, order_items(*), shipping_details(*)').eq('user_id', userId).limit(3),
        supabase.from('chatbot_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)
      ];
      
      const [productsResult, ordersResult, logsResult] = await Promise.all(promises);
      
      contextData = {
        products: productsResult.data || [],
        orders: ordersResult.data || [],
        previousConversations: logsResult.data || []
      };
    }
    
    // Step 3: Prepare messages for Pinecone
    const messages = [
      {
        role: 'user',
        content: message
      }
    ];
    
    console.log('Sending messages to Pinecone:', JSON.stringify(messages.map(m => ({ role: m.role, content_length: m.content.length }))));
    // Step 4: Call Pinecone Assistant API
    console.log('Calling Pinecone Assistant API');
    const response = await fetch(`https://prod-1-data.ke.pinecone.io/assistant/chat/${PINECONE_ASSISTANT_ID}`, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages,
        stream: false,
        model: 'gpt-4o'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinecone API Error:', response.status, errorText);
      return json(
        { error: `Failed to chat with assistant: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    // Step 5: Process Pinecone response
    const pineconeData = await response.json();
    console.log('Pinecone API Response (raw):', JSON.stringify(pineconeData));
    
    // Extract actual response content from Pinecone
    let responseContent = '';
    if (pineconeData.answer) {
      console.log('Using pineconeData.answer:', pineconeData.answer);
      responseContent = pineconeData.answer;
    } else if (pineconeData.message && pineconeData.message.content) {
      console.log('Using pineconeData.message.content:', pineconeData.message.content);
      responseContent = pineconeData.message.content;
    } else if (pineconeData.choices && pineconeData.choices[0]?.message?.content) {
      console.log('Using pineconeData.choices[0].message.content:', pineconeData.choices[0].message.content);
      responseContent = pineconeData.choices[0].message.content;
    } else {
      console.log('No valid response format found, using fallback message');
      responseContent = "I'm sorry, I couldn't generate a specific answer at this moment. Please try asking your question again.";
    }
    
    // Double-check that we have a response
    if (!responseContent || responseContent.trim() === '') {
      console.error('Empty response content extracted from Pinecone response');
      responseContent = "I'm sorry, there was an issue with processing your request. Please try again.";
    }
    
    console.log('Final extracted response content:', responseContent);
    
    // Step 6: Classify priority
    const priority = classifyPriority(message);
    console.log(`Query classified as ${priority} priority`);
    
    // Step 7: For high priority questions, suggest creating a ticket only if not repetitive
    let suggestTicket = false;
    if (priority === 'high' && repetitionCount < 2) {
      responseContent += "\n\nI notice this is a high priority issue. Would you like to create a support ticket so our team can assist you more directly?";
      suggestTicket = true;
    } else if (priority === 'high' && repetitionCount >= 2) {
      // For repetitive high-priority questions, provide more context but don't suggest ticket
      responseContent += "\n\nI notice you've asked similar questions before. Let me try to provide a more detailed answer based on your previous interactions.";
    }
    
    // Step 8: Get summary of conversation
    const summary = await summarizeConversation([
      { role: 'user', content: message },
      { role: 'assistant', content: responseContent }
    ]);
    
    console.log('Preparing to insert into chatbot_logs:', {
      user_id: userId,
      question: message,
      response_length: responseContent.length
    });

    // Step 9: Store the interaction in the database
    try {
      const { data: insertData, error: logError } = await supabase
        .from('chatbot_logs')
        .insert({
          user_id: userId,
          ticket_id: ticketId || null,
          question: message,
          response: responseContent,
          handled_by: 'chatbot'
        })
        .select();
        
      if (logError) {
        console.error('Error logging chat:', logError);
      } else {
        console.log('Successfully inserted chat log, ID:', insertData?.[0]?.id);
      }
    } catch (dbError) {
      console.error('Exception during database insertion:', dbError);
    }
    
    // Step 10: Return the final response
    return json({
      success: true,
      response: responseContent,
      priority,
      repetitionCount,
      hasHighRepetition,
      suggestTicket: suggestTicket
    });
    
  } catch (error) {
    console.error('Error in customer chat endpoint:', error);
    return json({ 
      error: 'Failed to process your message',
      success: false
    }, { status: 500 });
  }
}; 