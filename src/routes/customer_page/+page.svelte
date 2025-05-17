<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount, afterUpdate, onDestroy } from 'svelte';
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	
	export let form: Record<string, any> | undefined;
	
	type Message = {
		text: string;
		sender: 'user' | 'bot';
		id: string;
		timestamp: Date;
		isAgent?: boolean;
	};
	
	let messages: Message[] = [];
	let input = '';
	let userId: string | null = null;
	let ticketId: number | null = null;
	let showTicketForm = false;
	let ticketSubject = '';
	let isCreatingTicket = false;
	let messageContainer: HTMLDivElement;
	let isLoggedIn = false;
	let isLoading = false;
	let currentPriority: 'low' | 'medium' | 'high' = 'low';
	let ticketMessagesSubscription: any = null;
	
	// After any update, scroll to the bottom of the message container
	afterUpdate(() => {
		if (messageContainer) {
			messageContainer.scrollTop = messageContainer.scrollHeight;
		}
	});
	
	// Function to convert database messages to UI messages
	function formatChatbotMessages(logs: any[]): Message[] {
		return logs
			.filter(log => log.question.trim() !== '')
			.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
			.flatMap(log => {
				const msgs: Message[] = [{ 
					text: log.question, 
					sender: 'user', 
					id: `user-${log.id}`,
					timestamp: new Date(log.created_at)
				}];
				
				if (log.response) {
					msgs.push({ 
						text: log.response, 
						sender: 'bot', 
						id: `bot-${log.id}`,
						timestamp: new Date(log.created_at), 
						isAgent: log.handled_by === 'agent'
					});
				}
				
				return msgs;
			});
	}

	// Function to format ticket messages
	function formatTicketMessages(ticketMsgs: any[]): Message[] {
		return ticketMsgs.map(msg => ({
			text: msg.message,
			sender: msg.is_agent ? 'bot' : 'user',
			id: `ticket-${msg.id}`,
			timestamp: new Date(msg.sent_at),
			isAgent: msg.is_agent
		}));
	}
	
	// Function to subscribe to real-time ticket messages
	function subscribeToTicketMessages(ticketId: number) {
		// Clear any existing subscription
		if (ticketMessagesSubscription) {
			ticketMessagesSubscription.unsubscribe();
		}
		
		// Create a new subscription to the ticket_messages table
		ticketMessagesSubscription = supabase
			.channel(`ticket-messages-${ticketId}`)
			.on('postgres_changes', 
				{ 
					event: 'INSERT', 
					schema: 'public', 
					table: 'ticket_messages',
					filter: `ticket_id=eq.${ticketId}`
				}, 
				async (payload) => {
					console.log('New ticket message received:', payload);
					
					// Format the new message
					const newMessage = formatTicketMessages([payload.new])[0];
					
					// Only add the message if it's not from the current user or if it's from an agent
					// This prevents duplicating messages the user just sent
					const isCurrentUserMessage = !newMessage.isAgent && userId;
					if (newMessage.isAgent || !isCurrentUserMessage) {
						// Add the new message to the messages array
						messages = [...messages, newMessage];
						
						// Scroll to the bottom of the message container
						if (messageContainer) {
							setTimeout(() => {
								messageContainer.scrollTop = messageContainer.scrollHeight;
							}, 100);
						}
					}
				}
			)
			.subscribe();
	}
	
	// Function to load all messages (both chatbot logs and ticket messages)
	async function loadAllMessages() {
		if (!isLoggedIn || !userId) return;
		
		// Load recent messages from chatbot_logs
		const { data: recentLogs } = await supabase
			.from('chatbot_logs')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.limit(10);
			
		if (!recentLogs || recentLogs.length === 0) return;
		
		// Format chatbot messages
		let chatbotMessages = formatChatbotMessages(recentLogs);
		
		// If there's an active ticket, get ticket messages
		if (ticketId) {
			const { data: ticketMessages } = await supabase
				.from('ticket_messages')
				.select('*')
				.eq('ticket_id', ticketId)
				.order('sent_at', { ascending: true });
			
			if (ticketMessages && ticketMessages.length > 0) {
				// Format and add ticket messages
				const formattedTicketMessages = formatTicketMessages(ticketMessages);
				
				// Combine both sets of messages and sort by timestamp
				const allMessages = [...chatbotMessages, ...formattedTicketMessages];
				messages = allMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
			} else {
				messages = chatbotMessages;
			}
			
			// Subscribe to real-time updates for ticket messages
			subscribeToTicketMessages(ticketId);
		} else {
			messages = chatbotMessages;
		}
	}
	
	onMount(async () => {
		// Check if user ID exists in session storage
		if (browser) {
			userId = sessionStorage.getItem('userId');
			isLoggedIn = !!userId;
		}
		
		if (isLoggedIn && userId) {
			// Load recent messages if any
			const { data: recentLogs } = await supabase
				.from('chatbot_logs')
				.select('*')
				.eq('user_id', userId)
				.order('created_at', { ascending: false })
				.limit(10);
				
			if (recentLogs && recentLogs.length > 0) {
				// Get the most recent ticket ID if available
				const recentTicketLog = recentLogs.find(log => log.ticket_id);
				if (recentTicketLog) {
					ticketId = recentTicketLog.ticket_id;
					
					// Check if this ticket is still open
					const { data: ticketData } = await supabase
						.from('tickets')
						.select('status')
						.eq('id', ticketId)
						.single();
						
					if (ticketData && ticketData.status === 'closed') {
						ticketId = null; // Don't use closed tickets
					}
				}
				
				// Load all messages (both chatbot logs and ticket messages)
				await loadAllMessages();
			}
		} else {
			// Show authentication message immediately
			console.log('User not logged in');
			messages = [...messages, { 
				text: "Please sign in to continue this conversation and get support.", 
				sender: 'bot', 
				id: `auth-${Date.now()}`,
				timestamp: new Date()
			}];
		}
	});
	
	// Clean up subscription when component is destroyed
	onDestroy(() => {
		if (ticketMessagesSubscription) {
			ticketMessagesSubscription.unsubscribe();
		}
	});
	
	// Handle client-side form submission
	async function handleClientSubmission(event: Event) {
		event.preventDefault();
		if (input.trim()) {
			const messageText = input.trim();
			
			// Add to local messages array for immediate UI update
			messages = [...messages, { text: messageText, sender: 'user', id: `local-${Date.now()}`, timestamp: new Date() }];
			
			// Clear input field
			const submittedText = input;
			input = '';
			isLoading = true;
			
			if (isLoggedIn && userId) {
				try {
					// If there's an active ticket, send message to ticket_messages table
					if (ticketId) {
						// Ensure ticketId is a number
						const numericTicketId = typeof ticketId === 'string' ? parseInt(ticketId, 10) : ticketId;
						
						console.log('Active ticket detected:', numericTicketId);
						
						// Instead of looking up by auth_id, use the userId directly
						// The error showed that auth_id column doesn't exist
						console.log('Using userId directly:', userId);
						
						// Check if the ticket exists first
						const { data: ticketData, error: ticketError } = await supabase
							.from('tickets')
							.select('id, user_id')
							.eq('id', numericTicketId)
							.single();
							
						console.log('Ticket data:', ticketData, 'Error:', ticketError);
						
						if (ticketData) {
							// Use the user_id from the ticket
							const { error: insertError } = await supabase
								.from('ticket_messages')
								.insert({
									ticket_id: numericTicketId,
									sender_id: ticketData.user_id, // Use user_id from the ticket instead
									message: messageText,
									is_agent: false
								});
								
							console.log('Direct ticket_messages insert result:', insertError);
							
							// Add message to chatbot_logs without sending to Pinecone
							await supabase
								.from('chatbot_logs')
								.insert({
									user_id: userId,
									ticket_id: numericTicketId,
									question: messageText,
									response: null, // No response since this is handled via ticket
									handled_by: 'agent' // Mark as being handled by agent system
								});
							
							// No need to refresh messages manually, the subscription will handle it
							isLoading = false;
							return; // Skip the normal chatbot processing
						}
					}
					
					// Normal flow for chatbot processing (no active ticket)
					// Only send to Pinecone if there's no active ticket
					const response = await fetch('/api/customer/chat', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							message: messageText,
							userId: userId,
							ticketId: ticketId ? (typeof ticketId === 'string' ? parseInt(ticketId, 10) : ticketId) : undefined
						})
					});
					
					if (!response.ok) {
						throw new Error('Failed to process message');
					}
					
					const result = await response.json();
					
					if (result.success) {
						// Show bot response only if there is one (not for ticket messages)
						if (result.response) {
							messages = [...messages, { text: result.response, sender: 'bot', id: `bot-${Date.now()}`, timestamp: new Date() }];
						}
						
						// Update priority badge
						currentPriority = result.priority;
						
						// Show ticket form only if suggested and not repetitive
						if (result.suggestTicket) {
							setTimeout(() => {
								showTicketForm = true;
							}, 2000); // Give user time to read the response first
						}
					} else {
						throw new Error(result.error || 'Unknown error');
					}
				} catch (err) {
					console.error('Error in client message handling:', err);
					messages = [...messages, { text: "Sorry, I encountered an error processing your request.", sender: 'bot', id: `error-${Date.now()}`, timestamp: new Date() }];
				} finally {
					isLoading = false;
				}
			} else {
				// Handle unauthenticated user
				setTimeout(() => {
					messages = [...messages, { 
						text: "Please sign in to continue this conversation and get support.", 
						sender: 'bot', 
						id: `auth-${Date.now()}`,
						timestamp: new Date()
					}];
					isLoading = false;
				}, 1000);
			}
		}
	}
	
	// Cancel ticket creation
	function cancelTicketCreation() {
		showTicketForm = false;
		isCreatingTicket = false;
	}
	
	// Process form response after server action completes
	function handleFormSubmit() {
		return async ({ result }: { result: any }) => {
			if (result.type === 'success' && result.data) {
				const data = result.data;
				
				// If ticket was created, update ticket ID
				if (data.ticketId) {
					// Store as a number
					ticketId = typeof data.ticketId === 'string' ? parseInt(data.ticketId, 10) : data.ticketId;
					showTicketForm = false;
					
					console.log('Ticket created with ID:', ticketId);
					
					// Add confirmation message
					messages = [...messages, { 
						text: "Ticket #" + ticketId + " created successfully! An agent will respond to your issue soon.", 
						sender: 'bot', 
						id: `ticket-${Date.now()}`,
						timestamp: new Date()
					}];
					
					// Subscribe to the new ticket's messages
					if (ticketId !== null) {
						subscribeToTicketMessages(ticketId);
					}
				}
				
				// Reset form
				input = '';
			}
		};
	}

	// Handle agent response to ticket
	async function handleAgentResponse(ticketId: number, agentMessage: string, originalQuestion: string) {
		if (isLoggedIn && userId) {
			try {
				// Instead of looking up user by auth_id, check the ticket directly
				const { data: ticketData, error: ticketError } = await supabase
					.from('tickets')
					.select('id, user_id')
					.eq('id', ticketId)
					.single();
				
				console.log('Ticket data for agent response:', ticketData, 'Error:', ticketError);
				
				if (ticketData) {
					// Insert message into ticket_messages table using the ticket's user_id
					const { error: insertError } = await supabase
						.from('ticket_messages')
						.insert({
							ticket_id: ticketId,
							sender_id: ticketData.user_id,
							message: agentMessage,
							is_agent: true
						});
					
					console.log('Agent response insert result:', insertError);
					
					// No need to manually refresh - the subscription will handle it
					return !insertError;
				}
				return false;
			} catch (error) {
				console.error('Error logging agent response:', error);
				return false;
			}
		}
		return false;
	}
</script>

<!-- Background -->
<div class="h-screen w-full bg-gradient-to-br from-muted via-background to-muted flex items-center justify-center">
	<!-- Chat Container -->
	<div class="w-2/3 h-[80vh] bg-card text-card-foreground rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in fade-in zoom-in-75 duration-700">
		
		<!-- Header -->
		<div class="p-4 border-b border-border bg-card text-card-foreground flex justify-between items-center">
			<h1 class="text-xl font-semibold">Customer Service</h1>
			{#if ticketId}
				<div class="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
					Active Ticket #{ticketId}
				</div>
			{:else if currentPriority === 'high'}
				<div class="text-sm bg-red-100 text-red-800 px-2 py-1 rounded-full">
					High Priority
				</div>
			{:else if currentPriority === 'medium'}
				<div class="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
					Medium Priority
				</div>
			{:else}
				<div class="flex gap-2">
					<button
						on:click={() => {
							console.log('Current userId:', userId);
							console.log('Is logged in:', isLoggedIn);
						}}
						class="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs"
					>
						Debug
					</button>
				</div>
			{/if}
		</div>

		<!-- Messages -->
		<div bind:this={messageContainer} class="flex-1 overflow-y-auto px-4 py-2 space-y-2 bg-card" id="message-container">
			{#each messages as message (message.id)}
				<div class="flex {message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-300">
					<div class="max-w-[70%] px-4 py-2 rounded-2xl text-sm {
						message.sender === 'user' 
							? 'bg-primary text-primary-foreground rounded-br-none' 
							: message.isAgent
								? 'bg-yellow-500 text-white rounded-bl-none'
								: 'bg-secondary text-secondary-foreground rounded-bl-none'
					} shadow">
						{#if message.isAgent}
							<div class="text-xs mb-1 font-semibold">Agent</div>
						{/if}
						{message.text}
					</div>
				</div>
			{/each}
			
			{#if isLoading}
				<div class="flex justify-center py-4">
					<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
				</div>
			{/if}
		</div>
		
		<!-- Ticket Creation Form -->
		{#if showTicketForm}
			<div class="p-4 border-t border-border bg-muted">
				<form method="POST" use:enhance={handleFormSubmit}>
					<input type="hidden" name="userId" value={userId} />
					<input type="hidden" name="message" value={input || "I'd like to create a support ticket"} />
					<input type="hidden" name="createTicket" value="true" />
					
					<div class="mb-3">
						<label for="subject" class="block text-sm font-medium mb-1">Ticket Subject:</label>
						<input
							type="text"
							id="subject"
							name="subject"
							bind:value={ticketSubject}
							placeholder="Brief description of your issue"
							class="w-full p-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
							required
						/>
					</div>
					
					<div class="flex gap-2 justify-end">
						<button 
							type="button" 
							on:click={cancelTicketCreation}
							class="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-all duration-200"
						>
							Cancel
						</button>
						<button 
							type="submit"
							name="processMessage"
							value="true" 
							class="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 shadow"
						>
							Create Ticket
						</button>
					</div>
				</form>
			</div>
		{:else}
			<!-- Standard Message Input -->
			<form 
				on:submit={handleClientSubmission}
				class="p-4 border-t border-border bg-card flex gap-2"
			>
				<input type="hidden" name="ticketId" value={ticketId} />
				<input
					type="text"
					name="messageInput"
					bind:value={input}
					placeholder="Type a message..."
					class="flex-1 p-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground transition-all duration-200"
				/>
				<button
					type="submit"
					class="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 shadow"
					disabled={!isLoggedIn || isLoading}
				>
					Send
				</button>
			</form>
		{/if}
	</div>
</div>

<style>
	/* Make sure new messages are visible */
	#message-container {
		scroll-behavior: smooth;
	}
	
	#message-container::-webkit-scrollbar {
		width: 6px;
	}
	
	#message-container::-webkit-scrollbar-thumb {
		background-color: rgba(0, 0, 0, 0.2);
		border-radius: 3px;
	}
</style>
