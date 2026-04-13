import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  getPendingSyncItems,
  removeSyncItem,
  updateSyncItemStatus,
  markRecordClean,
  cacheServerRecords,
  setLastSyncTime,
  getLastSyncTime,
  getSyncQueueCount,
  SYNCABLE_TABLES,
  type SyncableTable,
  type SyncQueueItem,
} from '@/lib/offlineDb';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  syncNow: () => Promise<void>;
  conflicts: SyncQueueItem[];
  resolveConflict: (itemId: string, resolution: 'local_wins' | 'server_wins') => Promise<void>;
}

const SyncContext = createContext<SyncState>({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  syncNow: async () => {},
  conflicts: [],
  resolveConflict: async () => {},
});

// Conflict resolution: last-write-wins with timestamp comparison
async function resolveConflictForItem(
  item: SyncQueueItem,
  resolution: 'local_wins' | 'server_wins'
): Promise<boolean> {
  if (resolution === 'server_wins') {
    // Discard local change, re-fetch server version
    const { data } = await supabase
      .from(item.table)
      .select('*')
      .eq('id', item.data.id)
      .single();

    if (data) {
      await cacheServerRecords(item.table as SyncableTable, [data]);
    }
    await removeSyncItem(item.id);
    return true;
  }

  // local_wins: force push local data
  return await pushItemToServer(item, true);
}

async function pushItemToServer(item: SyncQueueItem, force = false): Promise<boolean> {
  const { table, operation, data } = item;

  // Remove fields that shouldn't be sent
  const cleanData = { ...data };
  delete cleanData.localUpdatedAt;
  delete cleanData.serverUpdatedAt;

  try {
    if (operation === 'insert') {
      const { error } = await supabase.from(table).insert(cleanData);
      if (error) {
        // Check for conflict (duplicate key)
        if (error.code === '23505' && !force) {
          return false; // conflict
        }
        // If forcing, try upsert
        if (force) {
          const { error: upsertErr } = await supabase.from(table).upsert(cleanData);
          if (upsertErr) throw upsertErr;
        } else {
          throw error;
        }
      }
    } else if (operation === 'update') {
      if (!force) {
        // Check server version timestamp for conflicts
        const { data: serverRecord } = await supabase
          .from(table)
          .select('updated_at')
          .eq('id', data.id)
          .single();

        if (serverRecord?.updated_at && data.updated_at) {
          const serverTime = new Date(serverRecord.updated_at).getTime();
          const localTime = new Date(data.updated_at).getTime();
          if (serverTime > localTime) {
            return false; // conflict - server is newer
          }
        }
      }

      const { id, ...updateData } = cleanData;
      const { error } = await supabase.from(table).update(updateData).eq('id', id);
      if (error) throw error;
    } else if (operation === 'delete') {
      const { error } = await supabase.from(table).delete().eq('id', data.id);
      if (error) throw error;
    }

    await markRecordClean(table as SyncableTable, data.id);
    await removeSyncItem(item.id);
    return true;
  } catch (err) {
    console.error(`Sync error for ${table}:`, err);
    return false;
  }
}

export const SyncProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAtState] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<SyncQueueItem[]>([]);
  const { user } = useAuth();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online! Syncing data...', { duration: 2000 });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You\'re offline. Changes saved locally.', { duration: 3000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending count periodically
  useEffect(() => {
    const updateCount = async () => {
      const count = await getSyncQueueCount();
      setPendingCount(count);
    };
    updateCount();
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Pull server data for caching
  const pullServerData = useCallback(async () => {
    if (!user) return;

    for (const table of SYNCABLE_TABLES) {
      try {
        const lastSync = await getLastSyncTime(table);
        let query = supabase.from(table).select('*');

        // For user-scoped tables, filter by user
        query = query.eq('user_id', user.id);

        if (lastSync) {
          query = query.gte('updated_at', lastSync);
        }

        const { data, error } = await query.limit(500);
        if (error) continue;
        if (data && data.length > 0) {
          await cacheServerRecords(table, data);
        }

        await setLastSyncTime(table, new Date().toISOString());
      } catch (err) {
        console.error(`Pull error for ${table}:`, err);
      }
    }
  }, [user]);

  // Push local changes to server
  const pushLocalChanges = useCallback(async () => {
    const pendingItems = await getPendingSyncItems();
    const newConflicts: SyncQueueItem[] = [];

    // Sort by timestamp (oldest first)
    pendingItems.sort((a, b) => a.timestamp - b.timestamp);

    // Deduplicate: keep only latest operation per record
    const latestByRecord = new Map<string, SyncQueueItem>();
    for (const item of pendingItems) {
      const key = `${item.table}_${item.data.id}`;
      const existing = latestByRecord.get(key);
      if (!existing || item.timestamp > existing.timestamp) {
        // Remove older duplicate from queue
        if (existing) {
          await removeSyncItem(existing.id);
        }
        latestByRecord.set(key, item);
      } else {
        await removeSyncItem(item.id);
      }
    }

    for (const item of latestByRecord.values()) {
      if (item.retries >= 3) {
        await updateSyncItemStatus(item.id, 'failed', item.retries);
        continue;
      }

      await updateSyncItemStatus(item.id, 'syncing');
      const success = await pushItemToServer(item);

      if (!success) {
        // Mark as conflict
        await updateSyncItemStatus(item.id, 'conflict', item.retries + 1);
        newConflicts.push({ ...item, status: 'conflict' });
      }
    }

    setConflicts(newConflicts);
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline || !user || isSyncing) return;

    setIsSyncing(true);
    try {
      await pushLocalChanges();
      await pullServerData();
      const count = await getSyncQueueCount();
      setPendingCount(count);
      setLastSyncAtState(new Date().toISOString());
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, user, isSyncing, pushLocalChanges, pullServerData]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && user) {
      syncNow();
    }
  }, [isOnline, user]);

  // Periodic sync every 2 minutes when online
  useEffect(() => {
    if (!isOnline || !user) return;
    const interval = setInterval(syncNow, 120_000);
    return () => clearInterval(interval);
  }, [isOnline, user, syncNow]);

  const resolveConflict = useCallback(async (
    itemId: string,
    resolution: 'local_wins' | 'server_wins'
  ) => {
    const item = conflicts.find(c => c.id === itemId);
    if (!item) return;

    await resolveConflictForItem(item, resolution);
    setConflicts(prev => prev.filter(c => c.id !== itemId));
    const count = await getSyncQueueCount();
    setPendingCount(count);
    toast.success('Conflict resolved');
  }, [conflicts]);

  return (
    <SyncContext.Provider value={{
      isOnline,
      isSyncing,
      pendingCount,
      lastSyncAt,
      syncNow,
      conflicts,
      resolveConflict,
    }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useOfflineSync = () => useContext(SyncContext);
