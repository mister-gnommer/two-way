import {
  buildTranslationPrompt,
  checkInput,
  parseTranslationResponse,
  translationResponseSchema,
  type GuardOutcome,
  type TranslationResult,
} from './translate';
import type { AppConfig } from './types';

const DEFAULT_TIMEOUT_MS = 30_000;
const TEMPERATURE = 0.2;

/** Everything a translation call can resolve to; the call itself never rejects. */
export type ProviderResult =
  | TranslationResult
  | Exclude<GuardOutcome, { kind: 'ok' }>
  | { kind: 'aborted' };

/** Latest-wins translation client: starting a translation aborts the one in flight. */
export interface Translator {
  /** Translates `text` with the configured provider; a superseded or cancelled call resolves `aborted`. */
  translate(config: AppConfig, text: string): Promise<ProviderResult>;
  /** Aborts the in-flight translation, if any. */
  cancel(): void;
}

type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

export interface TranslatorOptions {
  /** Injected for tests; defaults to the global `fetch`. */
  fetch?: FetchFn;
  /** Budget for one whole translation, temperature retry included. */
  timeoutMs?: number;
}

const MESSAGES = {
  timeout: 'The provider took too long to answer. Try again.',
  unreachable:
    "Couldn't reach the provider. Check the base URL and your connection — the provider may also not allow browser requests (CORS).",
  structuredOutput: "This model doesn't support structured output (JSON schema). Choose a different model.",
  invalidKey: 'The API key contains invalid characters. Re-enter it in the settings.',
  key: 'The provider rejected the API key.',
  forbidden: 'The provider refused the request. Check the API key and your access to this model.',
  notFound: 'The provider could not find this endpoint or model. Check the base URL and model name.',
  rateLimit: 'The provider is rate limiting requests. Try again shortly.',
  providerFailure: 'The provider failed to answer. Try again later.',
  refusal: 'The model declined to translate this text.',
  malformed: "The provider's reply was not in the expected format.",
};

/** The fields of a provider error body used to classify a failure. Never surfaced to the user. */
interface ProviderError {
  param: string | null;
  message: string;
}

type Reply = { kind: 'content'; content: string } | { kind: 'refusal' } | { kind: 'malformed' };

/** Attempt outcome: a final result, or a signal that the model rejected `temperature`. */
type Attempt = { kind: 'done'; result: ProviderResult } | { kind: 'retry-without-temperature' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function trimTrailingSlashes(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

/**
 * Reads a non-2xx body into the fields used for classification; never throws.
 * Bodies that aren't OpenAI-style JSON fall back to their raw text as the message.
 */
async function readProviderError(response: Response): Promise<ProviderError> {
  let text: string;
  try {
    text = await response.text();
  } catch {
    return { param: null, message: '' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { param: null, message: text };
  }
  const error = isRecord(parsed) ? parsed.error : undefined;
  if (!isRecord(error)) {
    return { param: null, message: text };
  }
  return {
    param: typeof error.param === 'string' ? error.param : null,
    message: typeof error.message === 'string' ? error.message : '',
  };
}

// OpenAI sets `param`; other OpenAI-compatible providers often only name the field in the message.
function rejectsTemperature(error: ProviderError): boolean {
  return error.param === 'temperature' || /temperature/i.test(error.message);
}

function rejectsStructuredOutput(error: ProviderError): boolean {
  return error.param === 'response_format' || /response_format|json_schema|structured output/i.test(error.message);
}

/**
 * Picks our own copy for a failed HTTP status; provider text only steers the choice.
 * @param status the HTTP status of the failed response
 * @param error the classified provider error body
 */
function failureMessage(status: number, error: ProviderError): string {
  if (status === 400 && rejectsStructuredOutput(error)) {
    return MESSAGES.structuredOutput;
  }
  if (status === 401) {
    return MESSAGES.key;
  }
  if (status === 403) {
    return MESSAGES.forbidden;
  }
  if (status === 404) {
    return MESSAGES.notFound;
  }
  if (status === 429) {
    return MESSAGES.rateLimit;
  }
  if (status >= 500) {
    return MESSAGES.providerFailure;
  }
  return `The provider rejected the request (HTTP ${status}).`;
}

/** Narrows a 2xx Chat Completions body to the first choice's content, a refusal, or malformed. */
function readReply(body: unknown): Reply {
  if (!isRecord(body) || !Array.isArray(body.choices)) {
    return { kind: 'malformed' };
  }
  const choice: unknown = body.choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) {
    return { kind: 'malformed' };
  }
  const { refusal, content } = choice.message;
  if (refusal !== undefined && refusal !== null) {
    return { kind: 'refusal' };
  }
  if (typeof content !== 'string') {
    return { kind: 'malformed' };
  }
  return { kind: 'content', content };
}

/**
 * Creates a latest-wins translator over an OpenAI-compatible Chat Completions endpoint.
 * Remembers, for its lifetime, which base URL + model pairs rejected `temperature`.
 * @param options injectable `fetch` and timeout, for tests
 */
export function createTranslator(options: TranslatorOptions = {}): Translator {
  // A wrapper, not a stored reference: calling `fetch` detached from `globalThis` throws "Illegal invocation".
  const fetchFn: FetchFn = options.fetch ?? ((url, init) => globalThis.fetch(url, init));
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const noTemperature = new Set<string>();
  let current: AbortController | null = null;

  async function translate(config: AppConfig, text: string): Promise<ProviderResult> {
    current?.abort();
    current = null;
    const guard = checkInput(text);
    if (guard.kind !== 'ok') {
      return guard;
    }

    const { baseUrl, model, apiKey } = config.provider;
    let headers: Headers;
    try {
      headers = new Headers({ Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' });
    } catch {
      // The key is the only variable header value; built here so a bad key isn't reported as unreachable.
      return { kind: 'error', message: MESSAGES.invalidKey, input: text };
    }

    const controller = new AbortController();
    current = controller;
    let timedOut = false;
    const timer = setTimeout(() => {
      // A call already superseded or cancelled stays `aborted`, even if its fetch ignored the signal.
      if (!controller.signal.aborted) {
        timedOut = true;
        controller.abort();
      }
    }, timeoutMs);

    const error = (message: string): ProviderResult => ({ kind: 'error', message, input: text });
    // Checked after every await: an aborted call must never surface a response that arrived anyway.
    const halted = (): ProviderResult | null => {
      if (!controller.signal.aborted) {
        return null;
      }
      return timedOut ? error(MESSAGES.timeout) : { kind: 'aborted' };
    };

    const url = `${trimTrailingSlashes(baseUrl)}/chat/completions`;
    const memoKey = `${trimTrailingSlashes(baseUrl)}\n${model}`;
    const prompt = buildTranslationPrompt(config.pair, guard.text);

    /**
     * Sends one request and reads it into a final result, or asks for a retry when the model rejects `temperature`.
     * @param withTemperature whether the request carries `temperature`
     */
    async function attempt(withTemperature: boolean): Promise<Attempt> {
      const body = {
        model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        ...(withTemperature ? { temperature: TEMPERATURE } : {}),
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'translation', strict: true, schema: translationResponseSchema },
        },
      };
      let response: Response;
      try {
        response = await fetchFn(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          cache: 'no-store',
        });
      } catch {
        return { kind: 'done', result: halted() ?? error(MESSAGES.unreachable) };
      }
      const stopped = halted();
      if (stopped) {
        return { kind: 'done', result: stopped };
      }

      if (!response.ok) {
        const providerError = await readProviderError(response);
        const stoppedOnError = halted();
        if (stoppedOnError) {
          return { kind: 'done', result: stoppedOnError };
        }
        if (withTemperature && response.status === 400 && rejectsTemperature(providerError)) {
          return { kind: 'retry-without-temperature' };
        }
        return { kind: 'done', result: error(failureMessage(response.status, providerError)) };
      }

      let json: unknown;
      try {
        json = await response.json();
      } catch {
        return { kind: 'done', result: halted() ?? error(MESSAGES.malformed) };
      }
      const stoppedOnBody = halted();
      if (stoppedOnBody) {
        return { kind: 'done', result: stoppedOnBody };
      }

      const reply = readReply(json);
      if (reply.kind === 'refusal') {
        return { kind: 'done', result: error(MESSAGES.refusal) };
      }
      if (reply.kind === 'malformed') {
        return { kind: 'done', result: error(MESSAGES.malformed) };
      }
      return { kind: 'done', result: parseTranslationResponse(reply.content, text, config.pair) };
    }

    try {
      const first = await attempt(!noTemperature.has(memoKey));
      if (first.kind === 'done') {
        return first.result;
      }
      noTemperature.add(memoKey);
      const retry = await attempt(false);
      // attempt(false) never asks for another retry; the fallback only satisfies the type.
      return retry.kind === 'done' ? retry.result : error(MESSAGES.malformed);
    } finally {
      clearTimeout(timer);
      if (current === controller) {
        current = null;
      }
    }
  }

  return {
    translate,
    cancel() {
      current?.abort();
      current = null;
    },
  };
}
