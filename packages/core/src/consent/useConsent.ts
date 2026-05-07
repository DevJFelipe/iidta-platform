"use client";

import { useEffect, useState, useCallback } from "react";
import type { Level } from "../scoring/types";
import { getDb } from "../storage/db";
import { CURRENT_CONSENT_VERSION } from "./ConsentScreen";

const LS_KEY = "iidta:lastStudentCode";

export type ConsentState =
  | { status: "loading" }
  | { status: "needed"; lastStudentCode?: string }
  | { status: "granted"; studentCode: string; consentVersion: string };

export interface UseConsentApi {
  state: ConsentState;
  grant: (studentCode: string, consentVersion: string) => Promise<void>;
  revoke: () => Promise<void>;
}

/**
 * Lee el último studentCode cacheado en localStorage y verifica si tiene un
 * ConsentRecord vigente en Dexie para el `level` actual y la `consentVersion`
 * actual. Si sí → granted. Si no → needed (con el lastStudentCode prellenado
 * para el form). El usuario puede sobreescribir el código en el form.
 *
 * No persiste PII en localStorage — solo el código institucional anónimo.
 */
export function useConsent(level: Level): UseConsentApi {
  const [state, setState] = useState<ConsentState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cached =
          typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null;
        if (!cached) {
          if (!cancelled) setState({ status: "needed" });
          return;
        }
        const db = getDb();
        const record = await db.consents
          .where("studentCode")
          .equals(cached)
          .and(
            (r) => r.level === level && r.consentVersion === CURRENT_CONSENT_VERSION,
          )
          .reverse()
          .first();
        if (cancelled) return;
        if (record) {
          setState({
            status: "granted",
            studentCode: cached,
            consentVersion: record.consentVersion,
          });
        } else {
          setState({ status: "needed", lastStudentCode: cached });
        }
      } catch {
        if (!cancelled) setState({ status: "needed" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [level]);

  const grant = useCallback(
    async (studentCode: string, consentVersion: string): Promise<void> => {
      await getDb().consents.add({
        studentCode,
        level,
        grantedAt: Date.now(),
        consentVersion,
      });
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LS_KEY, studentCode);
      }
      setState({ status: "granted", studentCode, consentVersion });
    },
    [level],
  );

  const revoke = useCallback(async (): Promise<void> => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LS_KEY);
    }
    setState({ status: "needed" });
  }, []);

  return { state, grant, revoke };
}
