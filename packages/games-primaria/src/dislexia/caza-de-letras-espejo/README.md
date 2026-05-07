# Caza de letras espejo

> **P-DI-01-caza-de-letras-espejo** · dislexia · primaria · ítem **A1** del IIDTA-P

## Mapeo al instrumento

- **Ítem:** A1 — "Confunde letras que son similares en su forma o que son espejos (b/d, p/q)"
- **Dimensión:** dislexia (sub-dominio: discriminación visual de grafemas)
- **Fuente:** tabla "Los 90 retos por nivel" en `CLAUDE.md`, IIDTA-P (Primaria, 6-11 años)

## Mecánica

El estudiante visita la **Torre de las Letras** acompañado por **El Loro Sabio**. Aparecen letras una a una en pantalla durante 3 minutos. Debe **tocar SOLO cuando vea la letra B**. Las letras d, p y q son distractores espejo: se parecen visualmente pero no son la objetivo. El reto es un paradigma Go/No-Go clásico que mide la capacidad de discriminar grafemas similares bajo presión temporal.

## Identidad visual

- **Torre:** Torre de las Letras (paleta índigo + blanco hueso `#FAF7F2`)
- **Mascota:** El Loro Sabio (`sprites_animal-pack_PNG_Round (outline)_parrot`)
- **Tipografía:** Fredoka (títulos), Nunito (cuerpo, base 18 px)

## Fase diagnóstica (única que produce Likert)

| Parámetro | Valor |
|---|---|
| Duración total | 180 s |
| Total de estímulos | 60 |
| Targets (letra B) | 42 (70%) |
| Distractores (d, p, q) | 18 (30%) |
| Intervalo entre estímulos | 3 000 ms |
| Tamaño de letra | 220 px |
| Letra objetivo | `b` |

**Idéntica para todos los estudiantes.** Es la única fase comparable; los niveles de práctica NO afectan el puntaje.

## Niveles de práctica (motivacionales — NO afectan el score)

| Nivel | Foco | Estímulos | Distractores | Intervalo |
|---|---|---|---|---|
| 1 | Calentamiento | 20 | 2 (d, p) | 2 500 ms |
| 2 | Letras volteadas (rotación 90°) | 20 | 4 (d, p, q + rot) | 2 000 ms |
| 3 | Buscando en palabras | 10 palabras | — | 4 500 ms |
| 4 | Velocidad | 20 | 3 | 500 ms |
| 5 | Desafío final (composite) | 25 | 4 (mezcla letras + palabras) | 800–1 500 ms |

## Métricas registradas (telemetría)

- `hits` — toque correcto sobre la letra B
- `commissions` — toque incorrecto sobre distractor (d, p, q) — falsa alarma
- `omissions` — sin toque ante una B (omisión)
- `responseTimes[]` — ms desde presentación del estímulo hasta el toque
- `studentFeedback` — `{ difficulty: 1-5, enjoyment: 1-5 }` al final del diagnóstico
- Eventos `user_response` con `type: "hit" | "commission" | "omission" | "word-hit" | "word-commission"`

## Rúbrica → Likert 0–3

- **Fórmula:** `balanced accuracy = (hitRate + (1 - commissionRate)) / 2` (rango [0, 1])
- **Norma provisional A1:** `mean = 0.75, stdDev = 0.15, source: "provisional"`
- **Mapeo z-score → Likert:** ver `packages/core/src/scoring/likertMap.ts`

Implementada en [`rubric.ts`](./rubric.ts) — función `rubricCazaDeLetrasEspejo(raw)`.

**TODO post-piloto:** evaluar migración a *d-prime* (`z(hitRate) - z(falseAlarmRate)`), métrica clínica clásica para tareas Go/No-Go.

## Compliance (Ley 1581/2012)

- No persiste nombres ni apellidos — solo `studentCode` anónimo
- Fase diagnóstica idéntica para todos (control de equidad)
- Datos sensibles (Art. 5): los puntajes pueden inferir condiciones de aprendizaje, requieren consentimiento explícito (gestionado por `ConsentScreen` antes de iniciar el reto)
- Consentimiento del acudiente: firmado en papel/e-firma fuera de la app por la institución educativa

## Estructura de archivos

- [`manifest.ts`](./manifest.ts) — registro `ChallengeManifest`
- [`Component.tsx`](./Component.tsx) — flujo `intro → diagnostic → result → feedback → practice-menu → done`
- [`scene.ts`](./scene.ts) — Phaser `BaseScene` con presentación de letras + words
- [`config.ts`](./config.ts) — `META`, `DIAGNOSTIC`, `PRACTICE_LEVELS`, `TARGET_LETTER`, `DISTRACTOR_LETTERS`, `PALETTE`
- [`rubric.ts`](./rubric.ts) — `rubricCazaDeLetrasEspejo` + `CazaDeLetrasEspejoMeta`
- [`assets.ts`](./assets.ts) — paths a `/assets/primaria/...` (mascota + sonidos Kenney CC0)

## Notas de pilotaje

- Confirmar la norma `mean=0.75 std=0.15` con datos reales de los 50 estudiantes piloto USCO/UDES
- En el nivel 3 (palabras) el target ES la letra dentro de la palabra. Discutir con investigadoras si el conteo `hit/commission` debe estar separado del de letras aisladas
- Migrar a *d-prime* post-piloto requiere normas con N suficiente para correcciones de Hautus (loglinear) en estudiantes con 0 falsas alarmas
