import { getDb, type PendingResult } from "./db";

const SYNC_TAG = "iidta-sync-results";

export async function enqueueResult(
  result: Omit<PendingResult, "id" | "syncedAt">,
): Promise<number> {
  const db = getDb();
  const id = await db.pendingResults.add({ ...result, syncedAt: 0 });
  await registerBackgroundSync().catch(() => {
    // Background Sync no soportado — el flush manual cubre el caso
  });
  return id as number;
}

export async function getUnsyncedResults(limit = 50): Promise<PendingResult[]> {
  const db = getDb();
  return db.pendingResults.where("syncedAt").equals(0).limit(limit).toArray();
}

export async function markSynced(ids: number[]): Promise<void> {
  const db = getDb();
  const now = Date.now();
  await db.pendingResults.where("id").anyOf(ids).modify({ syncedAt: now });
}

export async function registerBackgroundSync(): Promise<void> {
  if (typeof navigator === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const swReg = reg as ServiceWorkerRegistration & {
    sync?: { register: (tag: string) => Promise<void> };
  };
  if (swReg.sync) {
    await swReg.sync.register(SYNC_TAG);
  }
}
