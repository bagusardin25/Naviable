export interface DraftPhotoData {
  image: string;
  mimeType: string;
  savedAt?: string;
}

const DB_NAME = 'naviable_draft_store';
const DB_VERSION = 1;
const STORE_NAME = 'draft_photos';

function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && Boolean(window.indexedDB);
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      reject(new Error('IndexedDB is not supported or not available in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Saves a draft photo to IndexedDB associated with the specific draftKey.
 */
export async function saveDraftPhoto(draftKey: string, photo: { image: string; mimeType: string }): Promise<void> {
  if (!draftKey || !photo?.image || !isIndexedDBSupported()) return;

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const record = {
        key: draftKey,
        image: photo.image,
        mimeType: photo.mimeType,
        savedAt: new Date().toISOString(),
      };

      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to save photo to IndexedDB'));
    });
  } catch (error) {
    // Non-fatal: storage quota or private browsing mode may block IndexedDB
    console.warn('[draftStorage] Unable to save draft photo to IndexedDB:', error);
  }
}

/**
 * Retrieves a draft photo from IndexedDB for the given draftKey.
 */
export async function getDraftPhoto(draftKey: string): Promise<DraftPhotoData | null> {
  if (!draftKey || !isIndexedDBSupported()) return null;

  try {
    const db = await openDatabase();
    return await new Promise<DraftPhotoData | null>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(draftKey);

      request.onsuccess = () => {
        const result = request.result;
        if (result && typeof result.image === 'string' && typeof result.mimeType === 'string') {
          resolve({
            image: result.image,
            mimeType: result.mimeType,
            savedAt: result.savedAt,
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error || new Error('Failed to retrieve photo from IndexedDB'));
    });
  } catch (error) {
    console.warn('[draftStorage] Unable to retrieve draft photo from IndexedDB:', error);
    return null;
  }
}

/**
 * Deletes a draft photo from IndexedDB when a draft is discarded or published.
 */
export async function deleteDraftPhoto(draftKey: string): Promise<void> {
  if (!draftKey || !isIndexedDBSupported()) return;

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(draftKey);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to delete photo from IndexedDB'));
    });
  } catch (error) {
    console.warn('[draftStorage] Unable to delete draft photo from IndexedDB:', error);
  }
}
