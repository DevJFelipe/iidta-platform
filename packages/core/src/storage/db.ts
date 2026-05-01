import Dexie, { type Table } from "dexie";
import type { ChallengeRawResult, LikertScore, Level } from "../scoring/types";

export interface PendingResult {
  id?: number;
  challengeId: string;
  studentCode: string;
  sessionId: string;
  rawResult: ChallengeRawResult;
  likertScore: LikertScore;
  computedAt: number;
  syncedAt: number;
  attemptCount: number;
}

export interface ConsentRecord {
  id?: number;
  studentCode: string;
  level: Level;
  grantedAt: number;
  consentVersion: string;
  guardianRef?: string;
}

export interface ProgressRecord {
  id?: number;
  studentCode: string;
  challengeId: string;
  bestLikertScore: LikertScore;
  attempts: number;
  lastPlayedAt: number;
}

export class IIDTADatabase extends Dexie {
  pendingResults!: Table<PendingResult, number>;
  consents!: Table<ConsentRecord, number>;
  progress!: Table<ProgressRecord, number>;

  constructor(name = "iidta-db") {
    super(name);
    this.version(1).stores({
      pendingResults: "++id, challengeId, studentCode, syncedAt",
      consents: "++id, studentCode, grantedAt",
      progress: "++id, &[studentCode+challengeId], lastPlayedAt",
    });
  }
}

let _db: IIDTADatabase | null = null;

export function getDb(): IIDTADatabase {
  if (typeof window === "undefined") {
    throw new Error("IIDTADatabase only available in the browser");
  }
  if (!_db) _db = new IIDTADatabase();
  return _db;
}
