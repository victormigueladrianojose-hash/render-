import { HistoryItem } from '../types';

const DB_NAME = 'LuzRenderDB';
const DB_VERSION = 1;
const STORE_NAME = 'renders';

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (event: any) => resolve(event.target.result);
    request.onerror = (event: any) => reject(event.target.error);
  });
}

export async function saveHistoryItemLocal(item: HistoryItem): Promise<void> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not save to IndexedDB:', err);
  }
}

export async function getHistoryItemsLocal(): Promise<HistoryItem[]> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result || [];
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not fetch from IndexedDB:', err);
    return [];
  }
}

export async function deleteHistoryItemLocal(id: string): Promise<void> {
  try {
    const db = await openIndexedDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not delete from IndexedDB:', err);
  }
}

// Full sync with server
export async function syncHistory(): Promise<HistoryItem[]> {
  let serverItems: HistoryItem[] = [];
  try {
    const res = await fetch('/api/history');
    if (res.ok) {
      const data = await res.json();
      if (data.history && Array.isArray(data.history)) {
        serverItems = data.history;
      }
    }
  } catch (e) {
    console.warn('Error fetching server history:', e);
  }

  const localItems = await getHistoryItemsLocal();

  // Combine and deduplicate by id
  const map = new Map<string, HistoryItem>();
  localItems.forEach((item) => map.set(item.id, item));
  serverItems.forEach((item) => map.set(item.id, item));

  const merged = Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return merged;
}

export async function persistHistoryItem(item: HistoryItem): Promise<void> {
  // Save local first for zero latency
  await saveHistoryItemLocal(item);

  // Send to server
  try {
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch (err) {
    console.warn('Error saving to server database:', err);
  }
}

export async function removeHistoryItem(id: string): Promise<void> {
  await deleteHistoryItemLocal(id);
  try {
    await fetch(`/api/history/${id}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Error deleting from server database:', err);
  }
}
