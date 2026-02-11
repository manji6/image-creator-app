import { DB_NAME, DB_VERSION, DEFAULT_SETTINGS, SETTINGS_KEY } from './constants.js';
import { deepMerge } from './utils.js';

let dbPromise;

function openDb() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cards')) {
        db.createObjectStore('cards', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function runTransaction(storeNames, mode, task) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    const stores = storeNames.map((name) => tx.objectStore(name));

    task(stores);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function getSettingsRow() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['settings'], 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get(SETTINGS_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function loadSettings() {
  const row = await getSettingsRow();
  if (!row?.value) {
    return structuredClone(DEFAULT_SETTINGS);
  }
  return deepMerge(DEFAULT_SETTINGS, row.value);
}

export async function saveSettings(nextSettings) {
  const merged = deepMerge(DEFAULT_SETTINGS, nextSettings);
  await runTransaction(['settings'], 'readwrite', ([store]) => {
    store.put({
      id: SETTINGS_KEY,
      value: merged,
      updatedAt: new Date().toISOString()
    });
  });
  return merged;
}

export async function loadCards() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['cards'], 'readonly');
    const store = tx.objectStore('cards');
    const request = store.getAll();
    request.onsuccess = () => {
      const cards = Array.isArray(request.result) ? request.result : [];
      cards.sort((a, b) => {
        const aTime = Date.parse(a.updatedAt || 0);
        const bTime = Date.parse(b.updatedAt || 0);
        return bTime - aTime;
      });
      resolve(cards);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function upsertCard(card) {
  await runTransaction(['cards'], 'readwrite', ([store]) => {
    store.put({
      ...card,
      updatedAt: new Date().toISOString()
    });
  });
}

export async function upsertCards(cards) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return;
  }

  await runTransaction(['cards'], 'readwrite', ([store]) => {
    for (const card of cards) {
      store.put({
        ...card,
        updatedAt: new Date().toISOString()
      });
    }
  });
}

export async function deleteCard(id) {
  await runTransaction(['cards'], 'readwrite', ([store]) => {
    store.delete(id);
  });
}

export async function clearCards() {
  await runTransaction(['cards'], 'readwrite', ([store]) => {
    store.clear();
  });
}
