<script lang="ts">
	let tickets = [
		{
			id: 1,
			title: 'Login Issue',
			priority: 'High',
			messages: [{ sender: 'client', text: 'I can’t log in.' }],
			aiResponses: []
		},
		{
			id: 2,
			title: 'Payment Delay',
			priority: 'Medium',
			messages: [{ sender: 'client', text: 'My payment is still processing.' }],
			aiResponses: []
		},
		{
			id: 3,
			title: 'Feedback',
			priority: 'Low',
			messages: [{ sender: 'client', text: 'Just wanted to say thanks!' }],
			aiResponses: []
		}
	];

	let selectedTicket = { ...tickets[0] };
	let agentMessage = '';
	let aiMessage = '';
	let aiResponses = [...selectedTicket.aiResponses];

	function selectTicket(ticket) {
		selectedTicket = { ...ticket };
		agentMessage = '';
		aiResponses = [...selectedTicket.aiResponses];
		aiMessage = '';
	}

	function handleAgentSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!agentMessage.trim()) return;

		const updatedTickets = tickets.map(ticket =>
			ticket.id === selectedTicket.id
				? { ...ticket, messages: [...ticket.messages, { sender: 'agent', text: agentMessage }] }
				: ticket
		);
		tickets = updatedTickets;
		selectedTicket = { ...updatedTickets.find(t => t.id === selectedTicket.id)! };
		agentMessage = '';
	}

	function handleAISubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!aiMessage.trim()) return;

		aiResponses = [...aiResponses, { sender: 'agent', text: aiMessage }];

		tickets = tickets.map(ticket =>
			ticket.id === selectedTicket.id
				? { ...ticket, aiResponses: aiResponses }
				: ticket
		);

		const aiReply = { sender: 'ai', text: 'I’ll assist you with that!' };
		setTimeout(() => {
			aiResponses = [...aiResponses, aiReply];
			tickets = tickets.map(ticket =>
				ticket.id === selectedTicket.id
					? { ...ticket, aiResponses: aiResponses }
					: ticket
			);
		}, 500);
		aiMessage = '';
	}

	function getPriorityDotColor(priority: string) {
		if (priority === 'High') return 'bg-red-500';
		if (priority === 'Medium') return 'bg-yellow-500';
		return 'bg-green-500';
	}
</script>

<div class="flex h-screen bg-background text-foreground">

	<!-- Sidebar -->
	<aside class="w-1/4 border-r p-4 bg-muted">
		<div class="mb-4 flex justify-between items-center">
			<a href="/" class="bg-gray-200 text-black px-3 py-1 rounded-md hover:bg-gray-300 transition">← Back</a>
			<h2 class="text-xl font-bold">Tickets</h2>
		</div>

		<ul class="space-y-2">
			{#each tickets as ticket}
				<li>
					<button
						on:click={() => selectTicket(ticket)}
						class={`w-full flex items-center gap-3 text-left p-3 rounded-lg bg-white hover:bg-gray-100 transition ${
							ticket.id === selectedTicket.id ? 'ring-2 ring-primary' : ''
						}`}
					>
						<div class={`w-3 h-3 rounded-full ${getPriorityDotColor(ticket.priority)}`}></div>
						<div>
							<div class="font-medium">{ticket.title}</div>
							<small class="text-gray-500">Priority: {ticket.priority}</small>
						</div>
					</button>
				</li>
			{/each}
		</ul>
	</aside>

	<!-- Client Chat -->
	<main class="flex flex-col w-1/2 h-full border-r">
		<header class="p-4 border-b bg-card text-lg font-bold">
			{selectedTicket.title}
		</header>

		<section class="flex-1 overflow-y-auto p-4 space-y-3">
			{#each selectedTicket.messages as message, i (message.text + i)}
				<div class={`flex ${message.sender === 'agent' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
					<div class={`max-w-[70%] px-4 py-2 rounded-2xl ${message.sender === 'agent' ? 'bg-primary text-white' : 'bg-muted text-black'}`}>
						{message.text}
					</div>
				</div>
			{/each}
		</section>

		<footer class="p-4 border-t bg-card">
			<form method="post" on:submit={handleAgentSubmit} class="flex items-center gap-2">
				<input
					type="text"
					bind:value={agentMessage}
					placeholder="Type a message..."
					class="flex-1 px-4 py-2 rounded-lg border bg-white text-black"
				/>
				<button
					type="submit"
					class="bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
				>
					Send
				</button>
			</form>
		</footer>
	</main>

	<!-- AI Panel -->
	<aside class="flex flex-col w-1/4 h-full">
		<header class="p-4 border-b bg-card text-lg font-bold">Sidekick AI</header>

		<section class="flex-1 overflow-y-auto p-4 space-y-3">
			{#each aiResponses as response, i (response.text + i)}
				<div class={`flex ${response.sender === 'agent' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
					<div class={`max-w-[70%] px-4 py-2 rounded-2xl ${response.sender === 'agent' ? 'bg-secondary text-white' : 'bg-muted text-black'}`}>
						{response.text}
					</div>
				</div>
			{/each}
		</section>

		<footer class="p-4 border-t bg-card">
			<form method="post" on:submit={handleAISubmit} class="flex items-center gap-2">
				<input
					type="text"
					bind:value={aiMessage}
					placeholder="Ask the assistant..."
					class="flex-1 px-4 py-2 rounded-lg border bg-white text-black"
				/>
				<button
					type="submit"
					class="bg-secondary text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
				>
					Send
				</button>
			</form>
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
