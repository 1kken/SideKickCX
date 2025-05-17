<script>
	let messages = [];
	let input = '';

	function sendMessage(event) {
		event.preventDefault(); // Prevents the form from reloading the page
		if (input.trim()) {
			messages = [...messages, { text: input, sender: 'user', id: Date.now() }];
			input = '';
		}
	}
</script>

<!-- Background -->
<div class="h-screen w-full bg-gradient-to-br from-muted via-background to-muted flex items-center justify-center">
	<!-- Chat Container -->
	<div class="w-2/3 h-[80vh] bg-card text-card-foreground rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in fade-in zoom-in-75 duration-700">
		
		<!-- Header -->
		<div class="p-4 border-b border-border bg-card text-card-foreground">
			<h1 class="text-xl font-semibold">Customer Service</h1>
		</div>

		<!-- Messages -->
		<div class="flex-1 overflow-y-auto px-4 py-2 space-y-2 bg-card">
			{#each messages as message (message.id)}
				<div class="flex justify-end animate-in fade-in slide-in-from-bottom-4 duration-300">
					<div class="max-w-[70%] px-4 py-2 rounded-2xl text-sm bg-primary text-primary-foreground rounded-br-none shadow">
						{message.text}
					</div>
				</div>
			{/each}
		</div>

		<!-- Input -->
		<form method="post" on:submit={sendMessage} class="p-4 border-t border-border bg-card flex gap-2">
			<input
				type="text"
				bind:value={input}
				placeholder="Type a message..."
				class="flex-1 p-2 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground transition-all duration-200"
			/>
			<button
				type="submit"
				class="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200 shadow"
			>
				Send
			</button>
		</form>
	</div>
</div>
