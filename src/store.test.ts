import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from './store';

describe('authentification', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      token: null,
      resources: [],
      isLoading: false,
      error: null,
      lastUpdatedAt: null,
    });
  });

  it('enregistre un token valide sans son préfixe Bearer puis le supprime à la déconnexion', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ value: [] }), { status: 200 })),
    );
    expect(await useAppStore.getState().authenticate('Bearer secret-test')).toBe(true);
    expect(useAppStore.getState().token).toBe('secret-test');
    expect(localStorage.getItem('cki-auth')).toContain('secret-test');
    useAppStore.getState().logout();
    expect(useAppStore.getState().token).toBeNull();
  });

  it('ne conserve pas un token refusé', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
    expect(await useAppStore.getState().authenticate('bad-token')).toBe(false);
    expect(useAppStore.getState().token).toBeNull();
    expect(useAppStore.getState().error).toContain('invalide');
  });
});
