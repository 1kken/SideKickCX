<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
import { Monitor, BarChart2 } from 'lucide-svelte';
  import Chart from 'chart.js/auto';
  let chartCanvas: HTMLCanvasElement;

  function goToWorkstation() {
    goto('/workstation');
  }

  let analyticsChart: Chart;
  onMount(() => {
    analyticsChart = new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Users',
            data: [120, 200, 150, 220, 300, 280],
            backgroundColor: 'hsl(var(--primary) / 0.5)',
            borderColor: 'hsl(var(--primary))',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  });
</script>

<div class="min-h-screen bg-[hsl(var(--background))] p-8 space-y-8">
  <!-- Header -->
  <header class="flex items-center justify-between">
    <h1 class="text-4xl font-extrabold text-[hsl(var(--foreground))] flex items-center space-x-2">
      <Monitor class="w-8 h-8 text-[hsl(var(--primary))] animate-pulse" />
      <span>Sidekick's Dashboard</span>
    </h1>
  </header>

  <!-- Cards -->
  <section class="grid md:grid-cols-2 gap-6">
    <div
      class="bg-[hsl(var(--card))] rounded-2xl shadow-lg p-6 flex flex-col border border-[hsl(var(--border))] 
             hover:shadow-2xl transition-shadow duration-300 animate-fadeInUp"
    >
      <h2
        class="text-2xl font-semibold mb-4 flex items-center space-x-2 text-[hsl(var(--card-foreground))]"
      >
        <BarChart2 class="w-6 h-6 text-[hsl(var(--accent))]" />
        <span>Analytics</span>
      </h2>
      <p class="text-[hsl(var(--muted-foreground))] mb-6">
        Quick glance at your site’s performance.
      </p>
      <canvas bind:this={chartCanvas} class="w-full h-48"></canvas>
    </div>

    <div
      class="bg-[hsl(var(--card))] rounded-2xl shadow-lg p-6 flex flex-col justify-between border border-[hsl(var(--border))] 
             hover:shadow-2xl transition-shadow duration-300 animate-fadeInUp"
    >
      <div>
        <h2
          class="text-2xl font-semibold mb-4 flex items-center space-x-2 text-[hsl(var(--card-foreground))]"
        >
          <Monitor class="w-6 h-6 text-[hsl(var(--primary))]" />
          <span>Workstation</span>
        </h2>
        <p class="text-[hsl(var(--muted-foreground))] mb-4">
          Go work on your tasks in the dedicated workspace.
        </p>
      </div>
      <button
        on:click={goToWorkstation}
        class="
          self-start px-5 py-2 rounded-lg shadow transition
          bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]
          hover:bg-[hsl(var(--primary) / 0.8)] 
          hover:scale-105 hover:animate-bounce
        "
      >
        Open Workstation
      </button>
    </div>
  </section>
</div>
