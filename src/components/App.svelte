<script lang="ts">
  import { onMount } from 'svelte';
  import { createStorage } from '../lib/storage';
  import type { AppConfig } from '../lib/types';

  const storage = createStorage();
  const loading = storage.loading;
  let config = $state<AppConfig | null>(null);

  onMount(() => {
    void storage.load().then((loaded) => {
      config = loaded;
    });
  });
</script>

<h1>two-way</h1>
{#if $loading}
  <p>loading…</p>
{:else if config}
  <p>configured pair: {config.pair.a} ↔ {config.pair.b} ({config.provider.model})</p>
{:else}
  <p>no config yet</p>
{/if}
