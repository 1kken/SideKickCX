<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { onMount, afterUpdate } from 'svelte';
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	
	export let form: Record<string, any> | undefined;
	
	type Message = {
		text: string;
		sender: 'user' | 'bot';
		id: string;
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
	
	// After any update, scroll to the bottom of the message container
	afterUpdate(() => {
		if (messageContainer) {
			messageContainer.scrollTop = messageContainer.scrollHeight;
		}
	});
	
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
				
				// Format and display messages
				messages = recentLogs
					.filter(log => log.question.trim() !== '')
					.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
					.flatMap(log => {
						const msgs: Message[] = [{ 
							text: log.question, 
							sender: 'user', 
							id: `user-${log.id}` 
						}];
						
						if (log.response) {
							msgs.push({ 
								text: log.response, 
								sender: 'bot', 
								id: `bot-${log.id}` 
							});
						}
						
						return msgs;
					});
			}
		} else {
			// Show authentication message immediately
			console.log('User not logged in');
			messages = [...messages, { 
				text: "Please sign in to continue this conversation and get support.", 
				sender: 'bot', 
				id: `auth-${Date.now()}` 
			}];
		}
	});
	
	// Handle client-side form submission
	async function handleClientSubmission(event: Event) {
		event.preventDefault();
		if (input.trim()) {
			const messageText = input.trim();
			
			// Add to local messages array for immediate UI update
			messages = [...messages, { text: messageText, sender: 'user', id: `local-${Date.now()}` }];
			
			// Clear input field
			const submittedText = input;
			input = '';
			isLoading = true;
			
			if (isLoggedIn && userId) {
				try {
					// Call our Pinecone-based API endpoint instead of form submission
					const response = await fetch('/api/customer/chat', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							message: messageText,
							userId: userId,
							ticketId: ticketId || undefined
						})
					});
					
					if (!response.ok) {
						throw new Error('Failed to process message');
					}
					
					const result = await response.json();
					
					if (result.success) {
						// Show bot response
						if (result.response) {
							messages = [...messages, { text: result.response, sender: 'bot', id: `bot-${Date.now()}` }];
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
					messages = [...messages, { text: "Sorry, I encountered an error processing your request.", sender: 'bot', id: `error-${Date.now()}` }];
				} finally {
					isLoading = false;
				}
			} else {
				// Handle unauthenticated user
				setTimeout(() => {
					messages = [...messages, { 
						text: "Please sign in to continue this conversation and get support.", 
						sender: 'bot', 
						id: `auth-${Date.now()}` 
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
					ticketId = data.ticketId;
					showTicketForm = false;
					
					// Add confirmation message
					messages = [...messages, { 
						text: "Ticket #" + ticketId + " created successfully! An agent will respond to your issue soon.", 
						sender: 'bot', 
						id: `ticket-${Date.now()}` 
					}];
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
				// Submit agent response to be logged
				const response = await fetch('/customer_page', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					body: new URLSearchParams({
						agentResponse: 'true',
						agentMessage,
						ticketId: ticketId.toString(),
						userId,
						originalQuestion
					})
				});

				if (!response.ok) {
					throw new Error('Failed to log agent response');
				}

				// Add agent response to UI
				messages = [...messages, {
					text: agentMessage,
					sender: 'bot',
					id: `agent-${Date.now()}`
				}];

				return true;
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
							: 'bg-secondary text-secondary-foreground rounded-bl-none'
					} shadow">
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
