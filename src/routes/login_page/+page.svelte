<script lang="ts">
	let email = '';
	let password = '';
	let remember = false;
</script>

<div class="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
	<!-- Updated Login Box -->
	<div class="w-[550px] h-[650px] bg-white dark:bg-card p-8 rounded-2xl shadow-md flex flex-col justify-center items-center">
                <!-- Logo -->
        <div class="flex justify-center items-center mt-[-100px]">
            <img
                src="/logo.png"
                alt="Company Logo"
                class="w-300 h-300 object-contain mb-4"
            />
        </div>

		<h1 class="text-2xl font-bold text-center mb-4">Login</h1>

		<form method="POST" class="space-y-6 w-full max-w-[500px]">
			<div class="space-y-2">
				<label for="email" class="block text-sm font-medium">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					bind:value={email}
					required
					placeholder="you@example.com"
					class="w-full px-4 py-2 border rounded-lg bg-muted text-black dark:text-white dark:bg-background"
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
					class="w-full px-4 py-2 border rounded-lg bg-muted text-black dark:text-white dark:bg-background"
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
				class="w-full bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
			>
				Log In
			</button>
		</form>
	</div>
</div>
