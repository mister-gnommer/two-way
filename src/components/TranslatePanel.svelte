<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { createTranslator } from '../lib/provider';
  import { pairLabel, resultView, type ResultView } from '../lib/translate-view';
  import type { AppConfig } from '../lib/types';

  interface Props {
    /** The saved config every translation uses; a new object means settings were saved. */
    config: AppConfig;
  }

  let { config }: Props = $props();

  type CopyState = 'idle' | 'copied' | 'manual';

  const COPIED_MS = 1500;

  const translator = createTranslator();
  let form: HTMLFormElement;
  let inputEl: HTMLTextAreaElement;
  let translationEl = $state<HTMLParagraphElement>();
  let input = $state('');
  let view = $state<ResultView>({ kind: 'idle' });
  let copyState = $state<CopyState>('idle');
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  const pair = $derived(pairLabel(config.pair));

  onMount(() => {
    return () => {
      translator.cancel();
      clearTimeout(copyTimer);
    };
  });

  // Saved settings may change the pair or provider: drop the in-flight request and the result (D5).
  $effect(() => {
    void config;
    untrack(reset);
  });

  /**
   * Replaces the result area's content; any copy confirmation belonged to the old view.
   * @param next the view to show
   */
  function show(next: ResultView): void {
    view = next;
    clearTimeout(copyTimer);
    copyState = 'idle';
  }

  /** Cancels the in-flight request, whose call then resolves `aborted`, and empties the result. */
  function reset(): void {
    translator.cancel();
    show({ kind: 'idle' });
  }

  /** Translates the current input; a newer submit supersedes this one, whose `aborted` result is ignored. */
  async function handleSubmit(): Promise<void> {
    show({ kind: 'translating' });
    const next = resultView(await translator.translate(config, input));
    if (next) {
      show(next);
    }
  }

  /** Enter submits; Shift+Enter and Enter that confirms an IME composition insert or compose as usual. */
  function handleKeydown(event: KeyboardEvent): void {
    // Safari reports isComposing false on the Enter that ends a composition; keyCode 229 still marks it.
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) {
      return;
    }
    event.preventDefault();
    form.requestSubmit();
  }

  /** Empties the input and the result, cancelling any request, and focuses the input. */
  function clearInput(): void {
    input = '';
    inputEl.focus();
    reset();
  }

  /** Selects the shown translation's text, for the copy fallback and the manual hint. */
  function selectTranslation(): Selection | null {
    const selection = window.getSelection();
    if (!translationEl || !selection) {
      return null;
    }
    const range = document.createRange();
    range.selectNodeContents(translationEl);
    selection.removeAllRanges();
    selection.addRange(range);
    return selection;
  }

  /** Copy fallback for iframes without clipboard permission: the deprecated selection-based copy. */
  function copyBySelection(): boolean {
    const selection = selectTranslation();
    if (!selection) {
      return false;
    }
    try {
      const copied = document.execCommand('copy');
      if (copied) {
        selection.removeAllRanges();
      }
      return copied;
    } catch {
      return false;
    }
  }

  /**
   * Copies the shown translation: Clipboard API first, then the selection fallback; when both
   * fail the text stays selected and the user is asked to copy it manually (D6).
   */
  async function copyTranslation(): Promise<void> {
    const shown = view;
    if (shown.kind !== 'translation') {
      return;
    }
    // Checked after the await, before the fallback: `translationEl` may already hold a newer translation.
    const replaced = (): boolean => view !== shown;
    let copied: boolean;
    try {
      await navigator.clipboard.writeText(shown.text);
      copied = true;
    } catch {
      if (replaced()) {
        return;
      }
      copied = copyBySelection();
    }
    if (replaced()) {
      return;
    }
    clearTimeout(copyTimer);
    if (copied) {
      copyState = 'copied';
      copyTimer = setTimeout(() => (copyState = 'idle'), COPIED_MS);
    } else {
      selectTranslation();
      copyState = 'manual';
    }
  }
</script>

<section class="panel" aria-label="Translator">
  <p class="pair" title={pair.name}>
    <span aria-hidden="true">{pair.text}</span>
    <span class="visually-hidden">{pair.name}</span>
  </p>

  <form
    bind:this={form}
    onsubmit={(event) => {
      event.preventDefault();
      void handleSubmit();
    }}
  >
    <label for="translate-input">Text to translate</label>
    <div class="input-row">
      <textarea
        id="translate-input"
        rows="3"
        autocomplete="off"
        spellcheck="false"
        bind:this={inputEl}
        bind:value={input}
        onkeydown={handleKeydown}
      ></textarea>
      {#if input}
        <button type="button" class="clear" aria-label="Clear text" onclick={clearInput}>×</button>
      {/if}
    </div>
    <div class="actions">
      <button type="submit">Translate</button>
    </div>
  </form>

  <!-- Always rendered: screen readers often ignore a live region inserted together with its text. -->
  <div class="result" role="status">
    {#if view.kind === 'translating'}
      <p class="muted">Translating…</p>
    {:else if view.kind === 'translation'}
      <p class="direction" title={view.direction.name}>
        <span aria-hidden="true">{view.direction.text}</span>
        <span class="visually-hidden">{view.direction.name}</span>
      </p>
      <p class="translation" lang={view.lang} bind:this={translationEl}>{view.text}</p>
      <div class="actions">
        <button type="button" onclick={() => void copyTranslation()}>
          {copyState === 'copied' ? 'Copied' : 'Copy'}
        </button>
      </div>
      {#if copyState === 'manual'}
        <p class="muted">Press Ctrl+C (⌘C on Mac) to copy.</p>
      {/if}
    {:else if view.kind === 'notice'}
      <p>{view.message}</p>
    {:else if view.kind === 'error'}
      <p class="error">{view.message}</p>
    {/if}
  </div>
</section>

<style>
  .panel {
    --error-color: #b00020;
    --border-color: #999;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 300px;
  }
  p {
    margin: 0;
  }
  .pair,
  .direction {
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.05em;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  label {
    font-size: 0.85rem;
  }
  textarea,
  button {
    font: inherit;
    padding: 6px 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: #fff;
    color: inherit;
  }
  textarea {
    flex: 1;
    min-width: 0;
    resize: vertical;
  }
  .input-row {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .clear {
    padding: 4px 8px;
    line-height: 1;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
  }
  button {
    cursor: pointer;
  }
  .result {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .translation {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .muted {
    color: #555;
    font-size: 0.85rem;
  }
  .error {
    color: var(--error-color);
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
