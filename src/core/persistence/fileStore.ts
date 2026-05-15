import type { BinaryFiles } from '../../types';

const DB_NAME = 'whiteboard-files';
const DB_VERSION = 1;
const STORE = 'files';

interface FileRecord {
  id: string;
  storageKey: string;
  dataURL: string;
  mimeType: string;
  created: number;
  savedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;
let idbDisabled = false;

function openDb(): Promise<IDBDatabase> {
  if (idbDisabled) return Promise.reject(new Error('IndexedDB disabled'));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      idbDisabled = true;
      reject(new Error('indexedDB undefined'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('storageKey', 'storageKey', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      idbDisabled = true;
      reject(req.error ?? new Error('IDB open failed'));
    };
  });
  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (
    store: IDBObjectStore,
    setResult: (value: T) => void,
    fail: (error: unknown) => void,
  ) => void,
  fallback: T,
): Promise<T> {
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return fallback;
  }
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result = fallback;
    try {
      fn(
        store,
        (value) => {
          result = value;
        },
        reject,
      );
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => {
      console.warn('[whiteboard] IDB tx error:', tx.error);
      reject(tx.error ?? new Error('IDB tx error'));
    };
    tx.onabort = () => reject(tx.error ?? new Error('IDB tx aborted'));
  });
}

export async function readFiles(storageKey: string): Promise<BinaryFiles> {
  try {
    return await withStore(
      'readonly',
      (store, setResult, fail) => {
        const out: BinaryFiles = {};
        const req = store.index('storageKey').openCursor(IDBKeyRange.only(storageKey));
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            setResult(out);
            return;
          }
          const record = cursor.value as FileRecord;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (out as any)[record.id] = {
            dataURL: record.dataURL,
            mimeType: record.mimeType,
            created: record.created,
          };
          cursor.continue();
        };
        req.onerror = () => fail(req.error);
      },
      {},
    );
  } catch (err) {
    console.warn('[whiteboard] readFiles failed:', err);
    return {};
  }
}

export async function writeFiles(storageKey: string, files: BinaryFiles): Promise<void> {
  const entries = Object.entries(files);
  if (entries.length === 0) return;
  try {
    await withStore<void>(
      'readwrite',
      (store, setResult, fail) => {
        let pending = entries.length;
        const finishOne = () => {
          pending -= 1;
          if (pending === 0) setResult(undefined);
        };

        const now = Date.now();
        for (const [id, f] of entries) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ff = f as any;
          const getReq = store.get(id);
          getReq.onsuccess = () => {
            if (getReq.result) {
              finishOne();
              return;
            }
            const rec: FileRecord = {
              id,
              storageKey,
              dataURL: ff.dataURL,
              mimeType: ff.mimeType,
              created: ff.created ?? now,
              savedAt: now,
            };
            const putReq = store.put(rec);
            putReq.onsuccess = finishOne;
            putReq.onerror = () => fail(putReq.error);
          };
          getReq.onerror = () => fail(getReq.error);
        };
      },
      undefined,
    );
  } catch (err) {
    console.warn('[whiteboard] writeFiles failed:', err);
  }
}

export async function pruneFiles(
  storageKey: string,
  keepIds: ReadonlySet<string>,
): Promise<void> {
  try {
    await withStore<void>(
      'readwrite',
      (store, setResult, fail) => {
        const req = store.index('storageKey').openCursor(IDBKeyRange.only(storageKey));
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            setResult(undefined);
            return;
          }
          const record = cursor.value as FileRecord;
          if (keepIds.has(record.id)) {
            cursor.continue();
            return;
          }
          const deleteReq = cursor.delete();
          deleteReq.onsuccess = () => cursor.continue();
          deleteReq.onerror = () => fail(deleteReq.error);
        };
        req.onerror = () => fail(req.error);
      },
      undefined,
    );
  } catch (err) {
    console.warn('[whiteboard] pruneFiles failed:', err);
  }
}

export async function clearAll(storageKey: string): Promise<void> {
  try {
    await withStore<void>(
      'readwrite',
      (store, setResult, fail) => {
        const req = store.index('storageKey').openCursor(IDBKeyRange.only(storageKey));
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            setResult(undefined);
            return;
          }
          const deleteReq = cursor.delete();
          deleteReq.onsuccess = () => cursor.continue();
          deleteReq.onerror = () => fail(deleteReq.error);
        };
        req.onerror = () => fail(req.error);
      },
      undefined,
    );
  } catch (err) {
    console.warn('[whiteboard] clearAll failed:', err);
  }
}
