<script lang="ts">
	import type { PageData } from './$types';
	import type { Ticket } from './+page.server';

	let { data }: { data: PageData } = $props();

	let tickets = data.tickets;
	let selectedTicket = $state({ ...tickets[0] });

	function selectTicket(ticket: Ticket) {
		selectedTicket = { ...ticket };
	}

	async function fetch
	// function handleAgentSubmit(event: SubmitEvent) {
	// 	event.preventDefault();
	// 	if (!agentMessage.trim()) return;

	// 	const updatedTickets = tickets.map((ticket) =>
	// 		ticket.id === selectedTicket.id
	// 			? { ...ticket, messages: [...ticket.messages, { sender: 'agent', text: agentMessage }] }
	// 			: ticket
	// 	);
	// 	tickets = updatedTickets;
	// 	selectedTicket = { ...updatedTickets.find((t) => t.id === selectedTicket.id)! };
	// 	agentMessage = '';
	// }

	// function handleAISubmit(event: SubmitEvent) {
	// 	event.preventDefault();
	// 	if (!aiMessage.trim()) return;

	// 	aiResponses = [...aiResponses, { sender: 'agent', text: aiMessage }];

	// 	tickets = tickets.map((ticket) =>
	// 		ticket.id === selectedTicket.id ? { ...ticket, aiResponses: aiResponses } : ticket
	// 	);

	// 	const aiReply = { sender: 'ai', text: 'I’ll assist you with that!' };
	// 	setTimeout(() => {
	// 		aiResponses = [...aiResponses, aiReply];
	// 		tickets = tickets.map((ticket) =>
	// 			ticket.id === selectedTicket.id ? { ...ticket, aiResponses: aiResponses } : ticket
	// 		);
	// 	}, 500);
	// 	aiMessage = '';
	// }

	function getPriorityDotColor(priority: string) {
		if (priority === 'High') return 'bg-red-500';
		if (priority === 'Medium') return 'bg-yellow-500';
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
			{#each tickets as ticket}
				<li>
					<button
						onclick={() => selectTicket(ticket)}
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
		</ul>
	</aside>

	<!-- Client Chat -->
	<main class="flex h-full w-1/2 flex-col border-r">
		<header class="border-b bg-card p-4 text-lg font-bold">
			{selectedTicket.subject}
		</header>

		<section class="flex-1 space-y-3 overflow-y-auto p-4">
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
		</section>

		<!-- <footer class="border-t bg-card p-4">
			<form method="post" on:submit={handleAgentSubmit} class="flex items-center gap-2">
				<input
					type="text"
					bind:value={agentMessage}
					placeholder="Type a message..."
					class="flex-1 rounded-lg border bg-white px-4 py-2 text-black"
				/>
				<button
					type="submit"
					class="rounded-lg bg-primary px-4 py-2 text-white transition hover:opacity-90"
				>
					Send
				</button>
			</form>
		</footer> -->
	</main>

	<!-- AI Panel -->
	<!-- <aside class="flex h-full w-1/4 flex-col">
		<header class="border-b bg-card p-4 text-lg font-bold">Sidekick AI</header>

		<section class="flex-1 space-y-3 overflow-y-auto p-4">
			{#each aiResponses as response, i (response.text + i)}
				<div
					class={`flex ${response.sender === 'agent' ? 'justify-end' : 'justify-start'} animate-fade-in`}
				>
					<div
						class={`max-w-[70%] rounded-2xl px-4 py-2 ${response.sender === 'agent' ? 'bg-secondary text-white' : 'bg-muted text-black'}`}
					>
						{response.text}
					</div>
				</div>
			{/each}
		</section>

		<footer class="border-t bg-card p-4">
			<form method="post" on:submit={handleAISubmit} class="flex items-center gap-2">
				<input
					type="text"
					bind:value={aiMessage}
					placeholder="Ask the assistant..."
					class="flex-1 rounded-lg border bg-white px-4 py-2 text-black"
				/>
				<button
					type="submit"
					class="rounded-lg bg-secondary px-4 py-2 text-white transition hover:opacity-90"
				>
					Send
				</button>
			</form>
		</footer> -->
	<!-- </aside> -->
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
