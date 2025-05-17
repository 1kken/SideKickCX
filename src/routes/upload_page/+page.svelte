<script lang="ts">
	let file: File | null = null;
	let sliderValue = 0.5;
	let message: string = '';
	let messages: { text: string }[] = [];

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files?.length) {
			file = input.files[0];
		}
	}

	function sendMessage() {
		if (message.trim() !== '') {
			messages = [...messages, { text: message }];
			message = '';
		}
	}
</script>

<div class="flex h-screen p-4 gap-4 bg-background text-foreground">

	<!-- Left Panel (Slider + Chat) -->
	<div class="flex flex-col w-1/3 gap-4">
		<!-- Slider -->
		 		<div class="mb-4 flex justify-between items-center">
			<a href="home_page" class="bg-gray-200 text-black px-3 py-1 rounded-md hover:bg-gray-300 transition">← Back</a>
		</div>
		<div class="bg-card rounded-2xl p-6 shadow-md h-1/3">
			<h2 class="text-lg font-bold mb-3">Temperature (0 - 1)</h2>
			<input
				type="range"
				min="0"
				max="1"
				step="0.1"
				bind:value={sliderValue}
				class="w-full accent-primary"
			/>
			<p class="mt-3 text-sm text-muted-foreground">Value: {sliderValue}</p>
		</div>

		<!-- Chat Box -->
		<div class="flex flex-col bg-card rounded-2xl p-6 shadow-md h-2/3 max-h-[500px]">
			<h2 class="text-lg font-bold mb-3">Instruction</h2>

		<!-- Messages -->
<div class="flex-1 overflow-y-auto space-y-3 p-3 bg-muted rounded-md">
	{#each messages as m, i (m.text + i)}
		<div class="flex justify-end animate-fade-in">
			<div class="inline-block bg-primary text-white px-4 py-2 rounded-2xl">
				{m.text}
			</div>
		</div>
	{/each}
</div>

<!-- Input -->
<div class="mt-6 flex gap-3">
	<input
		type="text"
		class="flex-1 px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
		bind:value={message}
		placeholder="Type a message..."
		on:keydown={(e) => e.key === 'Enter' && sendMessage()}
	/>
	<button
		on:click={sendMessage}
		class="bg-primary text-white px-5 py-3 rounded-lg hover:opacity-90 transition"
	>
		Send
	</button>
</div>

		</div>
	</div>

	<!-- Right Panel (Upload File - Full clickable area) -->
<div
		class="relative w-2/3 bg-muted border border-border rounded-2xl shadow-md flex flex-col justify-center items-center cursor-pointer hover:bg-muted/80 transition-all overflow-hidden"
>
	<!-- Faded Upload Icon (Heroicons: Arrow Up Tray) -->
	<svg
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="1.5"
		stroke="currentColor"
		class="absolute w-40 h-40 text-border opacity-10 pointer-events-none"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-9-12v12m0 0l-3.75-3.75M12 16.5l3.75-3.75"
		/>
	</svg>

	<input
		type="file"
		class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
		on:change={handleFileChange}
	/>
	<p class="text-xl font-bold text-primary pointer-events-none z-10">Click anywhere to upload</p>
	{#if file}
		<p class="mt-2 text-sm text-muted-foreground pointer-events-none z-10">Selected: {file.name}</p>
	{/if}
</div>

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
