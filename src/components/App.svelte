<script lang="ts">
  import { onMount } from 'svelte';
  import SetupModal from './SetupModal.svelte';
  import { createStorage } from '../lib/storage';
  import type { AppConfig } from '../lib/types';

  const storage = createStorage();
  const loading = storage.loading;
  const inmemoryFallback = storage.inmemoryFallback;
  let config = $state<AppConfig | null>(null);
  let settingsOpen = $state(false);

  onMount(() => {
    void storage.load().then((loaded) => {
      config = loaded;
    });
  });

  /**
   * Persists a validated config from the modal, then closes it by unmounting;
   * each opening mounts a fresh modal seeded from `config`.
   * @param saved the validated config to store
   */
  async function handleSave(saved: AppConfig): Promise<void> {
    await storage.save(saved);
    config = saved;
    settingsOpen = false;
  }

  /** Closes the reopened modal without touching the saved config. */
  function handleCancel(): void {
    settingsOpen = false;
  }
</script>

<h1>two-way</h1>
{#if $loading}
  <p>loading…</p>
{:else if config}
  <p>configured pair: {config.pair.a} ↔ {config.pair.b} ({config.provider.model})</p>
  <button type="button" onclick={() => (settingsOpen = true)}>Settings</button>
{:else}
  <p>no config yet</p>
{/if}

{#if !$loading && (!config || settingsOpen)}
  <SetupModal
    config={config}
    blocking={!config}
    sessionOnly={$inmemoryFallback}
    onsave={handleSave}
    oncancel={handleCancel}
  />
{/if}
