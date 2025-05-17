<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<h1>Instrument List</h1>
<ul>
	{#each data.instruments as instrument}
		<li>{instrument.name}</li>
	{/each}
</ul>

<form action="?/login" method="post">
	<button>Test</button>
</form>
