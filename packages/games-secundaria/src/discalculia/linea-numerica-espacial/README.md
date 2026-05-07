# Línea numérica espacial

> **S-DC-01-linea-numerica-espacial** · discalculia · secundaria · ítems **C1 + C3** del II-TABAS

## Mapeo al instrumento

- **Ítems:** C1 (representación espacial de magnitudes) + C3 (conceptualización del valor posicional)
- **Dimensión:** discalculia (sub-dominio: sentido numérico espacial)
- **Fuente:** tabla "Los 90 retos por nivel" en `CLAUDE.md`, II-TABAS (Secundaria, 11-15 años)
- **Paradigma clínico:** Number Line Estimation (NLE) — Siegler & Booth (2004), uno de los predictores más robustos de discalculia

## Mecánica

El estudiante asiste a **ZARA** (Zona de Análisis y Rastreo Aritmético), una IA orbital que necesita coordenadas espaciales precisas. Aparece un número objetivo (ej. 47) y una línea horizontal con extremos rotulados (ej. 0 y 100). El estudiante arrastra un marcador a la posición que cree correcta sobre la línea. El **primer juicio espacial cuenta** — no hay botón de confirmar; soltar el marcador dispara la evaluación inmediata. Mide el sentido numérico espacial: la capacidad de mapear cantidades simbólicas a posiciones físicas.

## Identidad visual

- **Estación:** Estación Orbital del Aprendizaje (paleta azul espacial `#0F172A` + cian `#06B6D4` + magenta `#D946EF`)
- **Mascota:** ZARA — astronauta isométrico variante B (`sprites_space-kit_Isometric_astronautB_S`), distinta de AURA (variante A, detective ortográfico)
- **Tipografía:** Orbitron (títulos, terminales sci-fi), Inter (cuerpo, base 16 px)

## Fase diagnóstica (única que produce Likert)

| Parámetro | Valor |
|---|---|
| Duración total | 180 s |
| Total de trials | 12 |
| Rango | [0, 100] |
| Decimales | 0 (enteros) |
| Tolerancia (hit) | ±7 % del rango (≈ ±7 unidades) |
| Timeout por trial | 15 000 ms |
| Targets pre-secuenciados | 7, 14, 23, 38, 47, 53, 61, 72, 83, 89, 95, 99 |

**Idéntica para todos los estudiantes.** Targets distribuidos por deciles para evitar concentración. La pre-secuencia (no random) garantiza comparabilidad.

## Niveles de práctica (motivacionales — NO afectan el score)

| Nivel | Foco | Rango | Decimales | Ticks visibles | Tolerancia | Trials | Timeout |
|---|---|---|---|---|---|---|---|
| 1 | Calibración asistida | [0, 20] | 0 | 5, 10, 15 | 10 % | 6 | 18 000 ms |
| 2 | Rango estándar | [0, 100] | 0 | — | 7 % | 8 | 15 000 ms |
| 3 | Escala mil | [0, 1000] | 0 | — | 7 % | 8 | 15 000 ms |
| 4 | Decimales | [0, 1] | 1 | — | 7 % | 8 | 15 000 ms |
| 5 | Protocolo final (composite) | mixto | mixto | — | 7 % | 12 | 14 000 ms |

## Métricas registradas (telemetría)

- `hits` — error ≤ tolerancia (PRECISO)
- `near` — error en (tolerancia, 2× tolerancia] (CERCA, no cuenta como hit pero se reporta)
- `commissions` — error > 2× tolerancia (LEJOS)
- `omissions` — timeout sin soltar
- `responseTimes[]` — ms desde presentación hasta drop
- Eventos `user_response` con `{ target, placed, errorAbs, errorPct, kind: "hit"|"near"|"far" }`
- `metadata.meanErrorPct` y `metadata.medianErrorPct` — error promedio/mediana en fracción del rango (cualitativo, NO afecta el Likert)
- `metadata.kinds: { hits, near, far }` — conteo agregado por bin

## Rúbrica → Likert 0–3

- **Fórmula:** `accuracy = hits / totalTrials` (rango [0, 1])
- **Norma provisional C1:** `mean = 0.70, stdDev = 0.18, source: "provisional"`
- **Mapeo z-score → Likert:** ver `packages/core/src/scoring/likertMap.ts`

Implementada en [`rubric.ts`](./rubric.ts) — función `rubricLineaNumericaEspacial(raw)`.

**Decisión de diseño**: el score Likert usa `accuracy` (consistente con el resto del demo set), no `meanErrorPct`. El error promedio se reporta en `metadata` para análisis cualitativo de las investigadoras. Post-piloto se evaluará si conviene migrar a un score más sensible.

## Compliance (Ley 1581/2012)

- No persiste nombres ni apellidos — solo `studentCode` anónimo
- Fase diagnóstica idéntica para todos (control de equidad)
- Datos sensibles (Art. 5): los puntajes pueden inferir condiciones de aprendizaje, requieren consentimiento explícito (gestionado por `ConsentScreen` antes de iniciar el reto)
- Consentimiento del acudiente: firmado en papel/e-firma fuera de la app por la institución educativa

## Estructura de archivos

- [`manifest.ts`](./manifest.ts) — registro `ChallengeManifest`
- [`Component.tsx`](./Component.tsx) — flujo `intro → diagnostic → result → feedback → practice-menu → done`
- [`scene.ts`](./scene.ts) — Phaser `BaseScene` con drag-drop sobre línea numérica (Rectangle interactivo + Triangle visual + clamp X al track)
- [`config.ts`](./config.ts) — `META`, `DIAGNOSTIC`, `PRACTICE_LEVELS`, `RangeConfig`, `PALETTE`
- [`rubric.ts`](./rubric.ts) — `rubricLineaNumericaEspacial` + `LineaNumericaMeta` + `KindBreakdown`
- [`assets.ts`](./assets.ts) — paths a `/assets/secundaria/...` (mascota astronautB + sonidos sci-fi-sounds Kenney CC0)

## Notas de pilotaje

- Confirmar la norma `mean=0.70 std=0.18` con datos reales de 50 estudiantes piloto USCO/UDES
- Considerar si `near` (error 7-14 %) debería contar como hit parcial (0.5 hit) en una rúbrica refinada — útil para discriminar perfiles de "tiene la idea" vs "no calibra"
- Post-piloto evaluar si el score Likert debe migrar a `meanErrorPct` (más sensible) o mantener `accuracy` (más interpretable)
- El paradigma NLE es robusto pero el rendimiento depende del rango: rangos exponenciales (logarítmicos) detectan mejor en estudiantes pequeños y rangos lineales en mayores. La práctica L3 ([0,1000]) prueba esa transición
