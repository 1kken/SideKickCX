<script lang="ts">
	let file: File | null = null;
	let sliderValue = 0.5;
	let instructions: string = '';

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files?.length) {
			const selectedFile = input.files[0];
			if (selectedFile.type === 'application/pdf') {
				file = selectedFile;
			} else {
				alert('Please upload only PDF files.');
			}
		}
	}

	function saveInstructions() {
		if (instructions.trim() !== '' && file) {
			// Logic to save instructions and process the file
			console.log('Saving instructions:', instructions);
			console.log('File:', file);
			console.log('Temperature:', sliderValue);
			alert('Saved successfully!');
		} else {
			alert('Please provide instructions and upload a PDF file.');
		}
	}
</script>

<div class="flex h-screen p-4 gap-4 bg-background text-foreground">

	<!-- Left Panel (Slider + Instructions) -->
	<div class="flex flex-col w-1/3 gap-4">
		<!-- Back Button -->
		<div class="mb-4 flex justify-between items-center">
			<a href="home_page" class="bg-gray-200 text-black px-3 py-1 rounded-md hover:bg-gray-300 transition">← Back</a>
		</div>
		
		<!-- Temperature Slider -->
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

		<!-- Instructions Box -->
		<div class="flex flex-col bg-card rounded-2xl p-6 shadow-md h-2/3">
			<h2 class="text-lg font-bold mb-3">Instructions</h2>

			<!-- Text Area for Instructions -->
			<textarea
				bind:value={instructions}
				class="flex-1 p-3 bg-muted rounded-md border border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
				placeholder="Enter your instructions here..."
			></textarea>

			<!-- Save Button -->
			<button
				on:click={saveInstructions}
				class="mt-4 bg-primary text-white px-5 py-3 rounded-lg hover:opacity-90 transition w-full"
			>
				Save
			</button>
		</div>
	</div>

	<!-- Right Panel (Upload PDF - Full clickable area) -->
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
			accept=".pdf,application/pdf"
			class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
			on:change={handleFileChange}
		/>
		<p class="text-xl font-bold text-primary pointer-events-none z-10">Click anywhere to upload PDF</p>
		{#if file}
			<p class="mt-2 text-sm text-muted-foreground pointer-events-none z-10">Selected: {file.name}</p>
		{:else}
			<p class="mt-2 text-sm text-muted-foreground pointer-events-none z-10">Only PDF files are accepted</p>
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
