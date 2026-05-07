"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ChallengeComponentProps,
  ChallengeRawResult,
  LikertScore,
  TelemetryEvent,
} from "@iidta/core/scoring";
import { LIKERT_LABELS } from "@iidta/core/scoring";
import { TelemetryClient } from "@iidta/core/telemetry";
import { enqueueResult } from "@iidta/core/storage";
import { PhaserMount } from "@iidta/core/engine";
import { ASSETS } from "./assets";
import { META, PRACTICE_LEVEL_TITLES, type PracticeLevel } from "./config";
import type { DetectiveRuntime } from "./scene";

type Phase =
  | "intro"
  | "diagnostic"
  | "result"
  | "feedback"
  | "persisting"
  | "practice-menu"
  | "practice-running"
  | "practice-result"
  | "done";

interface PracticeSummary {
  level: PracticeLevel;
  hits: number;
  errors: number;
  meanRTms: number;
}

const loadDetectiveScenes = async (): Promise<unknown[]> => {
  const { DetectiveOrtograficoScene } = await import("./scene");
  return [DetectiveOrtograficoScene];
};

export function DetectiveOrtograficoComponent(
  props: ChallengeComponentProps,
): JSX.Element | null {
  const { manifest, studentCode, sessionId, onComplete, onTelemetry } = props;

  const [phase, setPhase] = useState<Phase>("intro");
  const [diagRaw, setDiagRaw] = useState<ChallengeRawResult | null>(null);
  const [diagLikert, setDiagLikert] = useState<LikertScore | null>(null);
  const [activePracticeLevel, setActivePracticeLevel] = useState<PracticeLevel | null>(null);
  const [practiceSummary, setPracticeSummary] = useState<PracticeSummary | null>(null);
  const [completedLevels, setCompletedLevels] = useState<Set<PracticeLevel>>(new Set());

  const telemetry = useMemo(
    () => new TelemetryClient({ endpoint: "/api/telemetry", maxBatchSize: 30 }),
    [],
  );

  useEffect(() => {
    telemetry.start();
    return () => {
      telemetry.stop();
      telemetry.flush().catch(() => {});
    };
  }, [telemetry]);

  const handleTelemetry = useCallback(
    (event: TelemetryEvent) => {
      telemetry.emit(event);
      onTelemetry?.(event);
    },
    [telemetry, onTelemetry],
  );

  const handleDiagComplete = useCallback(
    (raw: ChallengeRawResult) => {
      const likert = manifest.rubric(raw);
      setDiagRaw(raw);
      setDiagLikert(likert);
      setPhase("result");
    },
    [manifest],
  );

  const handlePracticeFinished = useCallback(
    (summary: { hits: number; errors: number; meanRTms: number }) => {
      if (activePracticeLevel == null) return;
      setPracticeSummary({ level: activePracticeLevel, ...summary });
      setCompletedLevels((prev) => new Set([...prev, activePracticeLevel]));
      setPhase("practice-result");
    },
    [activePracticeLevel],
  );

  const diagnosticInitData = useMemo<DetectiveRuntime>(
    () => ({
      challengeId: manifest.id,
      studentCode,
      sessionId,
      diagnosticMode: true,
      diagnosticDurationSec: manifest.diagnosticDuration,
      onComplete: handleDiagComplete,
      onTelemetry: handleTelemetry,
      mode: "diagnostic",
    }),
    [
      manifest.id,
      manifest.diagnosticDuration,
      studentCode,
      sessionId,
      handleDiagComplete,
      handleTelemetry,
    ],
  );

  const practiceInitData = useMemo<DetectiveRuntime | null>(() => {
    if (activePracticeLevel == null) return null;
    return {
      challengeId: manifest.id,
      studentCode,
      sessionId,
      diagnosticMode: false,
      diagnosticDurationSec: 0,
      onComplete: () => {},
      onTelemetry: handleTelemetry,
      mode: "practice",
      practiceLevel: activePracticeLevel,
      onPracticeFinished: handlePracticeFinished,
    };
  }, [
    activePracticeLevel,
    manifest.id,
    studentCode,
    sessionId,
    handleTelemetry,
    handlePracticeFinished,
  ]);

  const handleFeedbackSubmit = async (fb: {
    difficulty: 1 | 2 | 3 | 4 | 5;
    enjoyment: 1 | 2 | 3 | 4 | 5;
  }) => {
    if (!diagRaw || diagLikert == null) return;
    setPhase("persisting");
    const finalRaw: ChallengeRawResult = { ...diagRaw, studentFeedback: fb };
    try {
      await enqueueResult({
        challengeId: manifest.id,
        studentCode,
        sessionId,
        rawResult: finalRaw,
        likertScore: diagLikert,
        computedAt: Date.now(),
        attemptCount: 1,
      });
    } catch (e) {
      console.warn("[detective-ortografico] enqueueResult failed (continuando)", e);
    }
    fetch("/api/challenge/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: finalRaw, likertScore: diagLikert }),
    }).catch((e) => console.warn("[detective-ortografico] POST result failed", e));
    onComplete(finalRaw);
    telemetry.flush().catch(() => {});
    setPhase("practice-menu");
  };

  const startPractice = (level: PracticeLevel) => {
    setActivePracticeLevel(level);
    setPhase("practice-running");
  };

  // ---------------- Render ----------------

  if (phase === "intro") {
    return <IntroScreen onStart={() => setPhase("diagnostic")} />;
  }

  if (phase === "diagnostic") {
    return (
      <ChallengeShell title={META.title}>
        <PhaserMount
          loadScenes={loadDetectiveScenes}
          sceneInitData={diagnosticInitData}
          backgroundColor="#0F172A"
        />
      </ChallengeShell>
    );
  }

  if (phase === "result" && diagRaw && diagLikert != null) {
    return (
      <ResultScreen raw={diagRaw} likert={diagLikert} onContinue={() => setPhase("feedback")} />
    );
  }

  if (phase === "feedback") {
    return <FeedbackScreen onSubmit={handleFeedbackSubmit} />;
  }

  if (phase === "persisting") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-[#0F172A] p-12 text-center text-cyan-200/70">
        Guardando registro…
      </main>
    );
  }

  if (phase === "practice-menu") {
    return (
      <PracticeMenu
        onSelect={startPractice}
        onDone={() => setPhase("done")}
        completedLevels={completedLevels}
      />
    );
  }

  if (phase === "practice-running" && practiceInitData) {
    return (
      <ChallengeShell title={`${META.title} · ${PRACTICE_LEVEL_TITLES[activePracticeLevel!]}`}>
        <PhaserMount
          loadScenes={loadDetectiveScenes}
          sceneInitData={practiceInitData}
          backgroundColor="#0F172A"
        />
      </ChallengeShell>
    );
  }

  if (phase === "practice-result" && practiceSummary) {
    return (
      <PracticeResultScreen
        summary={practiceSummary}
        onContinue={() => {
          setActivePracticeLevel(null);
          setPracticeSummary(null);
          setPhase("practice-menu");
        }}
      />
    );
  }

  if (phase === "done") {
    return <DoneScreen />;
  }

  return null;
}

// ============================================================================
// Subcomponentes — Estación Orbital del Aprendizaje (azul espacial + cian + magenta)
// ============================================================================

function ChallengeShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <main className="min-h-screen bg-[#0F172A] p-4 font-inter text-slate-100 sm:p-8">
      <header className="mx-auto mb-4 max-w-4xl">
        <p className="font-orbitron text-xs uppercase tracking-[0.2em] text-cyan-400">
          Estación Orbital del Aprendizaje
        </p>
        <h1 className="font-orbitron text-xl font-bold text-slate-100">{title}</h1>
      </header>
      <section className="mx-auto max-w-4xl">{children}</section>
    </main>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 bg-[#0F172A] p-6 text-center font-inter text-slate-100">
      <img
        src={ASSETS.mascot}
        alt="AURA"
        className="h-32 w-32 drop-shadow-[0_0_24px_rgba(6,182,212,0.4)]"
      />
      <h1 className="font-orbitron text-4xl font-bold text-cyan-300">{META.title}</h1>
      <p className="text-base text-slate-300">
        Soy <strong className="text-cyan-300">AURA</strong>, asistente universal de rastreo
        alfabético. Necesitamos tu ojo entrenado.
      </p>
      <div className="rounded-lg border border-cyan-400/30 bg-slate-800/50 p-6 text-left shadow-[0_0_30px_rgba(6,182,212,0.15)]">
        <p className="mb-3 font-orbitron text-sm uppercase tracking-wider text-cyan-300">
          Protocolo de misión:
        </p>
        <ul className="space-y-2 text-sm text-slate-300">
          <li>
            <span className="text-cyan-300">▸</span> Vas a ver palabras una a una. Algunas tienen
            errores ortográficos (b/v, h muda, s/c/z).
          </li>
          <li>
            <span className="text-cyan-300">▸</span> Arrastra cada palabra al panel{" "}
            <strong className="text-cyan-300">CORRECTA</strong> o{" "}
            <strong className="text-fuchsia-400">ERROR</strong>.
          </li>
          <li>
            <span className="text-cyan-300">▸</span> Dura 3 minutos. Velocidad importa, pero la
            precisión más.
          </li>
        </ul>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="rounded-md border border-cyan-400 bg-cyan-500/20 px-8 py-3 font-orbitron text-base font-bold uppercase tracking-wider text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition hover:bg-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-300"
      >
        Iniciar misión
      </button>
    </main>
  );
}

type CatBreakdown = { hits: number; total: number };
type PerCategoryMeta = {
  bv?: CatBreakdown;
  h?: CatBreakdown;
  consonantes?: CatBreakdown;
};

function ResultScreen({
  raw,
  likert,
  onContinue,
}: {
  raw: ChallengeRawResult;
  likert: LikertScore;
  onContinue: () => void;
}): JSX.Element {
  const meanRT =
    raw.responseTimes.length > 0
      ? Math.round(raw.responseTimes.reduce((a, b) => a + b, 0) / raw.responseTimes.length)
      : 0;
  const meta = raw.metadata as
    | {
        totalWords?: number;
        errors?: number;
        omissions?: number;
        perCategory?: PerCategoryMeta;
      }
    | undefined;
  const perCat = meta?.perCategory;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-5 bg-[#0F172A] p-6 font-inter text-slate-100">
      <img src={ASSETS.mascot} alt="AURA" className="h-24 w-24" />
      <h1 className="font-orbitron text-2xl font-bold text-cyan-300">Misión completada</h1>
      <p className="text-sm text-slate-400">Reporte de la sesión:</p>

      <div className="grid w-full grid-cols-2 gap-4">
        <Stat label="Aciertos" value={raw.hits} accent="cyan" />
        <Stat label="Errores" value={meta?.errors ?? 0} accent="magenta" />
        <Stat label="Omisiones" value={meta?.omissions ?? 0} accent="amber" />
        <Stat label="Tiempo medio (ms)" value={meanRT} accent="cyan" />
      </div>

      {perCat ? (
        <div className="w-full rounded-lg border border-cyan-400/20 bg-slate-800/40 p-4">
          <p className="mb-3 text-center font-orbitron text-xs uppercase tracking-wider text-slate-400">
            Aciertos por regla
          </p>
          <div className="grid grid-cols-3 gap-3">
            <CategoryStat label="b/v" data={perCat.bv} />
            <CategoryStat label="h muda" data={perCat.h} />
            <CategoryStat label="consonantes" data={perCat.consonantes} />
          </div>
        </div>
      ) : null}

      <div className="mt-2 rounded-lg border border-cyan-400/30 bg-slate-800/60 p-4 text-center shadow-[0_0_20px_rgba(6,182,212,0.2)]">
        <p className="font-orbitron text-xs uppercase tracking-wider text-slate-400">
          Indicador (provisional)
        </p>
        <p className="mt-1 font-orbitron text-3xl font-bold text-cyan-300">
          {LIKERT_LABELS[likert]}
        </p>
        <p className="mt-1 text-xs text-slate-500">Likert {likert}/3</p>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-2 rounded-md border border-cyan-400 bg-cyan-500/20 px-6 py-2 font-orbitron text-sm font-bold uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/40"
      >
        Continuar
      </button>
    </main>
  );
}

function CategoryStat({
  label,
  data,
}: {
  label: string;
  data?: CatBreakdown;
}): JSX.Element {
  const hits = data?.hits ?? 0;
  const total = data?.total ?? 0;
  return (
    <div className="rounded-md border border-slate-700 bg-slate-900/50 p-3 text-center">
      <p className="font-orbitron text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-orbitron text-lg font-bold text-cyan-300">
        {hits}
        <span className="text-slate-500">/{total}</span>
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "cyan" | "magenta" | "amber";
}): JSX.Element {
  const accentClass =
    accent === "cyan"
      ? "border-cyan-400/30 text-cyan-300"
      : accent === "magenta"
        ? "border-fuchsia-400/30 text-fuchsia-300"
        : "border-amber-400/30 text-amber-300";
  return (
    <div className={`rounded-md border bg-slate-800/40 p-3 text-center ${accentClass}`}>
      <p className="font-orbitron text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 font-orbitron text-2xl font-bold">{value}</p>
    </div>
  );
}

function FeedbackScreen({
  onSubmit,
}: {
  onSubmit: (fb: { difficulty: 1 | 2 | 3 | 4 | 5; enjoyment: 1 | 2 | 3 | 4 | 5 }) => void;
}): JSX.Element {
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [enjoyment, setEnjoyment] = useState<1 | 2 | 3 | 4 | 5>(3);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 bg-[#0F172A] p-6 font-inter text-slate-100">
      <h2 className="font-orbitron text-xl font-bold text-cyan-300">Dos preguntas más:</h2>

      <Likert5Picker
        label="¿Qué tan difícil fue?"
        leftLabel="Muy fácil"
        rightLabel="Muy difícil"
        value={difficulty}
        onChange={setDifficulty}
      />
      <Likert5Picker
        label="¿Qué tan interesante te pareció?"
        leftLabel="Aburrido"
        rightLabel="Muy interesante"
        value={enjoyment}
        onChange={setEnjoyment}
      />

      <button
        type="button"
        onClick={() => onSubmit({ difficulty, enjoyment })}
        className="mt-2 rounded-md border border-cyan-400 bg-cyan-500/20 px-6 py-3 font-orbitron text-base font-bold uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/40"
      >
        Enviar
      </button>
    </main>
  );
}

function Likert5Picker({
  label,
  leftLabel,
  rightLabel,
  value,
  onChange,
}: {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
}): JSX.Element {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-200">{label}</p>
      <div className="flex justify-between gap-2">
        {([1, 2, 3, 4, 5] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex-1 rounded-md border px-3 py-3 font-orbitron text-base font-bold ${
              value === v
                ? "border-cyan-400 bg-cyan-500/30 text-cyan-100"
                : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-cyan-500"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

function PracticeMenu({
  onSelect,
  onDone,
  completedLevels,
}: {
  onSelect: (level: PracticeLevel) => void;
  onDone: () => void;
  completedLevels: Set<PracticeLevel>;
}): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 bg-[#0F172A] p-6 font-inter text-slate-100">
      <img src={ASSETS.mascot} alt="AURA" className="mx-auto h-24 w-24" />
      <h2 className="text-center font-orbitron text-xl font-bold text-cyan-300">
        Misiones de práctica
      </h2>
      <p className="text-center text-sm text-slate-400">
        Estas misiones son para entrenar reglas específicas y NO afectan tu indicador.
      </p>

      <div className="grid grid-cols-1 gap-2">
        {([1, 2, 3, 4, 5] as const).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onSelect(level)}
            className={`flex items-center justify-between rounded-md border px-4 py-3 text-left ${
              completedLevels.has(level)
                ? "border-emerald-400/40 bg-emerald-500/10"
                : "border-slate-700 bg-slate-800/40"
            } hover:border-cyan-400`}
          >
            <span className="text-sm font-medium text-slate-200">
              {PRACTICE_LEVEL_TITLES[level]}
            </span>
            <span className="font-orbitron text-xs text-slate-500">
              {completedLevels.has(level) ? "✓" : "▸"}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onDone}
        className="mt-2 rounded-md border border-slate-700 bg-slate-800/30 px-4 py-2 font-orbitron text-sm font-bold uppercase tracking-wider text-slate-400 hover:bg-slate-800/60"
      >
        Salir
      </button>
    </main>
  );
}

function PracticeResultScreen({
  summary,
  onContinue,
}: {
  summary: PracticeSummary;
  onContinue: () => void;
}): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-[#0F172A] p-6 font-inter text-slate-100">
      <img src={ASSETS.mascot} alt="AURA" className="h-20 w-20" />
      <h2 className="font-orbitron text-xl font-bold text-emerald-400">Misión completada</h2>
      <p className="text-sm text-slate-400">{PRACTICE_LEVEL_TITLES[summary.level]}</p>
      <div className="grid w-full grid-cols-2 gap-3">
        <Stat label="Aciertos" value={summary.hits} accent="cyan" />
        <Stat label="Errores" value={summary.errors} accent="magenta" />
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="mt-2 rounded-md border border-cyan-400 bg-cyan-500/20 px-6 py-2 font-orbitron text-sm font-bold uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/40"
      >
        Volver al menú
      </button>
    </main>
  );
}

function DoneScreen(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-[#0F172A] p-6 text-center font-inter text-slate-100">
      <img src={ASSETS.mascot} alt="AURA" className="h-32 w-32" />
      <h1 className="font-orbitron text-2xl font-bold text-cyan-300">Sesión cerrada</h1>
      <p className="text-base text-slate-300">
        AURA registró tu desempeño. Puedes cerrar esta pestaña.
      </p>
    </main>
  );
}
