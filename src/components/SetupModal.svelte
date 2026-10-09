<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { createTranslator } from '../lib/provider';
  import {
    DEFAULT_PROVIDER,
    completeBaseUrl,
    languageOptions,
    validateSetup,
    type SetupErrors,
    type SetupForm,
  } from '../lib/setup';
  import type { AppConfig } from '../lib/types';

  interface Props {
    /** Saved config the form is seeded from; null on first run. */
    config: AppConfig | null;
    /** True while no config exists: the dialog cannot be dismissed. */
    blocking: boolean;
    /** True when storage fell back to memory and settings last only for this session. */
    sessionOnly: boolean;
    /** Persists a validated config; awaited, with Save disabled until it settles. */
    onsave: (config: AppConfig) => Promise<void>;
    /** Dismisses the reopened modal without saving. */
    oncancel: () => void;
  }

  let { config, blocking, sessionOnly, onsave, oncancel }: Props = $props();

  type TestState = { kind: 'idle' } | { kind: 'testing' } | { kind: 'ok' } | { kind: 'error'; message: string };

  // Read once on purpose: each opening mounts a fresh modal (D6), so the form must not track `config`.
  const initial = untrack(() => config);

  let dialog: HTMLDialogElement;
  let baseUrlInput: HTMLInputElement;
  let modelInput: HTMLInputElement;
  let baseUrl = $state(initial?.provider.baseUrl ?? DEFAULT_PROVIDER.baseUrl);
  let model = $state(initial?.provider.model ?? DEFAULT_PROVIDER.model);
  let apiKey = $state(initial?.provider.apiKey ?? '');
  let langA = $state(initial?.pair.a ?? '');
  let langB = $state(initial?.pair.b ?? '');
  let showKey = $state(false);
  let saving = $state(false);
  let errors = $state<SetupErrors>({});
  let testState = $state<TestState>({ kind: 'idle' });

  const translator = createTranslator();
  const options = languageOptions(initial ? [initial.pair.a, initial.pair.b] : []);

  /** The raw form contents handed to validateSetup. */
  function currentForm(): SetupForm {
    return { baseUrl, model, apiKey, langA, langB };
  }

  onMount(() => {
    dialog.showModal();
    return () => {
      // Saving or cancelling during a test drops the test result.
      translator.cancel();
    };
  });

  /** Escape: while blocking, never let it close the dialog. */
  function handleDialogCancel(event: Event): void {
    if (blocking) {
      event.preventDefault();
    }
  }

  /**
   * Close fallback: some browsers close the dialog on a second Escape without user
   * activation despite the cancel guard, so a blocking dialog reopens itself here.
   * A reopened dialog closes for good and reports the cancel to the app.
   */
  function handleDialogClose(): void {
    if (blocking) {
      dialog.showModal();
    } else {
      oncancel();
    }
  }

  /**
   * Drops the errors an edit makes stale; the rest stay until the next Save or Test.
   * @param fields the error keys the edited control owns
   */
  function clearErrors(...fields: Array<keyof SetupErrors>): void {
    const next = { ...errors };
    for (const field of fields) {
      delete next[field];
    }
    errors = next;
  }

  /** An edit makes any test result stale: cancel the in-flight request and clear the result. */
  function resetTest(): void {
    translator.cancel();
    testState = { kind: 'idle' };
  }

  /**
   * Empties a prefilled field from its "×" button and focuses it. Setting the value from
   * code fires no `input` event, so the field's error and the test result are cleared here.
   * @param field the field to empty
   */
  function clearField(field: 'baseUrl' | 'model'): void {
    if (field === 'baseUrl') {
      baseUrl = '';
      baseUrlInput.focus();
    } else {
      model = '';
      modelInput.focus();
    }
    clearErrors(field);
    resetTest();
  }

  /** Validates and hands the trimmed config to the app, or renders per-field errors. */
  async function handleSave(): Promise<void> {
    const result = validateSetup(currentForm());
    if (!result.ok) {
      errors = result.errors;
      return;
    }
    errors = {};
    saving = true;
    try {
      await onsave(result.config);
    } finally {
      saving = false;
    }
  }

  /**
   * Validates, then runs one real translation of a fixed word with the form's own
   * config. Any provider answer (translation or off-pair) proves the config works;
   * testing never saves.
   */
  async function handleTest(): Promise<void> {
    const result = validateSetup(currentForm());
    if (!result.ok) {
      errors = result.errors;
      testState = { kind: 'idle' };
      return;
    }
    errors = {};
    testState = { kind: 'testing' };
    const outcome = await translator.translate(result.config, 'hello');
    if (testState.kind !== 'testing') {
      return; // an edit reset the state while in flight; the stale result is dropped
    }
    if (outcome.kind === 'translation' || outcome.kind === 'off-pair') {
      testState = { kind: 'ok' };
    } else if (outcome.kind === 'error' || outcome.kind === 'blank' || outcome.kind === 'too-long') {
      // blank/too-long cannot occur with a constant input; mapped for exhaustiveness.
      testState = { kind: 'error', message: outcome.message };
    }
    // 'aborted' comes from teardown or an edit (resetTest), which already settled the state.
  }

  /**
   * Joins the error element ids that apply to a field into one aria-describedby value.
   * @param ids error element ids, undefined when that error is absent
   */
  function describedBy(...ids: Array<string | undefined>): string | undefined {
    const present = ids.filter((id): id is string => id !== undefined);
    return present.length > 0 ? present.join(' ') : undefined;
  }

  /**
   * User-facing text for a test state; empty while idle.
   * @param state the current test state
   */
  function testMessage(state: TestState): string {
    switch (state.kind) {
      case 'testing':
        return 'Testing the connection…';
      case 'ok':
        return 'Connection works.';
      case 'error':
        return state.message;
      case 'idle':
        return '';
    }
  }

  const shownTestMessage = $derived(testMessage(testState));
</script>

<dialog
  bind:this={dialog}
  oncancel={handleDialogCancel}
  onclose={handleDialogClose}
  aria-labelledby="setup-title"
  aria-describedby="setup-intro"
>
  <h2 id="setup-title">{blocking ? 'Set up two-way' : 'Settings'}</h2>
  <p class="intro" id="setup-intro">
    Type a word or short sentence in either language — two-way detects which one it is and translates it into
    the other. It uses your own OpenAI-compatible API key, which stays in this browser and is sent only to your
    provider.
  </p>

  {#if sessionOnly}
    <p class="notice">
      This browser blocked persistent storage, so your settings will last only until you close this page.
    </p>
  {/if}

  <form
    novalidate
    onsubmit={(event) => {
      event.preventDefault();
      void handleSave();
    }}
    oninput={resetTest}
  >
    <div class="field">
      <label for="base-url">Base URL</label>
      <div class="input-row">
        <input
          id="base-url"
          type="text"
          inputmode="url"
          autocomplete="off"
          spellcheck="false"
          bind:this={baseUrlInput}
          bind:value={baseUrl}
          oninput={() => clearErrors('baseUrl')}
          onblur={() => (baseUrl = completeBaseUrl(baseUrl.trim()))}
          aria-invalid={errors.baseUrl ? true : undefined}
          aria-describedby={errors.baseUrl ? 'base-url-error' : undefined}
        />
        {#if baseUrl}
          <button type="button" class="clear" aria-label="Clear base URL" onclick={() => clearField('baseUrl')}>×</button>
        {/if}
      </div>
      {#if errors.baseUrl}
        <p class="error" id="base-url-error">{errors.baseUrl}</p>
      {/if}
    </div>

    <div class="field">
      <label for="model">Model</label>
      <div class="input-row">
        <input
          id="model"
          type="text"
          autocomplete="off"
          spellcheck="false"
          bind:this={modelInput}
          bind:value={model}
          oninput={() => clearErrors('model')}
          aria-invalid={errors.model ? true : undefined}
          aria-describedby={errors.model ? 'model-error' : undefined}
        />
        {#if model}
          <button type="button" class="clear" aria-label="Clear model" onclick={() => clearField('model')}>×</button>
        {/if}
      </div>
      {#if errors.model}
        <p class="error" id="model-error">{errors.model}</p>
      {/if}
    </div>

    <div class="field">
      <label for="api-key">API key</label>
      <div class="input-row">
        <input
          id="api-key"
          type={showKey ? 'text' : 'password'}
          autocomplete="off"
          spellcheck="false"
          autocapitalize="off"
          bind:value={apiKey}
          oninput={() => clearErrors('apiKey')}
          aria-invalid={errors.apiKey ? true : undefined}
          aria-describedby={errors.apiKey ? 'api-key-error' : undefined}
        />
        <button type="button" aria-pressed={showKey} onclick={() => (showKey = !showKey)}>
          {showKey ? 'Hide' : 'Show'}
        </button>
      </div>
      {#if errors.apiKey}
        <p class="error" id="api-key-error">{errors.apiKey}</p>
      {/if}
    </div>

    <div class="field">
      <div class="pair-row">
        <label for="lang-a">Language 1</label>
        <span aria-hidden="true"></span>
        <label for="lang-b">Language 2</label>

        <select
          id="lang-a"
          bind:value={langA}
          oninput={() => clearErrors('langA', 'pair')}
          aria-invalid={errors.langA || errors.pair ? true : undefined}
          aria-describedby={describedBy(
            errors.langA ? 'lang-a-error' : undefined,
            errors.pair ? 'pair-error' : undefined,
          )}
        >
          <option value="" disabled hidden>Select…</option>
          {#each options as option (option.tag)}
            <option value={option.tag}>{option.label}</option>
          {/each}
        </select>
        <img class="pair-icon" src="/two-way-icon.svg" alt="" aria-hidden="true" width="32" height="32" />
        <select
          id="lang-b"
          bind:value={langB}
          oninput={() => clearErrors('langB', 'pair')}
          aria-invalid={errors.langB || errors.pair ? true : undefined}
          aria-describedby={describedBy(
            errors.langB ? 'lang-b-error' : undefined,
            errors.pair ? 'pair-error' : undefined,
          )}
        >
          <option value="" disabled hidden>Select…</option>
          {#each options as option (option.tag)}
            <option value={option.tag}>{option.label}</option>
          {/each}
        </select>

        <div>
          {#if errors.langA}
            <p class="error" id="lang-a-error">{errors.langA}</p>
          {/if}
        </div>
        <span aria-hidden="true"></span>
        <div>
          {#if errors.langB}
            <p class="error" id="lang-b-error">{errors.langB}</p>
          {/if}
        </div>
      </div>
      {#if errors.pair}
        <p class="error" id="pair-error">{errors.pair}</p>
      {/if}
    </div>

    <div class="footer">
      <!-- Always rendered: screen readers often ignore a live region inserted together with its text. -->
      <p class={testState.kind === 'error' ? 'error' : 'status'} role="status">{shownTestMessage}</p>
      <div class="actions">
        <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" disabled={testState.kind === 'testing'} onclick={() => void handleTest()}>
          {testState.kind === 'testing' ? 'Testing…' : 'Test'}
        </button>
        {#if !blocking}
          <button type="button" onclick={() => dialog.close()}>Cancel</button>
        {/if}
      </div>
    </div>
  </form>
</dialog>

<style>
  dialog {
    --error-color: #b00020;
    --border-color: #999;
    width: min(340px, calc(100vw - 24px));
    max-height: calc(100dvh - 24px);
    overflow-y: auto;
    padding: 16px;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: #111;
    background: #fff;
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 45%);
  }
  h2 {
    margin: 0 0 12px;
    font-size: 1.1rem;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 300px;
    margin: 0 auto;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  label {
    font-size: 0.85rem;
  }
  input,
  select,
  button {
    font: inherit;
    padding: 6px 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: #fff;
    color: inherit;
  }
  input {
    min-width: 0;
  }
  .input-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .input-row input {
    flex: 1;
  }
  .clear {
    padding: 4px 8px;
    line-height: 1;
  }
  .intro {
    max-width: 300px;
    margin: 0 auto 12px;
    font-size: 0.85rem;
    font-style: italic;
  }
  .pair-row {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    column-gap: 8px;
    row-gap: 4px;
    align-items: center;
  }
  .pair-row select {
    width: 100%;
    min-width: 0;
  }
  .pair-icon {
    display: block;
  }
  .error {
    margin: 0;
    color: var(--error-color);
    font-size: 0.8rem;
  }
  .status {
    margin: 0;
    color: #0a7d32;
    font-size: 0.85rem;
  }
  .notice {
    max-width: 300px;
    margin: 0 auto 12px;
    padding: 8px;
    border: 1px solid #99a;
    border-radius: 4px;
    background: #eef;
    color: #334;
    font-size: 0.85rem;
  }
  .footer [role='status']:not(:empty) {
    margin-bottom: 8px;
  }
  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 4px;
  }
  button {
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
