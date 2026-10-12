import { describe, expect, it, vi } from 'vitest';
import {
  AbraxioApiError,
  fetchAbraxioMembers,
  fetchAbraxioResponse,
  parseMembersResponse,
} from './client';

describe('parseMembersResponse', () => {
  it('accepte une enveloppe Abraxio valide', () =>
    expect(parseMembersResponse({ value: [{ id: 1 }] })).toEqual([{ id: 1 }]));
  it('refuse une enveloppe invalide', () =>
    expect(() => parseMembersResponse({ items: [] })).toThrow(AbraxioApiError));
  it('refuse les entrées qui ne sont pas des objets', () =>
    expect(() => parseMembersResponse({ value: [null] })).toThrow(AbraxioApiError));
});

describe('API fetching', () => {
  it('preserves the complete response while keeping the member-only contract', async () => {
    const payload = { value: [{ id: 1, futureField: 'kept' }], metadata: { next: null } };
    const fetch = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(payload))));
    vi.stubGlobal('fetch', fetch);
    expect(await fetchAbraxioResponse('secret-test')).toEqual(payload);
    expect(await fetchAbraxioMembers('secret-test')).toEqual(payload.value);
    expect(fetch).toHaveBeenCalledWith(
      '/api/abraxio/members',
      expect.objectContaining({
        cache: 'no-store',
        headers: { Accept: 'application/json', Authorization: 'Bearer secret-test' },
      }),
    );
  });

  it('times out a stalled request after 30 seconds', async () => {
    vi.useFakeTimers();
    try {
      const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation((milliseconds) => {
        const controller = new AbortController();
        setTimeout(
          () => controller.abort(new DOMException('Timed out', 'TimeoutError')),
          milliseconds,
        );
        return controller.signal;
      });
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockImplementation(
            (_url, { signal }: { signal: AbortSignal }) =>
              new Promise((_resolve, reject) =>
                signal.addEventListener('abort', () => reject(signal.reason)),
              ),
          ),
      );
      const result = expect(fetchAbraxioResponse('secret-test')).rejects.toThrow('30 secondes');
      await vi.advanceTimersByTimeAsync(30_000);
      await result;
      expect(timeout).toHaveBeenCalledWith(30_000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('propagates cancellation without exposing the token', async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(
          (_url, { signal }: { signal: AbortSignal }) =>
            new Promise((_resolve, reject) =>
              signal.addEventListener('abort', () => reject(signal.reason)),
            ),
        ),
    );
    const request = fetchAbraxioResponse('secret-test', controller.signal);
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });
});
