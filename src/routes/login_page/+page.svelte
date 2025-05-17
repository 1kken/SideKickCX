<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	
	export let form: Record<string, any> | undefined;
	let email = '';
	let password = '';
	let remember = false;
	
	// Handle redirection on successful login
	$: if (form?.success && form?.redirectTo) {
		// Store the userId in sessionStorage for future use
		if (form.userId && browser) {
			sessionStorage.setItem('userId', form.userId);
		}
		// Redirect to the specified page
		if (browser) {
			goto(form.redirectTo);
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
	<!-- Updated Login Box -->
	<div
		class="flex h-[650px] w-[550px] flex-col items-center justify-center rounded-2xl bg-white p-8 shadow-md dark:bg-card"
	>
		<!-- Logo -->
		<div class="mt-[-100px] flex items-center justify-center">
			<img src="/logo.png" alt="Company Logo" class="w-300 h-300 mb-4 object-contain" />
		</div>

		<h1 class="mb-4 text-center text-2xl font-bold">Login</h1>

		<form method="POST" class="w-full max-w-[500px] space-y-6">
			<div class="space-y-2">
				<label for="email" class="block text-sm font-medium">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					bind:value={email}
					required
					placeholder="you@example.com"
					class="w-full rounded-lg border bg-muted px-4 py-2 text-black dark:bg-background dark:text-white"
				/>
			</div>

			<div class="space-y-2">
				<label for="password" class="block text-sm font-medium">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					bind:value={password}
					required
					placeholder="••••••••"
					class="w-full rounded-lg border bg-muted px-4 py-2 text-black dark:bg-background dark:text-white"
				/>
			</div>

			<div class="flex items-center justify-between text-sm">
				<label class="flex items-center gap-2">
					<input type="checkbox" name="remember" bind:checked={remember} class="form-checkbox" />
					<span>Remember me</span>
				</label>
				<a href="/forgot-password" class="text-primary hover:underline">Forgot?</a>
			</div>

			<button
				type="submit"
				class="w-full rounded-lg bg-primary px-4 py-2 text-white transition hover:opacity-90"
			>
				Log In
			</button>
		</form>
	</div>
</div>
