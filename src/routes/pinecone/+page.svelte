<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  let messages: Array<{role: 'user' | 'assistant', content: string}> = [];
  let inputMessage = '';
  let isLoading = false;
  let selectedFile: File | null = null;
  let uploadStatus = '';
  let userId: string | null = null;
  let isLoggedIn = false;
  let showTicketForm = false;
  let ticketSubject = '';
  
  onMount(() => {
    if (browser) {
      // Check if user is logged in from session storage
      userId = sessionStorage.getItem('userId');
      isLoggedIn = !!userId;
      console.log('User logged in status:', isLoggedIn, userId);
    }
  });
  
  async function sendMessage() {
    if (!inputMessage.trim()) return;
    
    // Add user message to the chat
    messages = [...messages, { role: 'user', content: inputMessage }];
    const userMessage = inputMessage;
    inputMessage = '';
    isLoading = true;
    
    try {
      const response = await fetch('/api/pinecone/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: messages,
          model: 'gpt-4o',
          stream: false,
          userId: userId // Include userId if available
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response from server:', errorData);
        throw new Error(errorData.error || 'Failed to get response from assistant');
      }
      
      const data = await response.json();
      console.log('Response received:', data);
      
      let assistantResponse = '';
      
      // Add assistant response to chat - try all potential response formats
      if (data.answer) {
        // Standard format from Pinecone Assistant
        assistantResponse = data.answer;
      } else if (data.message && data.message.content) {
        // Current Pinecone Assistant format
        assistantResponse = data.message.content;
      } else if (data.choices && data.choices[0] && data.choices[0].message) {
        // OpenAI-like format fallback
        assistantResponse = data.choices[0].message.content;
      } else if (data.error) {
        // Error message
        assistantResponse = `Error: ${data.error}`;
        console.error('Error in response:', data.error);
      } else {
        // If we can't determine the format, use a fallback message
        console.log('Unexpected response format:', data);
        assistantResponse = "I'm sorry, I couldn't process your request properly. Please try asking again.";
      }
      
      // Add the response to messages array
      if (assistantResponse) {
        messages = [...messages, { role: 'assistant', content: assistantResponse }];
      }
      
      // If high priority, show ticket form
      if (data.priority === 'high' && isLoggedIn) {
        showTicketForm = true;
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      messages = [...messages, { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your request. Please try again in a moment.' 
      }];
    } finally {
      isLoading = false;
    }
  }
  
  async function createTicket() {
    if (!userId || !ticketSubject.trim()) return;
    
    isLoading = true;
    
    try {
      // Get the last question from messages
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
      
      const formData = new FormData();
      formData.append('processMessage', 'true');
      formData.append('createTicket', 'true');
      formData.append('userId', userId);
      formData.append('subject', ticketSubject);
      formData.append('message', lastUserMessage);
      
      const response = await fetch('/customer_page', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to create ticket');
      }
      
      const result = await response.json();
      
      if (result.success) {
        messages = [...messages, { 
          role: 'assistant', 
          content: 'Ticket created successfully! Our support team will review your issue shortly.' 
        }];
        showTicketForm = false;
        ticketSubject = '';
      } else {
        throw new Error(result.error || 'Failed to create ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      messages = [...messages, { 
        role: 'assistant', 
        content: 'Sorry, there was an error creating your support ticket. Please try again later.' 
      }];
    } finally {
      isLoading = false;
    }
  }
  
  function cancelTicketCreation() {
    showTicketForm = false;
    ticketSubject = '';
  }
  
  async function uploadFile() {
    if (!selectedFile) return;
    
    uploadStatus = 'Uploading...';
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    try {
      const response = await fetch('/api/pinecone/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload file');
      }
      
      const data = await response.json();
      uploadStatus = 'File uploaded successfully!';
      console.log('Upload response:', data);
    } catch (error) {
      console.error('Error uploading file:', error);
      uploadStatus = 'Failed to upload file.';
    }
  }
  
  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      selectedFile = input.files[0];
    }
  }
</script>

<div class="container mx-auto p-4 max-w-3xl">
  <h1 class="text-2xl font-bold mb-6">Pinecone Assistant Chat</h1>
  
  {#if !isLoggedIn}
    <div class="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
      <p class="text-yellow-700">Please log in to save your conversations and get personalized support.</p>
    </div>
  {/if}
  
  <div class="mb-6">
    <h2 class="text-xl font-semibold mb-2">Upload File to Assistant</h2>
    <div class="flex items-center gap-4">
      <input type="file" on:change={handleFileSelect} class="border rounded p-2" />
      <button 
        on:click={uploadFile} 
        disabled={!selectedFile}
        class="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
      >
        Upload
      </button>
    </div>
    {#if uploadStatus}
      <p class="mt-2">{uploadStatus}</p>
    {/if}
  </div>
  
  <div class="border rounded-lg p-4 h-[400px] overflow-y-auto mb-4 bg-gray-50">
    {#if messages.length === 0}
      <p class="text-gray-500 italic">No messages yet. Start a conversation!</p>
    {:else}
      {#each messages as message}
        <div class="mb-4">
          <div class="font-semibold">{message.role === 'user' ? 'You' : 'Assistant'}</div>
          <div class="p-3 rounded-lg {message.role === 'user' ? 'bg-blue-100' : 'bg-green-100'}">
            {message.content}
          </div>
        </div>
      {/each}
    {/if}
    
    {#if isLoading}
      <div class="flex justify-center my-4">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    {/if}
  </div>
  
  {#if showTicketForm}
    <div class="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
      <h3 class="text-lg font-semibold mb-2">Create a Support Ticket</h3>
      <div class="mb-3">
        <label for="ticketSubject" class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
        <input 
          type="text" 
          id="ticketSubject" 
          bind:value={ticketSubject} 
          placeholder="Brief description of your issue"
          class="w-full p-2 border rounded-lg"
        />
      </div>
      <div class="flex gap-2">
        <button 
          on:click={createTicket} 
          disabled={!ticketSubject.trim() || isLoading}
          class="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
        >
          Create Ticket
        </button>
        <button 
          on:click={cancelTicketCreation}
          disabled={isLoading} 
          class="bg-gray-200 text-gray-800 px-4 py-2 rounded disabled:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  {/if}
  
  <div class="flex gap-2">
    <input
      type="text"
      bind:value={inputMessage}
      placeholder="Type your message..."
      class="flex-1 border rounded-lg p-2"
      on:keypress={(e) => e.key === 'Enter' && sendMessage()}
    />
    <button
      on:click={sendMessage}
      disabled={isLoading || !inputMessage.trim()}
      class="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:bg-gray-300"
    >
      Send
    </button>
  </div>
</div> 