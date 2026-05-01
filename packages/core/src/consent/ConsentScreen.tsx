"use client";

// TODO PROMPT 3+: validar texto legal con UDES/USCO antes del piloto.
// Referencias: Ley 1581 de 2012 (Habeas Data Colombia), Decreto 1377 de 2013,
// Art. 5 (datos sensibles), tratamiento de menores requiere consentimiento del
// acudiente — gestionado fuera de la app por la institución educativa.

import { useId, useState, type FormEvent } from "react";
import type { Level } from "../scoring/types";

export const CURRENT_CONSENT_VERSION = "0.1.0-draft";

export interface ConsentScreenProps {
  level: Level;
  onGrant: (studentCode: string, consentVersion: string) => void;
  onDecline?: () => void;
  consentVersion?: string;
}

interface LevelCopy {
  greeting: string;
  intro: string;
  bullets: readonly string[];
  codeLabel: string;
  codePlaceholder: string;
  buttonAccept: string;
  buttonDecline: string;
}

const COPY: Record<Level, LevelCopy> = {
  primaria: {
    greeting: "¡Hola!",
    intro: "Vas a jugar unos retos. Antes de empezar es importante que sepas tres cosas:",
    bullets: [
      "Vamos a guardar cómo juegas: aciertos, errores y cuánto te demoras. Eso ayuda a tu profe a apoyarte mejor.",
      "NO guardamos tu nombre ni tu apellido. Solo el código que te dio tu profe.",
      "Tu mamá, papá o quien te cuida ya dijo que sí. Si no quieres jugar, avísale a tu profe.",
    ],
    codeLabel: "Código que te dio tu profe",
    codePlaceholder: "ej. P-001",
    buttonAccept: "Sí, quiero jugar",
    buttonDecline: "Mejor no",
  },
  secundaria: {
    greeting: "Antes de empezar",
    intro:
      "Vas a participar en un instrumento de detección educativa. Necesitamos tu acuerdo (asentimiento) para continuar:",
    bullets: [
      "Registramos tu desempeño en cada reto: aciertos, errores y tiempos de respuesta. NO se registran nombres ni apellidos.",
      "Solo se guarda el código institucional anónimo asignado por tu colegio.",
      "Tu acudiente ya firmó el consentimiento. Si no deseas continuar, infórmaselo al docente responsable.",
      "Tus datos no se comparten con terceros y se usan únicamente para el estudio.",
    ],
    codeLabel: "Código institucional",
    codePlaceholder: "ej. S-2026-001",
    buttonAccept: "Acepto y comenzar",
    buttonDecline: "Salir",
  },
  media: {
    greeting: "Aviso de privacidad y asentimiento",
    intro:
      "Esta plataforma forma parte de un instrumento de investigación educativa de USCO/UDES en cumplimiento de la Ley 1581 de 2012 (Habeas Data) y del Decreto 1377 de 2013.",
    bullets: [
      "Datos tratados: desempeño en los retos (aciertos, errores, tiempos de respuesta, intentos) y respuestas auto-reportadas. NO se recolectan nombres, apellidos ni identificadores directos.",
      "Tipo de datos: dado que los puntajes pueden inferir condiciones de aprendizaje, se consideran datos sensibles (Art. 5). Su tratamiento requiere autorización explícita.",
      "Finalidad: detección temprana, apoyo educativo y validación del instrumento. No se usan con fines comerciales ni se comparten con terceros.",
      "Acudiente: el consentimiento informado del acudiente fue firmado previamente y reposa en la institución educativa.",
      "Tus derechos: conocer, actualizar, rectificar y suprimir tus datos en cualquier momento (Art. 8). Para ejercerlos, contacta al referente institucional.",
    ],
    codeLabel: "Código institucional anónimo",
    codePlaceholder: "ej. M-2026-001",
    buttonAccept: "He leído y otorgo mi asentimiento",
    buttonDecline: "No deseo continuar",
  },
};

export function ConsentScreen({
  level,
  onGrant,
  onDecline,
  consentVersion = CURRENT_CONSENT_VERSION,
}: ConsentScreenProps): JSX.Element {
  const copy = COPY[level];
  const codeId = useId();
  const [studentCode, setStudentCode] = useState("");
  const [touched, setTouched] = useState(false);

  const codeIsValid = studentCode.trim().length >= 3;

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setTouched(true);
    if (!codeIsValid) return;
    onGrant(studentCode.trim(), consentVersion);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold text-neutral-900">{copy.greeting}</h1>
      <p className="mt-3 text-base text-neutral-700">{copy.intro}</p>

      <ul className="mt-4 space-y-2 text-sm text-neutral-700">
        {copy.bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="text-neutral-400">
              •
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <label htmlFor={codeId} className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-800">{copy.codeLabel}</span>
          <input
            id={codeId}
            type="text"
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={copy.codePlaceholder}
            autoComplete="off"
            inputMode="text"
            className="rounded-md border border-neutral-300 px-3 py-2 text-base focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          {touched && !codeIsValid ? (
            <span className="text-xs text-red-600">
              Ingresa el código institucional (mínimo 3 caracteres).
            </span>
          ) : null}
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            type="submit"
            disabled={!codeIsValid}
            className="flex-1 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {copy.buttonAccept}
          </button>
          {onDecline ? (
            <button
              type="button"
              onClick={onDecline}
              className="rounded-md border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {copy.buttonDecline}
            </button>
          ) : null}
        </div>
      </form>

      <p className="mt-6 text-xs text-neutral-500">Versión del consentimiento: {consentVersion}</p>
    </main>
  );
}
