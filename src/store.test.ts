import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore } from './store';
import { createSnapshot } from './lib/snapshot';
import { deleteSnapshot, readSnapshot, writeSnapshot } from './lib/snapshotStorage';
import { member } from './test/fixtures';

vi.mock('./lib/snapshotStorage', () => ({
  readSnapshot: vi.fn(),
  writeSnapshot: vi.fn(),
  deleteSnapshot: vi.fn(),
}));

const snapshot = createSnapshot(
  { value: [member()], extra: { keep: true } },
  '2026-10-12T08:00:00.000Z',
);
let store: ReturnType<typeof createAppStore>;

async function restoreData() {
  vi.mocked(readSnapshot).mockResolvedValue(snapshot);
  await store.getState().restore();
}

function respond(payload: unknown = snapshot.payload, status = 200) {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

describe('local data and authentication', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(readSnapshot).mockReset().mockResolvedValue(null);
    vi.mocked(writeSnapshot).mockReset().mockResolvedValue(undefined);
    vi.mocked(deleteSnapshot).mockReset().mockResolvedValue(undefined);
    store = createAppStore();
  });

  it('restores without a token or API request and deduplicates initialization', async () => {
    const fetch = respond();
    await Promise.all([restoreData(), store.getState().restore()]);
    expect(store.getState().resources).toHaveLength(1);
    expect(store.getState().source).toBe('local');
    expect(store.getState().token).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(readSnapshot).toHaveBeenCalledTimes(1);
  });

  it('restores an empty snapshot without triggering API access', async () => {
    const fetch = respond();
    vi.mocked(readSnapshot).mockResolvedValue(createSnapshot({ value: [] }, snapshot.fetchedAt));
    await store.getState().restore();
    expect(store.getState().snapshot).not.toBeNull();
    expect(store.getState().resources).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('stores a valid token without its Bearer prefix and retains data on logout', async () => {
    await store.getState().restore();
    respond();
    expect(await store.getState().authenticate('Bearer secret-test')).toBe(true);
    expect(store.getState().token).toBe('secret-test');
    expect(localStorage.getItem('cki-auth')).toContain('secret-test');
    expect(localStorage.getItem('cki-auth')).not.toContain('payload');
    expect(writeSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ payload: snapshot.payload }),
      expect.any(AbortSignal),
    );
    store.getState().logout();
    expect(store.getState().token).toBeNull();
    expect(localStorage.getItem('cki-auth')).not.toContain('secret-test');
    expect(store.getState().resources).toHaveLength(1);
    expect(store.getState().snapshot).not.toBeNull();
    expect(deleteSnapshot).not.toHaveBeenCalled();
  });

  it('does not retain a refused token or remove saved data', async () => {
    await restoreData();
    respond({}, 401);
    expect(await store.getState().authenticate('bad-token')).toBe(false);
    expect(store.getState().token).toBeNull();
    expect(store.getState().snapshot).toEqual(snapshot);
    expect(store.getState().error).toContain('invalide');
  });

  it.each([401, 403, 429, 500])('preserves saved data after HTTP %s', async (status) => {
    await restoreData();
    store.setState({ token: 'secret-test' });
    respond({}, status);
    await store.getState().loadResources();
    expect(store.getState().snapshot).toEqual(snapshot);
    expect(store.getState().resources).toHaveLength(1);
    expect(store.getState().token).toBe(status === 401 ? null : 'secret-test');
    expect(writeSnapshot).not.toHaveBeenCalled();
  });

  it('preserves saved data after network and validation failures', async () => {
    await restoreData();
    store.setState({ token: 'secret-test' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network')));
    await store.getState().loadResources();
    expect(store.getState().snapshot).toEqual(snapshot);
    respond({ value: [member({ periods: [null] } as never)] });
    await store.getState().loadResources();
    expect(store.getState().snapshot).toEqual(snapshot);
    expect(writeSnapshot).not.toHaveBeenCalled();
  });

  it('keeps the previous snapshot when an empty DTDD result is declined', async () => {
    await restoreData();
    store.setState({ token: 'secret-test' });
    respond({ value: [member({ team: null })] });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await store.getState().loadResources();
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(store.getState().snapshot).toEqual(snapshot);
    expect(writeSnapshot).not.toHaveBeenCalled();
  });

  it('preserves saved data after a response containing invalid JSON', async () => {
    await restoreData();
    store.setState({ token: 'secret-test' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{')));
    await store.getState().loadResources();
    expect(store.getState().snapshot).toEqual(snapshot);
    expect(store.getState().error).toContain('JSON valide');
    expect(writeSnapshot).not.toHaveBeenCalled();
  });

  it('saves an empty result after confirmation', async () => {
    await restoreData();
    store.setState({ token: 'secret-test' });
    respond({ value: [] });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await store.getState().loadResources();
    expect(store.getState().snapshot?.payload.value).toEqual([]);
    expect(writeSnapshot).toHaveBeenCalledOnce();
  });

  it('shows fresh data with an export warning if persistence fails', async () => {
    await restoreData();
    vi.mocked(writeSnapshot).mockRejectedValue(new Error('Full'));
    respond({ value: [member({ name: 'New name' })] });
    expect(await store.getState().authenticate('secret-test')).toBe(true);
    expect(store.getState().resources[0].name).toBe('New name');
    expect(store.getState().warning).toContain('Exportez');
    expect(store.getState().snapshot?.payload.value[0].name).toBe('New name');
  });

  it('imports without contacting the API and records a separate import date', async () => {
    await store.getState().restore();
    const fetch = respond();
    expect(await store.getState().importSnapshot(snapshot)).toBe(true);
    expect(store.getState().lastUpdatedAt).toBe(snapshot.fetchedAt);
    expect(store.getState().snapshot?.importedAt).toEqual(expect.any(String));
    expect(store.getState().importRevision).toBe(1);
    expect(store.getState().source).toBe('import');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects invalid imports without replacing current data', async () => {
    await restoreData();
    expect(await store.getState().importSnapshot({ ...snapshot, version: 2 } as never)).toBe(false);
    expect(store.getState().snapshot).toEqual(snapshot);
    expect(writeSnapshot).not.toHaveBeenCalled();
  });

  it('ignores late API responses after import and blocks parallel requests', async () => {
    await restoreData();
    store.setState({ token: 'secret-test' });
    const request = deferred<Response>();
    const fetch = vi.fn().mockReturnValue(request.promise);
    vi.stubGlobal('fetch', fetch);
    const loading = store.getState().loadResources();
    await store.getState().loadResources();
    expect(fetch).toHaveBeenCalledOnce();
    const imported = createSnapshot(
      { value: [member({ name: 'Imported name' })] },
      snapshot.fetchedAt,
    );
    await store.getState().importSnapshot(imported);
    request.resolve(new Response(JSON.stringify({ value: [] })));
    await loading;
    expect(store.getState().resources[0].name).toBe('Imported name');
    expect(writeSnapshot).toHaveBeenCalledOnce();
  });

  it('ignores late authentication after logout', async () => {
    await restoreData();
    const request = deferred<Response>();
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(request.promise));
    const loading = store.getState().authenticate('secret-test');
    store.getState().logout();
    request.resolve(new Response(JSON.stringify({ value: [] })));
    expect(await loading).toBe(false);
    expect(store.getState().token).toBeNull();
    expect(store.getState().snapshot).toEqual(snapshot);
    expect(writeSnapshot).not.toHaveBeenCalled();
  });

  it('ignores outdated persistence results after import', async () => {
    await restoreData();
    const pendingWrite = deferred<void>();
    vi.mocked(writeSnapshot).mockReturnValueOnce(pendingWrite.promise);
    respond();
    const loading = store.getState().authenticate('secret-test');
    await vi.waitFor(() => expect(writeSnapshot).toHaveBeenCalledOnce());
    await store
      .getState()
      .importSnapshot(createSnapshot({ value: [member({ name: 'Imported name' })] }, null));
    pendingWrite.resolve();
    expect(await loading).toBe(false);
    expect(store.getState().resources[0].name).toBe('Imported name');
    expect(store.getState().token).toBeNull();
  });

  it('ignores restoration results superseded by an import', async () => {
    const pendingRead = deferred<typeof snapshot>();
    vi.mocked(readSnapshot).mockReturnValueOnce(pendingRead.promise);
    const restoring = store.getState().restore();
    await store.getState().importSnapshot(createSnapshot({ value: [] }, null));
    pendingRead.resolve(snapshot);
    await restoring;
    expect(store.getState().resources).toEqual([]);
    expect(store.getState().source).toBe('import');
  });

  it('erases saved and in-memory data while preserving the token', async () => {
    await restoreData();
    store.setState({ token: 'secret-test' });
    await store.getState().eraseData();
    expect(deleteSnapshot).toHaveBeenCalledOnce();
    expect(store.getState().snapshot).toBeNull();
    expect(store.getState().resources).toEqual([]);
    expect(store.getState().token).toBe('secret-test');
  });

  it('preserves current data if deletion fails', async () => {
    await restoreData();
    vi.mocked(deleteSnapshot).mockRejectedValue(new Error('Denied'));
    await store.getState().eraseData();
    expect(store.getState().snapshot).toEqual(snapshot);
    expect(store.getState().error).toContain('Impossible d’effacer');
  });

  it('allows an import after a restoration failure', async () => {
    vi.mocked(readSnapshot).mockRejectedValue(new Error('Unavailable'));
    await store.getState().restore();
    expect(store.getState().isRestoring).toBe(false);
    expect(store.getState().warning).not.toBeNull();
    expect(await store.getState().importSnapshot(snapshot)).toBe(true);
  });
});
