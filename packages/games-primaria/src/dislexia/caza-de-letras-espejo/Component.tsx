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
import type { CazaDeLetrasEspejoRuntime } from "./scene";

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

const loadCazaScenes = async (): Promise<unknown[]> => {
  const { CazaDeLetrasEspejoScene } = await import("./scene");
  return [CazaDeLetrasEspejoScene];
};

export function CazaDeLetrasEspejoComponent(props: ChallengeComponentProps): JSX.Element | null {
  const { manifest, studentCode, sessionId, onComplete, onTelemetry } = props;

  const [phase, setPhase] = useState<Phase>("intro");
  const [diagRaw, setDiagRaw] = useState<ChallengeRawResult | null>(null);
  const [diagLikert, setDiagLikert] = useState<LikertScore | null>(null);
  const [activePracticeLevel, setActivePracticeLevel] = useState<PracticeLevel | null>(null);
  const [practiceSummary, setPracticeSummary] = useState<PracticeSummary | null>(null);

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
      setPhase("practice-result");
    },
    [activePracticeLevel],
  );

  const diagnosticInitData = useMemo<CazaDeLetrasEspejoRuntime>(
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

  const practiceInitData = useMemo<CazaDeLetrasEspejoRuntime | null>(() => {
    if (activePracticeLevel == null) return null;
    return {
      challengeId: manifest.id,
      studentCode,
      sessionId,
      diagnosticMode: false,
      diagnosticDurationSec: 0,
      onComplete: () => {
        // Practice no produce score Likert. No-op.
      },
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
      console.warn("[caza-de-letras] enqueueResult failed (continuando)", e);
    }

    fetch("/api/challenge/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: finalRaw, likertScore: diagLikert }),
    }).catch((e) => console.warn("[caza-de-letras] POST result failed", e));

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
        <PhaserMount loadScenes={loadCazaScenes} sceneInitData={diagnosticInitData} />
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
      <div className="mx-auto max-w-md p-12 text-center text-neutral-600">Guardando tu sesión…</div>
    );
  }

  if (phase === "practice-menu") {
    return (
      <PracticeMenu
        onSelect={startPractice}
        onDone={() => setPhase("done")}
        completedLevels={practiceSummary ? new Set([practiceSummary.level]) : new Set()}
      />
    );
  }

  if (phase === "practice-running" && practiceInitData) {
    return (
      <ChallengeShell title={`${META.title} · ${PRACTICE_LEVEL_TITLES[activePracticeLevel!]}`}>
        <PhaserMount loadScenes={loadCazaScenes} sceneInitData={practiceInitData} />
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
// Subcomponentes inline
// ============================================================================

function ChallengeShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <main className="min-h-screen bg-[#FAF7F2] p-4 sm:p-8">
      <header className="mx-auto mb-4 max-w-4xl">
        <p className="text-xs uppercase tracking-wide text-indigo-600">Torre de las Letras</p>
        <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
      </header>
      <section className="mx-auto max-w-4xl">{children}</section>
    </main>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 bg-[#FAF7F2] p-6 text-center">
      <img src={ASSETS.mascot} alt="El Loro Sabio" className="h-32 w-32" />
      <h1 className="text-3xl font-bold text-indigo-700">{META.title}</h1>
      <p className="text-base text-neutral-700">
        ¡Hola! Soy <strong>El Loro Sabio</strong>. Vamos a hacer un juego rápido.
      </p>
      <div className="rounded-lg bg-white p-6 text-left shadow-sm">
        <p className="mb-3 font-medium text-neutral-800">Reglas:</p>
        <ul className="space-y-2 text-sm text-neutral-700">
          <li>👀 Vas a ver letras aparecer una a una.</li>
          <li>
            👇 Toca <strong>solo cuando veas la letra B</strong>.
          </li>
          <li>
            ⛔ <strong>NO toques</strong> si ves d, p o q. ¡Se parecen pero no son!
          </li>
          <li>⏱️ Dura 3 minutos. Va lento, tómate tu tiempo.</li>
        </ul>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="rounded-md bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        ¡Empezar!
      </button>
    </main>
  );
}

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
  const meta = raw.metadata as { commissions?: number; omissions?: number } | undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-5 bg-[#FAF7F2] p-6">
      <img src={ASSETS.mascot} alt="El Loro Sabio" className="h-24 w-24" />
      <h1 className="text-2xl font-bold text-indigo-700">¡Listo!</h1>
      <p className="text-sm text-neutral-600">Esto es lo que vimos en tu sesión:</p>

      <div className="grid w-full grid-cols-2 gap-4">
        <Stat label="Aciertos" value={raw.hits} />
        <Stat label="Falsas alarmas" value={meta?.commissions ?? 0} />
        <Stat label="Omisiones" value={meta?.omissions ?? 0} />
        <Stat label="Tiempo medio (ms)" value={meanRT} />
      </div>

      <div className="mt-2 rounded-lg bg-white p-4 text-center shadow-sm">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Indicador (provisional)</p>
        <p className="mt-1 text-3xl font-bold text-indigo-700">{LIKERT_LABELS[likert]}</p>
        <p className="mt-1 text-xs text-neutral-500">Likert {likert}/3</p>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-2 rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Continuar
      </button>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="rounded-md bg-white p-3 text-center shadow-sm">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 bg-[#FAF7F2] p-6">
      <h2 className="text-xl font-semibold text-neutral-900">Dos preguntas más:</h2>

      <Likert5Picker
        label="¿Qué tan fácil o difícil fue?"
        leftLabel="Muy fácil"
        rightLabel="Muy difícil"
        value={difficulty}
        onChange={setDifficulty}
      />

      <Likert5Picker
        label="¿Te gustó?"
        leftLabel="Nada"
        rightLabel="Mucho"
        value={enjoyment}
        onChange={setEnjoyment}
      />

      <button
        type="button"
        onClick={() => onSubmit({ difficulty, enjoyment })}
        className="mt-2 rounded-md bg-indigo-600 px-6 py-3 text-base font-semibold text-white hover:bg-indigo-700"
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
      <p className="mb-2 text-sm font-medium text-neutral-800">{label}</p>
      <div className="flex justify-between gap-2">
        {([1, 2, 3, 4, 5] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex-1 rounded-md border px-3 py-3 text-base font-semibold ${
              value === v
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-neutral-300 bg-white text-neutral-700"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-neutral-500">
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 bg-[#FAF7F2] p-6">
      <img src={ASSETS.mascot} alt="El Loro Sabio" className="mx-auto h-24 w-24" />
      <h2 className="text-center text-xl font-bold text-indigo-700">¡Buen trabajo!</h2>
      <p className="text-center text-sm text-neutral-600">
        ¿Querés practicar más? Estos niveles son solo para divertirte y NO afectan tu resultado.
      </p>

      <div className="grid grid-cols-1 gap-2">
        {([1, 2, 3, 4, 5] as const).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onSelect(level)}
            className={`flex items-center justify-between rounded-md border px-4 py-3 text-left ${
              completedLevels.has(level)
                ? "border-emerald-300 bg-emerald-50"
                : "border-neutral-300 bg-white"
            } hover:border-indigo-400`}
          >
            <span className="text-sm font-medium text-neutral-800">
              {PRACTICE_LEVEL_TITLES[level]}
            </span>
            <span className="text-xs text-neutral-500">
              {completedLevels.has(level) ? "✓" : "→"}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onDone}
        className="mt-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
      >
        Terminar
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-[#FAF7F2] p-6">
      <img src={ASSETS.mascot} alt="El Loro Sabio" className="h-20 w-20" />
      <h2 className="text-xl font-bold text-emerald-700">¡Nivel completado!</h2>
      <p className="text-sm text-neutral-600">{PRACTICE_LEVEL_TITLES[summary.level]}</p>
      <div className="grid w-full grid-cols-2 gap-3">
        <Stat label="Aciertos" value={summary.hits} />
        <Stat label="Errores" value={summary.errors} />
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="mt-2 rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Volver al menú
      </button>
    </main>
  );
}

function DoneScreen(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 bg-[#FAF7F2] p-6 text-center">
      <img src={ASSETS.mascot} alt="El Loro Sabio" className="h-32 w-32" />
      <h1 className="text-2xl font-bold text-indigo-700">¡Gracias por jugar!</h1>
      <p className="text-base text-neutral-700">
        El Loro Sabio guardó tu sesión. Podés cerrar esta pestaña.
      </p>
    </main>
  );
}
