<script lang="ts">
  import { flushSync, onMount, untrack } from 'svelte';
  import { chantView, isChant } from '../lib/cthulu';
  import { createTranslator } from '../lib/provider';
  import { pairLabel, resultView, type ResultView } from '../lib/translate-view';
  import type { AppConfig } from '../lib/types';

  interface Props {
    /** The saved config every translation uses; a new object means settings were saved. */
    config: AppConfig;
    /** Opens the setup modal from the bar's Settings button. */
    onsettings: () => void;
  }

  let { config, onsettings }: Props = $props();

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
  let lastDirection: string | null = null;

  const pair = $derived(pairLabel(config.pair));

  onMount(() => {
    // Rewrapped text needs a new height without any input; height changes are fitInput's own, so skip them (redesign D3).
    let width = inputEl.clientWidth;
    const observer = new ResizeObserver(() => {
      if (inputEl.clientWidth !== width) {
        width = inputEl.clientWidth;
        fitInput();
      }
    });
    observer.observe(inputEl);
    return () => {
      observer.disconnect();
      translator.cancel();
      clearTimeout(copyTimer);
    };
  });

  // Saved settings may change the pair or provider: drop the in-flight request and the result (D5).
  $effect(() => {
    void config;
    untrack(reset);
  });

  $effect(() => {
    void input;
    fitInput();
  });

  /** Sizes the input to its content; resetting to `auto` first lets it shrink. CSS bounds it to one to six rows (redesign D3). */
  function fitInput(): void {
    inputEl.style.height = 'auto';
    inputEl.style.height = `${inputEl.scrollHeight}px`;
  }

  /**
   * Replaces the result area's content; any copy confirmation belonged to the old view.
   * @param next the view to show
   */
  function show(next: ResultView): void {
    view = next;
    if (next.kind === 'translation') {
      lastDirection = next.direction.text;
    }
    clearTimeout(copyTimer);
    copyState = 'idle';
  }

  /** Animates direction changes without letting a delayed callback replace a newer view. */
  function showOutcome(next: ResultView): void {
    if (
      next.kind !== 'translation' ||
      lastDirection === null ||
      lastDirection === next.direction.text ||
      typeof document.startViewTransition !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      show(next);
      return;
    }
    const shown = view;
    const transition = document.startViewTransition(() => {
      if (view === shown) {
        flushSync(() => show(next));
      }
    });
    // Skipped animations reject readiness but still run their DOM update.
    void transition.ready.catch(() => undefined);
  }

  /** Cancels the in-flight request, whose call then resolves `aborted`, and empties the result. */
  function reset(): void {
    translator.cancel();
    lastDirection = null;
    show({ kind: 'idle' });
  }

  /** Translates the current input; a newer submit supersedes this one, whose `aborted` result is ignored. */
  async function handleSubmit(): Promise<void> {
    if (isChant(input)) {
      translator.cancel();
      showOutcome(chantView());
      return;
    }
    show({ kind: 'translating' });
    const next = resultView(await translator.translate(config, input));
    if (next) {
      showOutcome(next);
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
  <form
    bind:this={form}
    onsubmit={(event) => {
      event.preventDefault();
      void handleSubmit();
    }}
  >
    <div class="bar">
      <p class="pair" title={pair.name}>
        <span aria-hidden="true">{pair.text}</span>
        <span class="visually-hidden">{pair.name}</span>
      </p>
      <label for="translate-input" class="visually-hidden">Text to translate</label>
      <textarea
        id="translate-input"
        rows="1"
        placeholder="Text to translate"
        autocomplete="off"
        spellcheck="false"
        bind:this={inputEl}
        bind:value={input}
        onkeydown={handleKeydown}
      ></textarea>
      {#if input}
        <button type="button" class="icon clear" aria-label="Clear text" title="Clear text" onclick={clearInput}>×</button>
      {/if}
      <button type="button" class="icon" aria-label="Settings" title="Settings" onclick={onsettings}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            fill="currentColor"
            d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.61.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54c.05.24.26.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.48 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
          />
        </svg>
      </button>
      <button type="submit" class="go" aria-label="Translate" title="Translate">
        <img src="/two-way-icon.svg" alt="" width="28" height="28" />
      </button>
    </div>
  </form>

  <!-- Always rendered: screen readers often ignore a live region inserted together with its text. -->
  <div class="result" role="status">
    {#if view.kind !== 'idle'}
      <div class="card" class:is-error={view.kind === 'error'}>
        {#if view.kind === 'translating'}
          <p class="muted">Translating…</p>
        {:else if view.kind === 'translation'}
          <p class="direction" title={view.direction.name}>
            <span aria-hidden="true">{view.direction.text}</span>
            <span class="visually-hidden">{view.direction.name}</span>
          </p>
          <p class="translation" class:eldritch={view.eldritch} lang={view.lang} bind:this={translationEl}>{view.text}</p>
          <div class="actions">
            <button type="button" class="copy" onclick={() => void copyTranslation()}>
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
    {/if}
  </div>
</section>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    container-type: inline-size;
  }
  p {
    margin: 0;
  }
  /* Rows are 32 px: the buttons' size, and the textarea's 22 px line plus 5 px padding each side. */
  .bar {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    padding: 4px;
    border: 1px solid var(--color-border);
    border-radius: 21px;
    background: var(--color-surface);
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
  }
  .bar:has(textarea:focus) {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 1px var(--color-accent);
  }
  .pair {
    align-self: flex-start;
    flex: none;
    margin: 4px 0 4px 2px;
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--color-accent-soft);
    color: var(--color-accent-soft-text);
    font-size: 0.8rem;
    line-height: 18px;
    white-space: nowrap;
  }
  .pair,
  .direction {
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .direction {
    color: var(--color-muted);
    font-size: 0.8rem;
    view-transition-name: direction;
  }
  :global(::view-transition-old(root)),
  :global(::view-transition-new(root)) {
    animation: none;
  }
  :global(::view-transition-new(direction)) {
    animation: direction-flip 300ms ease-out;
  }
  @keyframes -global-direction-flip {
    from {
      transform: rotateX(90deg);
    }
    to {
      transform: rotateX(0deg);
    }
  }
  textarea {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    /* The minimum covers a measurement taken before layout, which reads 0 (redesign D3). */
    min-height: calc(1lh + 10px);
    max-height: calc(6lh + 10px);
    padding: 5px 4px;
    border: none;
    outline: none;
    background: none;
    color: inherit;
    font: inherit;
    line-height: 22px;
    resize: none;
    overflow-y: auto;
  }
  textarea::placeholder {
    color: var(--color-muted);
    opacity: 1;
  }
  button {
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
  .icon,
  .go {
    display: grid;
    place-items: center;
    flex: none;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 50%;
  }
  .icon {
    background: none;
    color: var(--color-muted);
  }
  .icon:hover {
    background: var(--color-accent-soft);
    color: var(--color-accent-soft-text);
  }
  .clear {
    font-size: 1.25rem;
    line-height: 1;
  }
  /* Too narrow for the chip and three buttons beside a usable input: the input takes its own row (redesign D11). */
  @container (width < 360px) {
    .bar {
      flex-wrap: wrap;
    }
    textarea {
      order: -1;
      flex-basis: 100%;
    }
    .pair {
      align-self: center;
      margin-right: auto;
    }
  }
  /* With the bar's 6 px gap, keeps 10 px between Settings and Translate against misclicks. */
  .go {
    margin-left: 4px;
    background: var(--color-logo-tile);
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.25);
  }
  .go:hover {
    filter: brightness(1.25);
  }
  @media (prefers-reduced-motion: no-preference) {
    .go {
      transition: transform 120ms ease-out;
    }
    .go:hover {
      transform: scale(1.06);
    }
    .go:active {
      transform: scale(0.94);
    }
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    border-left: 3px solid transparent;
    border-radius: 12px;
    background: var(--color-surface);
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.15);
  }
  .card.is-error {
    border-left-color: var(--color-error);
  }
  .translation {
    font-size: 1.05rem;
    line-height: 1.4;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .translation.eldritch {
    color: var(--color-eldritch);
    text-shadow: 0 0 8px var(--color-eldritch);
    animation: eldritch-pulse 1.2s ease-in-out 3;
  }
  @keyframes eldritch-pulse {
    50% {
      text-shadow: 0 0 16px var(--color-eldritch);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .translation.eldritch {
      animation: none;
    }
  }
  .actions {
    display: flex;
    justify-content: flex-end;
  }
  .copy {
    padding: 3px 12px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
    font-size: 0.85rem;
  }
  .muted {
    color: var(--color-muted);
    font-size: 0.85rem;
  }
  .error {
    color: var(--color-error);
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
