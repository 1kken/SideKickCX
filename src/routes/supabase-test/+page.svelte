<script lang="ts">
  import type { PageData } from './$types';
  export let data: PageData;
</script>

<h1>Supabase Connection Test</h1>

<div class="result-container">
  <h2>Status: {data.status}</h2>
  <p>{data.message}</p>
  
  {#if data.status === 'success'}
    <pre>{JSON.stringify(data.data, null, 2)}</pre>
  {:else if data.details}
    <div class="error-details">
      <h3>Error Details:</h3>
      <pre>{JSON.stringify(data.details, null, 2)}</pre>
    </div>
  {/if}
</div>

<style>
  .result-container {
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: #f9f9f9;
    max-width: 800px;
    margin: 2rem auto;
  }
  
  .error-details {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #fff0f0;
    border-left: 4px solid #ff0000;
  }
  
  pre {
    overflow-x: auto;
    background-color: #f0f0f0;
    padding: 0.5rem;
    border-radius: 0.25rem;
  }
</style> 