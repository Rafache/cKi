import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteSnapshot, readSnapshot, writeSnapshot } from './snapshotStorage';
import { createSnapshot } from './snapshot';
import { member } from '../test/fixtures';

const snapshot = createSnapshot(
  { value: [member()], metadata: { unknownField: true } },
  '2026-10-12T08:00:00.000Z',
);

describe('IndexedDB snapshot storage', () => {
  beforeEach(() => vi.stubGlobal('indexedDB', new IDBFactory()));

  it('restores the full persisted snapshot and deletes it explicitly', async () => {
    expect(await readSnapshot()).toBeNull();
    await writeSnapshot(snapshot);
    expect(await readSnapshot()).toEqual(snapshot);
    await deleteSnapshot();
    expect(await readSnapshot()).toBeNull();
  });

  it('preserves an empty snapshot as an existing backup', async () => {
    const empty = createSnapshot({ value: [] }, snapshot.fetchedAt);
    await writeSnapshot(empty);
    expect(await readSnapshot()).toEqual(empty);
  });

  it('preserves the last snapshot when a write fails', async () => {
    await writeSnapshot(snapshot);
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    await expect(writeSnapshot(createSnapshot({ value: [] }, null))).rejects.toThrow();
    expect(await readSnapshot()).toEqual(snapshot);
  });

  it('does not overwrite data when an operation is cancelled while opening the database', async () => {
    await writeSnapshot(snapshot);
    const controller = new AbortController();
    const write = writeSnapshot(createSnapshot({ value: [] }, null), controller.signal);
    controller.abort();
    await expect(write).rejects.toThrow();
    expect(await readSnapshot()).toEqual(snapshot);
  });

  it('reports unavailable storage', async () => {
    vi.stubGlobal('indexedDB', undefined);
    await expect(readSnapshot()).rejects.toThrow();
  });
});
