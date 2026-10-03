import { supabase } from '@/lib/supabase';

/** Buckets whose objects live under `<userId>/...` (see storage RLS policies). */
export const USER_STORAGE_BUCKETS = ['event-documents', 'sales-reports'] as const;

const PAGE = 1000;
const MAX_DEPTH = 4;

async function collectPaths(bucket: string, prefix: string, depth: number, out: string[]): Promise<void> {
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: PAGE, offset });
    if (error) throw error;
    for (const entry of data ?? []) {
      const path = `${prefix}/${entry.name}`;
      // Folders come back with a null id.
      if (entry.id === null) {
        if (depth < MAX_DEPTH) await collectPaths(bucket, path, depth + 1, out);
      } else {
        out.push(path);
      }
    }
    if (!data || data.length < PAGE) return;
  }
}

/**
 * Delete every file the user uploaded. Deleting the auth user (the
 * delete_own_account RPC) cascades all table rows but NOT Storage
 * objects, and the app promises account deletion erases everything.
 * Must run BEFORE the RPC — afterwards the user can no longer
 * authenticate to the Storage API.
 */
export async function deleteUserStorage(userId: string): Promise<void> {
  for (const bucket of USER_STORAGE_BUCKETS) {
    const paths: string[] = [];
    await collectPaths(bucket, userId, 1, paths);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (error) throw error;
    }
  }
}
