<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	export let form;
	let email = '';
	let password = '';
	let remember = false;
	
	onMount(() => {
		if (form?.success) {
			// Store user ID in session storage
			if (browser && form.userId) {
				sessionStorage.setItem('userId', form.userId);
				console.log('User ID stored in session storage:', form.userId);
			}
			
			// Navigate to the redirect URL
			if (form.redirectTo) {
				goto(form.redirectTo);
			}
		}
	});
</script>

<div class="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
	<!-- Larger, semi-rounded Login Box -->
	<div class="w-[500px] h-[520px] bg-white dark:bg-card p-8 rounded-2xl shadow-lg flex flex-col justify-center">
		<h1 class="text-2xl font-bold text-center mb-6">Login to Your Account</h1>

		<form method="POST" class="space-y-5">
			<!-- Show error message if any -->
			{#if form?.error}
				<div class="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
					{form.message}
				</div>
			{/if}
			
			<!-- Email Input -->
			<div class="space-y-1">
				<label for="email" class="block text-sm font-medium">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					bind:value={email}
					required
					placeholder="you@example.com"
					class="w-full px-4 py-3 border rounded-lg bg-muted text-black dark:text-white dark:bg-background"
				/>
			</div>

			<!-- Password Input -->
			<div class="space-y-1">
				<label for="password" class="block text-sm font-medium">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					bind:value={password}
					required
					placeholder="••••••••"
					class="w-full px-4 py-3 border rounded-lg bg-muted text-black dark:text-white dark:bg-background"
				/>
			</div>

			<!-- Remember Me and Forgot -->
			<div class="flex items-center justify-between text-sm">
				<label class="flex items-center gap-2">
					<input type="checkbox" name="remember" bind:checked={remember} class="form-checkbox" />
					<span>Remember me</span>
				</label>
				<a href="/forgot-password" class="text-primary hover:underline">Forgot?</a>
			</div>

			<!-- Submit Button -->
			<button
				type="submit"
				class="w-full bg-primary text-white px-4 py-3 rounded-lg hover:opacity-90 transition"
			>
				Log In
			</button>
		</form>
	</div>
</div>