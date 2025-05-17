import { error, redirect, type RequestHandler, type RequestEvent } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

// Server-side Supabase client with service role for admin operations
const supabaseAdmin = createClient(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY
);

// Pinecone API Key - in a real application, this should be in a secure environment variable
const PINECONE_API_KEY = 'pcsk_2nm9Xt_LwdC14C39DkR1noNYs6KHjbneS55wRcWKvgJ3P6zvxoV5dsz7hLzWUii3Uka7Bd';

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
async function summarizeConversation(messages: string[]): Promise<string> {
  try {
    // For simplicity, we're using the last message as the summary
    // In a real application, you might want to use an LLM to generate a proper summary
    const lastMessage = messages[messages.length - 1] || '';
    return lastMessage.substring(0, 100) + (lastMessage.length > 100 ? '...' : '');
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Failed to generate summary';
  }
}

// Default action handler for all POST requests to this route
export const actions = {
  default: async ({ request }: RequestEvent) => {
    console.log('Customer page POST action called');
    const formData = await request.formData();
    
    // Log all form data for debugging
    console.log('Form data received:');
    for (const pair of formData.entries()) {
      console.log(`${pair[0]}: ${pair[1]}`);
    }
    
    const isProcessMessage = formData.has('processMessage');
    const isAgentResponse = formData.has('agentResponse');
    
    // Handle agent responses (new code block for agent responses)
    if (isAgentResponse) {
      console.log('Processing agent response');
      const agentMessage = formData.get('agentMessage')?.toString();
      const ticketId = formData.get('ticketId')?.toString();
      const userId = formData.get('userId')?.toString();
      const originalQuestion = formData.get('originalQuestion')?.toString();
      
      if (!agentMessage || !ticketId || !userId) {
        console.error('Missing required fields for agent response');
        return { success: false, error: 'Agent message, ticket ID and user ID are required' };
      }
      
      try {
        // Log the agent's response in chatbot_logs
        const { data: logData, error: logError } = await supabaseAdmin
          .from('chatbot_logs')
          .insert({
            user_id: userId,
            ticket_id: ticketId,
            question: originalQuestion || 'Customer inquiry',
            response: agentMessage,
            handled_by: 'agent'
          })
          .select();
          
        if (logError) {
          console.error('Error logging agent response:', logError);
          return { success: false, error: 'Failed to log agent response' };
        }
        
        return {
          success: true,
          message: 'Agent response recorded successfully'
        };
      } catch (err) {
        console.error('Server error processing agent response:', err);
        return { success: false, error: 'Server error processing agent response' };
      }
    }
    
    if (!isProcessMessage) {
      console.log('Not a processMessage request, ignoring');
      return { success: false, error: 'Invalid request type' };
    }
    
    const message = formData.get('message')?.toString();
    const createTicket = formData.get('createTicket') === 'true';
    const userId = formData.get('userId')?.toString();
    
    if (!message || !userId) {
      console.error('Missing required fields:', { message, userId });
      return { success: false, error: 'Message and user ID are required' };
    }

    try {
      // Option 1: Create a new ticket
      if (createTicket) {
        console.log('Creating a new ticket');
        const subject = formData.get('subject')?.toString() || 'New Support Request';
        
        // Determine priority
        const priority = classifyPriority(message);
        
        // First create the ticket
        const { data: ticketData, error: ticketError } = await supabaseAdmin
          .from('tickets')
          .insert({
            user_id: userId,
            subject: subject,
            message: message,
            status: 'open',
            priority: priority
          })
          .select();
          
        if (ticketError) {
          console.error('Error creating ticket:', ticketError);
          return { success: false, error: 'Failed to create ticket' };
        }
        
        console.log('Ticket created successfully:', ticketData);
        
        // Then log the message in chatbot_logs with the new ticket ID
        const { error: logError } = await supabaseAdmin
          .from('chatbot_logs')
          .insert({
            user_id: userId,
            ticket_id: ticketData[0].id,
            question: message,
            response: 'Ticket created successfully. An agent will respond soon.',
            handled_by: 'chatbot'
          });
          
        if (logError) {
          console.error('Error logging message:', logError);
        }
        
        return {
          success: true,
          ticketId: ticketData[0].id,
          message: 'Ticket created successfully'
        };
      } 
      // Option 2: Process a message through Pinecone and handle based on repetition count
      else {
        console.log('Processing message for existing conversation');
        const ticketId = formData.get('ticketId')?.toString();
        
        // Check user interaction history to see if this is a repeated question
        const { data: userInteractions } = await supabaseAdmin
          .from('user_interactions')
          .select('*')
          .eq('user_id', userId)
          .ilike('question_text', `%${message.substring(0, 20)}%`)
          .limit(1);
        
        let hasHighRepetition = false;
        let repetitionCount = 1;
        
        if (userInteractions && userInteractions.length > 0) {
          repetitionCount = userInteractions[0].repetition_count + 1;
          hasHighRepetition = repetitionCount > 2; // Check if user has asked similar question more than twice
        }
        
        // Track this interaction
        await trackUserInteraction(userId, message, repetitionCount);
        
        // Get related product/order information if this is a repeated question
        let contextData = {};
        if (hasHighRepetition) {
          // Query relevant tables to provide context
          const { data: productData } = await supabaseAdmin
            .from('products')
            .select('*')
            .limit(5);
            
          const { data: orderData } = await supabaseAdmin
            .from('orders')
            .select('*, order_items(*), shipping_details(*)')
            .eq('user_id', userId)
            .limit(5);
            
          contextData = {
            products: productData || [],
            orders: orderData || []
          };
        }
        
        // Determine message priority
        const priority = classifyPriority(message);
        
        // Now prepare to call Pinecone
        let responseMessage = '';
        
        try {
          // Create a system message with context if this is a repeated question
          const systemMessage = hasHighRepetition 
            ? `The user has asked this or a similar question ${repetitionCount} times. Here's context from their account: ${JSON.stringify(contextData)}`
            : 'You are a helpful customer service assistant.';
            
          // Call Pinecone API through our endpoint (similar to pinecone/+page.svelte)
          const pineconePayload = {
            messages: [
              { role: 'system', content: systemMessage },
              { role: 'user', content: message }
            ],
            model: 'gpt-4o',
            stream: false,
            userId: userId
          };
          
          // For now, we'll simulate the pinecone response since we don't have a direct endpoint call
          // In a real implementation, you would call your Pinecone endpoint
          
          // Simulated Pinecone response based on context
          let responseContent = hasHighRepetition
            ? `Based on your previous questions about this topic, I can see that you have ${(contextData as any).orders?.length || 0} orders in our system. `
            : `Thank you for your question. `;
            
          responseContent += "Here's the answer to your query: " + message;
          
          // If high priority, suggest creating a ticket
          if (priority === 'high') {
            responseContent += "\n\nI notice this is a high priority issue. Would you like to create a support ticket so our team can assist you more directly?";
          }
          
          responseMessage = responseContent;
        } catch (error) {
          console.error('Error calling Pinecone:', error);
          responseMessage = "I'm sorry, I had trouble processing your question. Please try again later.";
        }
        
        // Insert the conversation record
        const { data: chatLogData, error: logError } = await supabaseAdmin
          .from('chatbot_logs')
          .insert({
            user_id: userId,
            ticket_id: ticketId || null,
            question: message,
            response: responseMessage,
            handled_by: 'chatbot'
          })
          .select();
          
        if (logError) {
          console.error('Error logging message:', logError);
          return { success: false, error: 'Failed to log message' };
        }
        
        // Prepare the summary for user_interactions table
        const recentMessages = [message];
        const summary = await summarizeConversation(recentMessages);
        
        return {
          success: true,
          message: 'Message processed successfully',
          response: responseMessage,
          priority: priority,
          highRepetition: hasHighRepetition,
          repetitionCount: repetitionCount
        };
      }
    } catch (err) {
      console.error('Server error processing message:', err);
      return { success: false, error: 'Server error processing message' };
    }
  }
};

// Helper function to track user interaction patterns
async function trackUserInteraction(userId: string, question: string, currentCount: number = 1): Promise<void> {
  // Check if similar question exists
  const { data: existingInteractions } = await supabaseAdmin
    .from('user_interactions')
    .select('*')
    .eq('user_id', userId)
    .ilike('question_text', `%${question.substring(0, 20)}%`)
    .limit(1);
    
  if (existingInteractions && existingInteractions.length > 0) {
    // Update existing interaction
    const interaction = existingInteractions[0];
    await supabaseAdmin
      .from('user_interactions')
      .update({
        repetition_count: currentCount,
        last_asked: new Date().toISOString()
      })
      .eq('id', interaction.id);
  } else {
    // Create new interaction record
    await supabaseAdmin
      .from('user_interactions')
      .insert({
        user_id: userId,
        question_text: question,
        repetition_count: 1,
        summary: question.substring(0, 50) // Simple summary for now
      });
  }
} 