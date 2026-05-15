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
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  let db: IDBDatabase;
  try {
    db = await openDb();
  } catch {
    return undefined as unknown as T;
  }
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result: T;
    Promise.resolve(fn(store))
      .then((r) => {
        result = r;
      })
      .catch(reject);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => {
      console.warn('[whiteboard] IDB tx error:', tx.error);
      reject(tx.error ?? new Error('IDB tx error'));
    };
    tx.onabort = () => reject(tx.error ?? new Error('IDB tx aborted'));
  });
}

function cursorAllByIndex(
  store: IDBObjectStore,
  indexName: string,
  key: IDBValidKey,
): Promise<FileRecord[]> {
  return new Promise((resolve, reject) => {
    const out: FileRecord[] = [];
    const req = store.index(indexName).openCursor(IDBKeyRange.only(key));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        out.push(cursor.value as FileRecord);
        cursor.continue();
      } else {
        resolve(out);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function readFiles(storageKey: string): Promise<BinaryFiles> {
  try {
    const records = await withStore('readonly', (store) =>
      cursorAllByIndex(store, 'storageKey', storageKey),
    );
    if (!records) return {};
    const out: BinaryFiles = {};
    for (const r of records) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (out as any)[r.id] = {
        dataURL: r.dataURL,
        mimeType: r.mimeType,
        created: r.created,
      };
    }
    return out;
  } catch (err) {
    console.warn('[whiteboard] readFiles failed:', err);
    return {};
  }
}

export async function writeFiles(storageKey: string, files: BinaryFiles): Promise<void> {
  const entries = Object.entries(files);
  if (entries.length === 0) return;
  try {
    await withStore('readwrite', async (store) => {
      const existing = await new Promise<Set<string>>((resolve, reject) => {
        const req = store.index('storageKey').getAllKeys(IDBKeyRange.only(storageKey));
        req.onsuccess = () => resolve(new Set(req.result as string[]));
        req.onerror = () => reject(req.error);
      });
      const now = Date.now();
      for (const [id, f] of entries) {
        if (existing.has(id)) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ff = f as any;
        const rec: FileRecord = {
          id,
          storageKey,
          dataURL: ff.dataURL,
          mimeType: ff.mimeType,
          created: ff.created ?? now,
          savedAt: now,
        };
        store.put(rec);
      }
    });
  } catch (err) {
    console.warn('[whiteboard] writeFiles failed:', err);
  }
}

export async function pruneFiles(
  storageKey: string,
  keepIds: ReadonlySet<string>,
): Promise<void> {
  try {
    await withStore('readwrite', async (store) => {
      const keys = await new Promise<string[]>((resolve, reject) => {
        const req = store.index('storageKey').getAllKeys(IDBKeyRange.only(storageKey));
        req.onsuccess = () => resolve(req.result as string[]);
        req.onerror = () => reject(req.error);
      });
      for (const id of keys) {
        if (!keepIds.has(id)) store.delete(id);
      }
    });
  } catch (err) {
    console.warn('[whiteboard] pruneFiles failed:', err);
  }
}

export async function clearAll(storageKey: string): Promise<void> {
  try {
    await withStore('readwrite', async (store) => {
      const keys = await new Promise<string[]>((resolve, reject) => {
        const req = store.index('storageKey').getAllKeys(IDBKeyRange.only(storageKey));
        req.onsuccess = () => resolve(req.result as string[]);
        req.onerror = () => reject(req.error);
      });
      for (const id of keys) store.delete(id);
    });
  } catch (err) {
    console.warn('[whiteboard] clearAll failed:', err);
  }
}
