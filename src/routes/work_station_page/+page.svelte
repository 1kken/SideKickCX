<script lang="ts">
	import type { PageData } from './$types';
	import type { Ticket } from './types';
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { onMount, onDestroy } from 'svelte';

	let { data }: { data: PageData } = $props();

	let tickets = data.tickets || [];
	let selectedTicket = $state(tickets.length > 0 ? { ...tickets[0] } : {
		id: 0,
		user_id: 0,
		subject: 'No tickets available',
		message: '',
		messages: [],
		status: 'open' as const,
		priority: 'low' as const,
		escalated: false,
		created_at: new Date().toISOString(),
		aiResponses: []
	});
	
	let agentMessage = '';
	let aiMessage = '';
	let aiResponses = $state(selectedTicket.aiResponses || []);
	let sendingMessage = $state(false);
	let aiIsLoading = $state(false);
	let aiInputElement: HTMLInputElement; // Direct reference to the input element
	let ticketMessagesSubscription: any = null;

	// Function to subscribe to real-time ticket messages
	function subscribeToTicketMessages(ticketId: number) {
		// Clear any existing subscription
		if (ticketMessagesSubscription) {
			ticketMessagesSubscription.unsubscribe();
		}
		
		if (ticketId === 0) return; // Don't subscribe if no ticket is selected
		
		// Create a new subscription to the ticket_messages table
		ticketMessagesSubscription = supabase
			.channel(`workstation-ticket-messages-${ticketId}`)
			.on('postgres_changes', 
				{ 
					event: 'INSERT', 
					schema: 'public', 
					table: 'ticket_messages',
					filter: `ticket_id=eq.${ticketId}`
				}, 
				async (payload) => {
					console.log('New ticket message received:', payload);
					
					// Create a message object from the payload
					const newMessage = {
						sender: payload.new.is_agent ? 'agent' : 'user',
						text: payload.new.message
					};
					
					// Only add if it's not from the current agent (prevents duplicate messages)
					const isFromCurrentAgent = newMessage.sender === 'agent' && !sendingMessage;
					
					// If message is from customer or another agent, add it to the UI
					if (newMessage.sender === 'user' || !isFromCurrentAgent) {
						// Add the new message to both the selected ticket and the tickets array
						selectedTicket.messages = [...selectedTicket.messages, newMessage];
						
						// Update the tickets array as well
						tickets = tickets.map(ticket => {
							if (ticket.id === ticketId) {
								return {
									...ticket,
									messages: [...ticket.messages, newMessage]
								};
							}
							return ticket;
						});
					}
				}
			)
			.subscribe();
	}

	function selectTicket(ticket: Ticket) {
		// Clear existing subscription
		if (ticketMessagesSubscription) {
			ticketMessagesSubscription.unsubscribe();
		}
		
		selectedTicket = { ...ticket };
		agentMessage = '';
		aiResponses = selectedTicket.aiResponses || [];
		aiMessage = '';
		
		// Subscribe to messages for the newly selected ticket
		subscribeToTicketMessages(ticket.id);
	}

	// Set up subscription when component mounts
	onMount(() => {
		if (selectedTicket.id !== 0) {
			subscribeToTicketMessages(selectedTicket.id);
		}
	});
	
	// Clean up subscription when component is destroyed
	onDestroy(() => {
		if (ticketMessagesSubscription) {
			ticketMessagesSubscription.unsubscribe();
		}
	});

	// The form action will handle message storage in the database
	// This function will add the message locally while waiting for the server to respond
	function handleAgentSubmit() {
		if (!agentMessage.trim() || !selectedTicket.id || selectedTicket.id === 0) return;
		
		// We'll add to UI optimistically, but the real message will come from server on reload
		const updatedTickets = tickets.map((ticket) =>
			ticket.id === selectedTicket.id
				? { ...ticket, messages: [...ticket.messages, { sender: 'agent', text: agentMessage }] }
				: ticket
		);
		tickets = updatedTickets;
		selectedTicket = { ...updatedTickets.find((t) => t.id === selectedTicket.id)! };
	}

	// Modified and simplified AI submit handler
	async function handleAISubmit(event: SubmitEvent) {
		event.preventDefault();
		
		// Get message and clear it
		const query = aiMessage;
		console.log("AI submit with query:", query);
		
		// Clear input field immediately using the direct reference
		aiMessage = ''; // First try the bound variable
		
		// Exit if empty message
		if (!query.trim()) {
			console.log("Empty message, not sending");
			return;
		}
		
		// Add user message to UI
		aiResponses = [...aiResponses, { sender: 'agent', text: query }];
		aiIsLoading = true;
		
		try {
			// Prepare the request
			const formData = new FormData();
			formData.append('ticketId', selectedTicket.id.toString());
			formData.append('query', query);
			formData.append('userId', '1');
			
			// Send the request
			const response = await fetch('?/getAiResponse', {
				method: 'POST',
				body: formData
			});
			
			const responseText = await response.text();
			console.log("Response received:", responseText);
			
			let result;
			try {
				result = JSON.parse(responseText);
			} catch (e) {
				console.error("Error parsing response:", e);
				throw new Error("Failed to parse response");
			}
			
			// Extract AI response from result
			let aiResponse = "";
			
			// Direct success response format
			if (result?.success === true && typeof result.aiResponse === 'string') {
				aiResponse = result.aiResponse;
			}
			// SvelteKit format
			else if (result?.type === 'success' && result.data) {
				// Handle string format
				if (typeof result.data === 'string') {
					try {
						const parsed = JSON.parse(result.data);
						// If array, use last string element
						if (Array.isArray(parsed)) {
							for (let i = parsed.length - 1; i >= 0; i--) {
								if (typeof parsed[i] === 'string') {
									aiResponse = parsed[i];
									break;
								}
							}
						}
						// If object with aiResponse
						else if (parsed?.aiResponse) {
							aiResponse = parsed.aiResponse;
						}
					} catch (e) {
						// If not JSON, use as is
						aiResponse = result.data;
					}
				}
				// Handle direct data object
				else if (typeof result.data === 'object') {
					if (Array.isArray(result.data)) {
						for (let i = result.data.length - 1; i >= 0; i--) {
							if (typeof result.data[i] === 'string') {
								aiResponse = result.data[i];
								break;
							}
						}
					} else if (result.data?.aiResponse) {
						aiResponse = result.data.aiResponse;
					}
				}
			}
			
			// If we got a response, add it to the UI
			if (aiResponse) {
				aiResponses = [...aiResponses, { sender: 'ai', text: aiResponse }];
			} else {
				throw new Error("Could not extract AI response");
			}
			
		} catch (error) {
			console.error('Error:', error);
			aiResponses = [...aiResponses, { 
				sender: 'ai', 
				text: "I'm sorry, I couldn't process your request. Please try again."
			}];
		} finally {
			// Ensure input is cleared and loading state is reset
			aiIsLoading = false;
			aiMessage = '';
			
			// Force Svelte to update
			await tick();
			
			// Direct DOM manipulation as a last resort
			if (aiInputElement) {
				aiInputElement.value = '';
			}
			
			// Update the ticket state
			tickets = tickets.map((ticket) =>
				ticket.id === selectedTicket.id ? { ...ticket, aiResponses } : ticket
			);
		}
	}

	function getPriorityDotColor(priority: string) {
		if (priority === 'high') return 'bg-red-500';
		if (priority === 'medium') return 'bg-yellow-500';
		return 'bg-green-500';
	}
</script>

<div class="flex h-screen bg-background text-foreground">
	<!-- Sidebar -->
	<aside class="w-1/4 border-r bg-muted p-4">
		<div class="mb-4 flex items-center justify-between">
			<a
				href="home_page"
				class="rounded-md bg-gray-200 px-3 py-1 text-black transition hover:bg-gray-300">← Back</a
			>
			<h2 class="text-xl font-bold">Tickets</h2>
		</div>

		<ul class="space-y-2">
			{#if tickets && tickets.length > 0}
				{#each tickets as ticket}
					<li>
						<button
							on:click={() => selectTicket(ticket)}
							class={`flex w-full items-center gap-3 rounded-lg bg-white p-3 text-left transition hover:bg-gray-100 ${
								ticket.id === selectedTicket.id ? 'ring-2 ring-primary' : ''
							}`}
						>
							<div class={`h-3 w-3 rounded-full ${getPriorityDotColor(ticket.priority)}`}></div>
							<div>
								<div class="font-medium">{ticket.subject}</div>
								<small class="text-gray-500">Priority: {ticket.priority}</small>
							</div>
						</button>
					</li>
				{/each}
			{:else}
				<li class="text-center text-gray-500 p-4">No tickets found</li>
			{/if}
		</ul>
	</aside>

	<!-- Client Chat -->
	<main class="flex h-full w-1/2 flex-col border-r">
		<header class="border-b bg-card p-4 text-lg font-bold">
			{selectedTicket.subject}
		</header>

		<section class="flex-1 space-y-3 overflow-y-auto p-4">
			{#if selectedTicket.messages && selectedTicket.messages.length > 0}
				{#each selectedTicket.messages as message, i (message.text + i)}
					<div
						class={`flex ${message.sender === 'agent' ? 'justify-end' : 'justify-start'} animate-fade-in`}
					>
						<div
							class={`max-w-[70%] rounded-2xl px-4 py-2 ${message.sender === 'agent' ? 'bg-primary text-white' : 'bg-muted text-black'}`}
						>
							{message.text}
						</div>
					</div>
				{/each}
			{:else}
				<div class="flex justify-center items-center h-full text-gray-500">
					No messages available
				</div>
			{/if}
		</section>

		<footer class="border-t bg-card p-4">
			<form 
				method="POST" 
				action="?/sendMessage" 
				use:enhance={() => {
					console.log("Form submitted, ticketId:", selectedTicket.id);
					sendingMessage = true;
					// Add the message to UI optimistically
					handleAgentSubmit();
					return async ({ update }) => {
						agentMessage = '';
						sendingMessage = false;
						await update();
					};
				}}
				class="flex items-center gap-2"
			>
				<input type="hidden" name="ticketId" value={selectedTicket.id} />
				<input type="hidden" name="userId" value="1" /> <!-- Replace with actual user ID -->
				<input type="hidden" name="isAgent" value="true" />
				<input
					type="text"
					name="message"
					bind:value={agentMessage}
					placeholder="Type a message..."
					class="flex-1 rounded-lg border bg-white px-4 py-2 text-black"
				/>
				<button
					type="submit"
					class="rounded-lg bg-primary px-4 py-2 text-white transition hover:opacity-90"
				>
					{sendingMessage ? 'Sending...' : 'Send'}
				</button>
				<div class="hidden">{JSON.stringify({id: selectedTicket.id, msg: agentMessage})}</div>
			</form>
		</footer>
	</main>

	<!-- AI Panel -->
	<aside class="flex h-full w-1/4 flex-col">
		<header class="border-b bg-green-700 p-4 text-lg font-bold text-white">
			<div class="flex justify-between items-center">
				<span>Sidekick AI Assistant</span>
				{#if selectedTicket.id !== 0}
					<span class="text-sm font-normal text-green-100">Customer ID: {selectedTicket.user_id}</span>
				{/if}
			</div>
		</header>

		<section class="flex-1 space-y-3 overflow-y-auto p-4 bg-green-50">
			{#if aiResponses.length === 0}
				<div class="text-center text-gray-500 p-4">
					Ask the AI assistant for help with this customer. The assistant has access to:
					<ul class="list-disc ml-6 mt-2 text-left text-sm">
						<li>Customer details and history</li>
						<li>Previous orders and products</li>
						<li>Past support interactions</li>
						<li>Ticket history and status</li>
					</ul>
				</div>
			{:else}
				{#each aiResponses as response, i (response.text + i)}
					<div
						class={`flex ${response.sender === 'agent' ? 'justify-end' : 'justify-start'} animate-fade-in`}
					>
						<div
							class={`max-w-[90%] rounded-2xl px-4 py-2 ${
								response.sender === 'agent' 
									? 'bg-green-600 text-white' 
									: 'bg-white border border-green-200 text-black'
							}`}
						>
							{response.text}
						</div>
					</div>
				{/each}
			{/if}
			
			{#if aiIsLoading}
				<div class="flex justify-center my-4">
					<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-700"></div>
				</div>
			{/if}
		</section>

		<footer class="border-t bg-green-100 p-4">
			<form on:submit={handleAISubmit} class="flex items-center gap-2">
				<input
					type="text"
					bind:value={aiMessage}
					bind:this={aiInputElement}
					placeholder="Ask the assistant about this customer..."
					class="flex-1 rounded-lg border bg-white px-4 py-2 text-black"
				/>
				<button
					type="submit"
					class="rounded-lg bg-green-600 px-4 py-2 text-white transition hover:opacity-90"
				>
					{aiIsLoading ? 'Thinking...' : 'Ask'}
				</button>
			</form>
			<div class="hidden">{JSON.stringify({ticketId: selectedTicket.id, query: aiMessage})}</div>
		</footer>
	</aside>
</div>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(5px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.animate-fade-in {
		animation: fade-in 0.3s ease-in-out;
	}
</style>