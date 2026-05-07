import { getDb, type PendingResult } from "./db";

const SYNC_TAG = "iidta-sync-results";

export async function enqueueResult(
  result: Omit<PendingResult, "id" | "syncedAt">,
): Promise<number> {
  const db = getDb();
  const id = await db.pendingResults.add({ ...result, syncedAt: 0 });
  // Background Sync es best-effort y NO bloqueante. `navigator.serviceWorker.ready`
  // queda pending forever si no hay SW registrado (modo dev sin PWA). Por eso
  // no awaitamos: el flush manual cubre el caso si el SW nunca llega.
  void registerBackgroundSync().catch(() => {});
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
  // navigator.serviceWorker.ready queda pending forever si no hay SW registrado.
  // Race con timeout de 1s para liberar la promise en modo dev sin PWA.
  const reg = await Promise.race<ServiceWorkerRegistration | null>([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), 1000)),
  ]);
  if (!reg) return;
  const swReg = reg as ServiceWorkerRegistration & {
    sync?: { register: (tag: string) => Promise<void> };
  };
  if (swReg.sync) {
    await swReg.sync.register(SYNC_TAG);
  }
}
