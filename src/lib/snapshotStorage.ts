import { validateSnapshot, type DataSnapshot } from './snapshot';

const DATABASE = 'cki-data';
const STORE = 'snapshots';
const KEY = 'current';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    let blocked = false;
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Le stockage local est bloqué par un autre onglet.'));
    };
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else resolve(request.result);
    };
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
  signal?: AbortSignal,
): Promise<T> {
  signal?.throwIfAborted();
  const database = await openDatabase();
  try {
    signal?.throwIfAborted();
    return await new Promise<T>((resolve, reject) => {
      const tx = database.transaction(STORE, mode);
      const request = operation(tx.objectStore(STORE));
      const abort = () => tx.abort();
      signal?.addEventListener('abort', abort, { once: true });
      const cleanup = () => signal?.removeEventListener('abort', abort);
      tx.oncomplete = () => {
        cleanup();
        resolve(request.result);
      };
      tx.onabort = tx.onerror = () => {
        cleanup();
        reject(
          signal?.aborted ? signal.reason : (tx.error ?? new Error('Échec du stockage local.')),
        );
      };
    });
  } finally {
    database.close();
  }
}

export async function readSnapshot(): Promise<DataSnapshot | null> {
  const value: unknown = await transaction('readonly', (store) => store.get(KEY));
  return value === undefined ? null : validateSnapshot(value);
}

export async function writeSnapshot(snapshot: DataSnapshot, signal?: AbortSignal): Promise<void> {
  await transaction('readwrite', (store) => store.put(snapshot, KEY), signal);
}

export async function deleteSnapshot(signal?: AbortSignal): Promise<void> {
  await transaction('readwrite', (store) => store.delete(KEY), signal);
}
