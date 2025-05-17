<script lang="ts">
  import { onMount } from 'svelte';
  
  let messages: Array<{role: 'user' | 'assistant', content: string}> = [];
  let inputMessage = '';
  let isLoading = false;
  let selectedFile: File | null = null;
  let uploadStatus = '';
  
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
          stream: false
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from assistant');
      }
      
      const data = await response.json();
      
      // Add assistant response to chat
      messages = [...messages, { role: 'assistant', content: data.choices[0].message.content }];
    } catch (error) {
      console.error('Error sending message:', error);
      messages = [...messages, { role: 'assistant', content: 'Sorry, there was an error processing your request.' }];
    } finally {
      isLoading = false;
    }
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