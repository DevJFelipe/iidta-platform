# Semáforo de impulsos

> **P-TD-01-semaforo-de-impulsos** · TDAH · primaria · ítem **C5** del IIDTA-P

## Mapeo al instrumento

- **Ítem:** C5 — "Tiene dificultad para inhibir respuestas impulsivas o esperar su turno"
- **Dimensión:** TDAH (sub-dominio: control inhibitorio)
- **Fuente:** tabla "Los 90 retos por nivel" en `CLAUDE.md`, IIDTA-P (Primaria, 6-11 años)

## Mecánica

El estudiante asiste al **Mono Mensajero**, que entrega cartas en la **Torre del Enfoque**. Un semáforo se enciende intermitente: cuando aparece la **luz verde** debe tocarla rápido (entregar la carta); cuando aparece la **luz roja** debe **NO tocar** (esperar). El reto es un paradigma Go/No-Go con ratio 70:30 (verde:rojo) que induce tendencia a responder y mide la capacidad de inhibir impulsos ante el estímulo NoGo.

> **Restricción CLAUDE.md §"Restricciones críticas" #4:** la UI durante el reto es deliberadamente **sobria** — ni distractores visuales decorativos ni animaciones secundarias. La dificultad sube por velocidad y ratio Go/NoGo, no por sobrecarga visual.

## Identidad visual

- **Torre:** Torre del Enfoque (paleta coral + blanco hueso `#FAF7F2`)
- **Mascota:** Mono Mensajero (`sprites_animal-pack_PNG_Round (outline)_monkey`)
- **Tipografía:** Fredoka (títulos), Nunito (cuerpo, base 18 px)

## Fase diagnóstica (única que produce Likert)

| Parámetro | Valor |
|---|---|
| Duración total | 180 s |
| Total de estímulos | 60 |
| Go (verde) | 42 (70%) |
| NoGo (rojo) | 18 (30%) |
| Ciclo (ISI + estímulo) | 3 000 ms |
| Duración del estímulo | 1 200 ms |

**Idéntica para todos los estudiantes.** Es la única fase comparable; los niveles de práctica NO afectan el puntaje.

## Niveles de práctica (motivacionales — NO afectan el score)

| Nivel | Foco | Estímulos | Ratio Go | Ciclo | Estímulo |
|---|---|---|---|---|---|
| 1 | Calentamiento | 16 | 60% | 3 000 ms | 1 500 ms |
| 2 | Más rápido | 20 | 70% | 2 200 ms | 1 100 ms |
| 3 | Resistir el rojo | 20 | 80% | 2 000 ms | 900 ms |
| 4 | Reflejos | 24 | 70% | 1 500 ms | 800 ms |
| 5 | Desafío final (composite) | 24 | 70–80% | 1 300–2 000 ms | 700–900 ms |

## Métricas registradas (telemetría)

- `hits` — toque correcto sobre verde
- `commissions` — toque incorrecto sobre rojo (falsa alarma — la métrica clínica más relevante para TDAH)
- `omissions` — sin toque ante un verde
- `responseTimes[]` — ms desde encendido del verde hasta el toque
- `studentFeedback` — `{ difficulty: 1-5, enjoyment: 1-5 }` al final del diagnóstico
- Eventos `user_response` con `type: "hit" | "commission" | "omission"`

## Rúbrica → Likert 0–3

- **Fórmula:** `balanced accuracy = (hitRate + (1 - commissionRate)) / 2` (rango [0, 1])
- `commissionRate` (impulsividad) pesa **igual** que `hitRate` (atención sostenida): para TDAH la métrica clínica más relevante es la inhibición de impulsos, capturada por `commissions`
- **Norma provisional C5:** `mean = 0.78, stdDev = 0.14, source: "provisional"`
- **Mapeo z-score → Likert:** ver `packages/core/src/scoring/likertMap.ts`

Implementada en [`rubric.ts`](./rubric.ts) — función `rubricSemaforoImpulsos(raw)`.

**TODO post-piloto:** evaluar migración a *d-prime* o ajustar pesos según consenso clínico con investigadoras UDES.

## Compliance (Ley 1581/2012)

- No persiste nombres ni apellidos — solo `studentCode` anónimo
- Fase diagnóstica idéntica para todos (control de equidad)
- Datos sensibles (Art. 5): los puntajes pueden inferir condiciones de aprendizaje, requieren consentimiento explícito (gestionado por `ConsentScreen` antes de iniciar el reto)
- Consentimiento del acudiente: firmado en papel/e-firma fuera de la app por la institución educativa

## Estructura de archivos

- [`manifest.ts`](./manifest.ts) — registro `ChallengeManifest`
- [`Component.tsx`](./Component.tsx) — flujo `intro → diagnostic → result → feedback → practice-menu → done`
- [`scene.ts`](./scene.ts) — Phaser `BaseScene` con semáforo (luces dibujadas con shapes) + hit zone clickeable
- [`config.ts`](./config.ts) — `META`, `DIAGNOSTIC`, `PRACTICE_LEVELS`, `PALETTE`
- [`rubric.ts`](./rubric.ts) — `rubricSemaforoImpulsos` + `SemaforoImpulsosMeta`
- [`assets.ts`](./assets.ts) — paths a `/assets/primaria/...` (mascota + sonidos Kenney CC0). El semáforo es Phaser shapes nativas, sin sprite externo

## Notas de pilotaje

- Confirmar la norma `mean=0.78 std=0.14` con datos reales de los 50 estudiantes piloto USCO/UDES
- El paradigma actual NO cuenta como commission tocar fuera del estímulo (durante ISI). En SART (Sustained Attention to Response Task) sí se cuenta. Discutir con investigadoras si añadir esta variante en post-piloto
- La mascota CLAUDE.md sugería "colibrí" pero no existe en `animal-pack`. Se usa `monkey` (Mono Mensajero), encaja temáticamente con autocontrol
