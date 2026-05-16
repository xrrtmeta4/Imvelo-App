/**
 * Offline-First Sync Engine with IndexedDB
 * Provides local storage, sync queue, and conflict resolution for farmers without internet.
 */

const DB_NAME = 'imvelo_offline';
const DB_VERSION = 1;

// Tables we sync offline
const SYNCABLE_TABLES = [
  'farm_activities',
  'ledger_entries',
  'harvests',
  'livestock',
  'farm_inventory',
  'pesticide_schedules',
  'crop_rotations',
] as const;

type SyncableTable = typeof SYNCABLE_TABLES[number];

interface SyncQueueItem {
  id: string;
  table: SyncableTable;
  operation: 'insert' | 'update' | 'delete';
  data: Record<string, any>;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
  conflictResolution?: 'local_wins' | 'server_wins' | 'merged';
}

interface OfflineRecord {
  id: string;
  table: SyncableTable;
  data: Record<string, any>;
  localUpdatedAt: number;
  serverUpdatedAt?: string;
  dirty: boolean;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Store for cached data
      if (!db.objectStoreNames.contains('records')) {
        const recordStore = db.createObjectStore('records', { keyPath: ['table', 'id'] });
        recordStore.createIndex('by_table', 'table', { unique: false });
        recordStore.createIndex('by_dirty', 'dirty', { unique: false });
      }

      // Store for sync queue
      if (!db.objectStoreNames.contains('sync_queue')) {
        const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        queueStore.createIndex('by_status', 'status', { unique: false });
        queueStore.createIndex('by_table', 'table', { unique: false });
        queueStore.createIndex('by_timestamp', 'timestamp', { unique: false });
      }

      // Store for sync metadata (last sync timestamps, etc.)
      if (!db.objectStoreNames.contains('sync_meta')) {
        db.createObjectStore('sync_meta', { keyPath: 'key' });
      }
    };
  });
}

// ===== Record Operations =====

export async function saveRecordLocally(
  table: SyncableTable,
  data: Record<string, any>,
  operation: 'insert' | 'update' | 'delete' = 'update'
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(['records', 'sync_queue'], 'readwrite');

  const recordId = data.id || crypto.randomUUID();
  const now = Date.now();

  // Save to local records
  if (operation !== 'delete') {
    const record: OfflineRecord = {
      id: recordId,
      table,
      data: { ...data, id: recordId },
      localUpdatedAt: now,
      serverUpdatedAt: data.updated_at,
      dirty: true,
    };
    tx.objectStore('records').put(record);
  } else {
    tx.objectStore('records').delete([table, recordId]);
  }

  // Add to sync queue
  const queueItem: SyncQueueItem = {
    id: `${table}_${recordId}_${now}`,
    table,
    operation,
    data: { ...data, id: recordId },
    timestamp: now,
    retries: 0,
    status: 'pending',
  };
  tx.objectStore('sync_queue').put(queueItem);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getLocalRecords(table: SyncableTable): Promise<Record<string, any>[]> {
  const db = await openDb();
  const tx = db.transaction('records', 'readonly');
  const index = tx.objectStore('records').index('by_table');
  const request = index.getAll(table);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      db.close();
      resolve((request.result as OfflineRecord[]).map(r => r.data));
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function cacheServerRecords(
  table: SyncableTable,
  records: Record<string, any>[]
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('records', 'readwrite');
  const store = tx.objectStore('records');

  for (const record of records) {
    // Don't overwrite dirty local records
    const existing = await new Promise<OfflineRecord | undefined>((resolve) => {
      const req = store.get([table, record.id]);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    });

    if (!existing || !existing.dirty) {
      const offlineRecord: OfflineRecord = {
        id: record.id,
        table,
        data: record,
        localUpdatedAt: Date.now(),
        serverUpdatedAt: record.updated_at,
        dirty: false,
      };
      store.put(offlineRecord);
    }
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

// ===== Sync Queue Operations =====

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await openDb();
  const tx = db.transaction('sync_queue', 'readonly');
  const index = tx.objectStore('sync_queue').index('by_status');
  const request = index.getAll('pending');

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

export async function removeSyncItem(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('sync_queue', 'readwrite');
  tx.objectStore('sync_queue').delete(id);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function updateSyncItemStatus(
  id: string,
  status: SyncQueueItem['status'],
  retries?: number
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('sync_queue', 'readwrite');
  const store = tx.objectStore('sync_queue');
  const req = store.get(id);

  req.onsuccess = () => {
    const item = req.result;
    if (item) {
      item.status = status;
      if (retries !== undefined) item.retries = retries;
      store.put(item);
    }
  };

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function markRecordClean(table: SyncableTable, id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('records', 'readwrite');
  const store = tx.objectStore('records');
  const req = store.get([table, id]);

  req.onsuccess = () => {
    const record = req.result;
    if (record) {
      record.dirty = false;
      store.put(record);
    }
  };

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

// ===== Sync Metadata =====

export async function getLastSyncTime(table: SyncableTable): Promise<string | null> {
  const db = await openDb();
  const tx = db.transaction('sync_meta', 'readonly');
  const req = tx.objectStore('sync_meta').get(`last_sync_${table}`);

  return new Promise((resolve) => {
    req.onsuccess = () => {
      db.close();
      resolve(req.result?.value || null);
    };
    req.onerror = () => {
      db.close();
      resolve(null);
    };
  });
}

export async function setLastSyncTime(table: SyncableTable, time: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction('sync_meta', 'readwrite');
  tx.objectStore('sync_meta').put({ key: `last_sync_${table}`, value: time });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getSyncQueueCount(): Promise<number> {
  const db = await openDb();
  const tx = db.transaction('sync_queue', 'readonly');
  const req = tx.objectStore('sync_queue').index('by_status').count('pending');

  return new Promise((resolve) => {
    req.onsuccess = () => {
      db.close();
      resolve(req.result);
    };
    req.onerror = () => {
      db.close();
      resolve(0);
    };
  });
}

export { SYNCABLE_TABLES };
export type { SyncableTable, SyncQueueItem, OfflineRecord };
