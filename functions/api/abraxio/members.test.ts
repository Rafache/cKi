import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequest } from './members';

const request = (method = 'GET', authorization?: string): Request =>
  new Request('https://cki.pages.dev/api/abraxio/members', {
    method,
    headers: authorization ? { Authorization: authorization } : undefined,
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Cloudflare Pages Abraxio proxy', () => {
  it('rejects methods other than GET without calling Abraxio', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequest({ request: request('POST', 'Bearer secret') });

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'Basic secret', 'Bearer'])(
    'rejects a missing or invalid bearer token: %s',
    async (authorization) => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const response = await onRequest({ request: request('GET', authorization) });

      expect(response.status).toBe(401);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('forwards only the required request headers and preserves the upstream response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ value: [] }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': 'private=value',
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequest({ request: request('GET', 'Bearer user-token') });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://app.abraxio.com/api/management/teams/members/all',
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer user-token',
        },
        redirect: 'manual',
      },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ value: [] });
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
    expect(response.headers.get('Set-Cookie')).toBeNull();
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('preserves upstream errors and retry information', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'rate limit' }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }),
      ),
    );

    const response = await onRequest({ request: request('GET', 'Bearer user-token') });

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
  });

  it('returns a generic error when Abraxio cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private network details')));

    const response = await onRequest({ request: request('GET', 'Bearer user-token') });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      message: "L'API Abraxio est temporairement inaccessible.",
    });
  });
});
