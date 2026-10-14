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
  let embed = $state(false);

  onMount(() => {
    // Set by the inline head script before first paint; read before the config load renders anything.
    embed = document.documentElement.hasAttribute('data-embed');
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
  <div class="main">
    <TranslatePanel {config} compact={embed} />
    {#if embed}
      <button
        type="button"
        class="gear"
        aria-label="Settings"
        title="Settings"
        onclick={() => (settingsOpen = true)}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            fill="currentColor"
            d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.61.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54c.05.24.26.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.48 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
          />
        </svg>
      </button>
    {:else}
      <button type="button" onclick={() => (settingsOpen = true)}>Settings</button>
    {/if}
  </div>
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

<style>
  /* Prerendered, so CSS keyed on the head script's marker hides it before first paint (embed-mode D2). */
  :global(:root[data-embed]) h1 {
    display: none;
  }
  .main {
    position: relative;
  }
  button {
    font: inherit;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: inherit;
  }
  .gear {
    position: absolute;
    top: 0;
    right: 0;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
  }
</style>
