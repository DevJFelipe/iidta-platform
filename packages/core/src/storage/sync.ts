import { getDb, type PendingResult } from "./db";

const SYNC_TAG = "iidta-sync-results";

export async function enqueueResult(
  result: Omit<PendingResult, "id" | "syncedAt">,
): Promise<number> {
  const db = getDb();
  const id = await db.pendingResults.add({ ...result, syncedAt: 0 });
  // Fire-and-forget: el registro de Background Sync no debe bloquear el
  // flujo del usuario. `.catch()` no atrapa un promise que nunca resuelve,
  // por eso no usamos `await` — en dev sin PWA, `serviceWorker.ready` queda
  // pendiente indefinidamente y dejaba la UI colgada en "Guardando…".
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
  // En dev sin PWA, `serviceWorker.ready` no resuelve nunca. Salir temprano
  // si no hay un SW registrado para evitar el cuelgue.
  const existing = await navigator.serviceWorker.getRegistration();
  if (!existing) return;
  const reg = await navigator.serviceWorker.ready;
  const swReg = reg as ServiceWorkerRegistration & {
    sync?: { register: (tag: string) => Promise<void> };
  };
  if (swReg.sync) {
    await swReg.sync.register(SYNC_TAG);
  }
}
