<script lang="ts">
  import { onMount } from 'svelte';
  import SetupModal from './SetupModal.svelte';
  import TranslatePanel from './TranslatePanel.svelte';
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

<div class="app">
  <h1>
    <span class="logo"><img src="/two-way-icon.svg" alt="" width="36" height="36" /></span>
    two-way
  </h1>
  {#if $loading}
    <p>loading…</p>
  {:else if config}
    <TranslatePanel {config} onsettings={() => (settingsOpen = true)} />
  {:else}
    <p>no config yet</p>
  {/if}
</div>

{#if !$loading && (!config || settingsOpen)}
  <SetupModal
    config={config}
    blocking={!config}
    sessionOnly={$inmemoryFallback}
    onsave={handleSave}
    oncancel={handleCancel}
  />
{/if}

<style>
  /* Embed differences are CSS-only, keyed on the head script's marker so they apply before first paint (redesign D1). */
  .app {
    max-width: 560px;
    margin: 0 auto;
  }
  :global(:root[data-embed]) .app {
    max-width: none;
  }
  :global(:root[data-embed]) h1 {
    display: none;
  }
  h1 {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin: 24px 0 20px;
    font-size: 1.75rem;
  }
  .logo {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--color-logo-tile);
  }
</style>
