import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_INPUT_CHARS, translationResponseSchema } from './translate';
import { createTranslator } from './provider';
import type { AppConfig } from './types';

const KEY = 'sk-test-secret';

const config: AppConfig = {
  provider: { baseUrl: 'https://api.example.com/v1/', model: 'mini', apiKey: KEY },
  pair: { a: 'pl-PL', b: 'en' },
};

type Responder = (url: string, init: RequestInit) => Promise<Response>;

/** A fetch stub answering each call with the next responder in order (the last one repeats). */
function stubFetch(...responders: Responder[]) {
  let next = 0;
  return vi.fn((url: string, init: RequestInit) => {
    const responder = responders[Math.min(next, responders.length - 1)];
    next += 1;
    return responder(url, init);
  });
}

afterEach(() => {
  vi.useRealTimers();
});

function respond(status: number, body: unknown): Responder {
  return async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
}

const ok = (content: string) => respond(200, { choices: [{ message: { content, refusal: null } }] });
const okCoffee = ok(JSON.stringify({ detected_lang: 'pl', translation: 'coffee' }));
const providerError = (status: number, error: Record<string, unknown>) => respond(status, { error });

/** The parsed JSON body of the nth recorded request. */
function sentBody(fetch: ReturnType<typeof stubFetch>, n = 0): Record<string, unknown> {
  const body = fetch.mock.calls[n][1].body;
  return typeof body === 'string' ? JSON.parse(body) : {};
}

describe('input guard', () => {
  it('rejects blank and over-length input without contacting the provider', async () => {
    const fetch = stubFetch(okCoffee);
    const translator = createTranslator({ fetch });
    expect((await translator.translate(config, '   ')).kind).toBe('blank');
    expect((await translator.translate(config, 'a'.repeat(MAX_INPUT_CHARS + 1))).kind).toBe('too-long');
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('request', () => {
  it('posts the prompt with strict json_schema, temperature, and the key only as a bearer header', async () => {
    const fetch = stubFetch(okCoffee);
    await createTranslator({ fetch }).translate(config, '  kawa  ');

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/v1/chat/completions');
    expect(url).not.toContain(KEY);
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('Authorization')).toBe(`Bearer ${KEY}`);
    expect(init.credentials).toBe('omit');
    expect(init.referrerPolicy).toBe('no-referrer');
    expect(init.cache).toBe('no-store');

    const body = sentBody(fetch);
    expect(body.model).toBe('mini');
    expect(body.temperature).toBe(0.2);
    expect(body.messages).toEqual([
      { role: 'system', content: expect.stringContaining('pl-PL') },
      { role: 'user', content: 'kawa' },
    ]);
    expect(body.response_format).toEqual({
      type: 'json_schema',
      json_schema: { name: 'translation', strict: true, schema: translationResponseSchema },
    });
  });
});

describe('successful reply', () => {
  it('parses the message content through the translation contract', async () => {
    const result = await createTranslator({ fetch: stubFetch(okCoffee) }).translate(config, 'kawa');
    expect(result).toEqual({ kind: 'translation', source: 'pl-PL', target: 'en', translation: 'coffee' });
  });

  it('maps a refusal to an error without surfacing the refusal text', async () => {
    const refusing = respond(200, { choices: [{ message: { content: null, refusal: 'I will not' } }] });
    const result = await createTranslator({ fetch: stubFetch(refusing) }).translate(config, 'kawa');
    expect(result.kind).toBe('error');
    expect(JSON.stringify(result)).not.toContain('I will not');
  });

  it.each([
    ['missing content', { choices: [{ message: { refusal: null } }] }],
    ['no choices', { id: 'x' }],
    ['a non-JSON body', '<html>oops</html>'],
  ])('resolves %s as an error carrying the input', async (_label, body) => {
    const result = await createTranslator({ fetch: stubFetch(respond(200, body)) }).translate(config, 'kawa');
    expect(result).toMatchObject({ kind: 'error', input: 'kawa' });
  });
});

describe('failures', () => {
  // Every body echoes the key, as OpenAI's 401 does, to prove provider text never reaches a result.
  it.each([
    [401, /rejected the API key/],
    [403, /refused the request/],
    [404, /base URL and model/],
    [429, /rate limiting/],
    [503, /failed to answer/],
    [418, /HTTP 418/],
  ])('maps HTTP %i to fixed copy', async (status, message) => {
    const echo = providerError(status, { message: `Incorrect API key provided: ${KEY}` });
    const result = await createTranslator({ fetch: stubFetch(echo) }).translate(config, 'kawa');
    expect(result).toMatchObject({ kind: 'error', input: 'kawa', message: expect.stringMatching(message) });
    expect(JSON.stringify(result)).not.toContain(KEY);
    expect(JSON.stringify(result)).not.toContain('Incorrect');
  });

  it.each([
    ['a line break', `${KEY}\nX`],
    ['a non-Latin-1 character', `${KEY}\u201c`],
  ])('reports a key containing %s as invalid without contacting the provider', async (_label, apiKey) => {
    const fetch = stubFetch(okCoffee);
    const result = await createTranslator({ fetch }).translate({ ...config, provider: { ...config.provider, apiKey } }, 'kawa');
    expect(result).toMatchObject({ kind: 'error', input: 'kawa', message: expect.stringContaining('invalid characters') });
    expect(JSON.stringify(result)).not.toContain(KEY);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('maps a network failure to an unreachable error naming CORS', async () => {
    const offline: Responder = async () => {
      throw new TypeError('Failed to fetch');
    };
    const result = await createTranslator({ fetch: stubFetch(offline) }).translate(config, 'kawa');
    expect(result).toMatchObject({ kind: 'error', input: 'kawa', message: expect.stringContaining('CORS') });
  });
});

describe('400 classification', () => {
  it.each([
    ['param', { param: 'response_format', message: 'Invalid value' }],
    ['message only', { message: "json_schema is not supported by this model" }],
  ])('reports missing structured-output support (%s) without a second request', async (_label, error) => {
    const fetch = stubFetch(providerError(400, error));
    const result = await createTranslator({ fetch }).translate(config, 'kawa');
    expect(result).toMatchObject({ kind: 'error', message: expect.stringContaining('structured output') });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('maps an unclassified 400 to the generic rejection', async () => {
    const fetch = stubFetch(providerError(400, { message: 'messages is too long' }));
    const result = await createTranslator({ fetch }).translate(config, 'kawa');
    expect(result).toMatchObject({ kind: 'error', message: expect.stringContaining('HTTP 400') });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('temperature retry', () => {
  const rejectTemperature = providerError(400, { param: 'temperature', message: 'Unsupported value' });

  it('retries once without temperature and returns the retry outcome', async () => {
    const fetch = stubFetch(rejectTemperature, okCoffee);
    const result = await createTranslator({ fetch }).translate(config, 'kawa');
    expect(result.kind).toBe('translation');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sentBody(fetch, 1)).not.toHaveProperty('temperature');
  });

  it('stops after the retry when it fails too', async () => {
    const fetch = stubFetch(rejectTemperature, respond(500, 'down'));
    const result = await createTranslator({ fetch }).translate(config, 'kawa');
    expect(result).toMatchObject({ kind: 'error', message: expect.stringMatching(/failed to answer/) });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('remembers the rejection for the same base URL and model only', async () => {
    const fetch = stubFetch(rejectTemperature, okCoffee);
    const translator = createTranslator({ fetch });
    await translator.translate(config, 'kawa');
    await translator.translate({ ...config, provider: { ...config.provider, baseUrl: 'https://api.example.com/v1' } }, 'kawa');
    await translator.translate({ ...config, provider: { ...config.provider, model: 'other' } }, 'kawa');

    expect(fetch).toHaveBeenCalledTimes(4);
    expect(sentBody(fetch, 2)).not.toHaveProperty('temperature');
    expect(sentBody(fetch, 3).temperature).toBe(0.2);
  });
});

describe('cancellation', () => {
  /** A fetch whose single response the test releases by hand, ignoring abort like a response already in transit. */
  function heldFetch() {
    const held = Promise.withResolvers<Response>();
    const fetch = vi.fn((_url: string, _init: RequestInit) => held.promise);
    return { fetch, release: () => held.resolve(new Response(JSON.stringify({ choices: [{ message: { content: '{"detected_lang":"pl","translation":"coffee"}' } }] }))) };
  }

  it('aborts the in-flight call when a newer one starts and drops its late response', async () => {
    const { fetch, release } = heldFetch();
    const translator = createTranslator({ fetch });
    const first = translator.translate(config, 'kawa');
    void translator.translate(config, '   ');

    expect(fetch.mock.calls[0][1].signal?.aborted).toBe(true);
    release();
    expect(await first).toEqual({ kind: 'aborted' });
  });

  it('resolves the in-flight call as aborted on cancel', async () => {
    const { fetch, release } = heldFetch();
    const translator = createTranslator({ fetch });
    const pending = translator.translate(config, 'kawa');
    translator.cancel();
    release();
    expect(await pending).toEqual({ kind: 'aborted' });
  });
});

describe('timeout', () => {
  const hanging = (_url: string, init: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });

  it('reports a timeout as an error, not as aborted', async () => {
    const result = await createTranslator({ fetch: hanging, timeoutMs: 5 }).translate(config, 'kawa');
    expect(result).toMatchObject({ kind: 'error', input: 'kawa', message: expect.stringContaining('too long') });
  });

  it('clears the timer once a translation completes', async () => {
    vi.useFakeTimers();
    await createTranslator({ fetch: stubFetch(okCoffee) }).translate(config, 'kawa');
    expect(vi.getTimerCount()).toBe(0);
  });
});
