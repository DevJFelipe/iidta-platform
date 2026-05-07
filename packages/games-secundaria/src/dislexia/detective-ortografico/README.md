# Detective ortográfico

> **S-DI-01-detective-ortografico** · dislexia · secundaria · ítem **D5** del II-TABAS

## Mapeo al instrumento

- **Ítem:** D5 — "Tiene dificultades para reconocer y aplicar reglas ortográficas en la escritura"
- **Dimensión:** dislexia (sub-dominio: ortografía / decodificación lexical)
- **Fuente:** tabla "Los 90 retos por nivel" en `CLAUDE.md`, II-TABAS (Secundaria, 11-15 años)

## Mecánica

El estudiante asiste a **AURA** (Asistente Universal de Rastreo Alfabético), una IA orbital que rastrea palabras corruptas en transmisiones interestelares. Aparece una palabra en pantalla; el estudiante debe arrastrarla al panel **CORRECTA** (cian) o **ERROR** (magenta) según si está bien escrita o tiene un error ortográfico común. Cubre tres reglas: **b/v**, **h muda**, **s/c/z**.

## Identidad visual

- **Estación:** Estación Orbital del Aprendizaje (paleta azul espacial `#0F172A` + cian `#06B6D4` + magenta `#D946EF` + ámbar `#FACC15`)
- **Mascota:** AURA — astronauta isométrico (`sprites_space-kit_Isometric_astronautA_S`)
- **Tipografía:** Orbitron (títulos, terminales sci-fi), Inter (cuerpo, base 16 px)

## Fase diagnóstica (única que produce Likert)

| Parámetro | Valor |
|---|---|
| Duración total | 180 s |
| Total de palabras | 12 |
| Correctas | 6 (50 %) |
| Incorrectas | 6 (50 %) |
| Timeout por palabra | 13 000 ms |
| Categorías | b/v, h muda, consonantes |
| Banco de pares | 18 (6 por categoría) |

**Idéntica para todos los estudiantes.** Es la única fase comparable; los niveles de práctica NO afectan el puntaje.

## Niveles de práctica (motivacionales — NO afectan el score)

| Nivel | Foco | Palabras | Categorías | Timeout |
|---|---|---|---|---|
| 1 | Operación b/v | 8 | b/v | 15 000 ms |
| 2 | La h muda | 8 | h muda | 14 000 ms |
| 3 | Decodificar consonantes | 8 | consonantes | 14 000 ms |
| 4 | Frecuencia mixta | 10 | todas | 11 000 ms |
| 5 | Protocolo final (composite) | 12 | todas (3 mini-rondas) | 9 000–10 000 ms |

## Métricas registradas (telemetría)

- `hits` — clasificación correcta (palabra correcta → "Correcta", o palabra incorrecta → "Error")
- `commissions` — clasificación incorrecta (cualquier error de juicio)
- `omissions` — timeout sin arrastrar
- `responseTimes[]` — ms desde presentación hasta drop (o timeout)
- `studentFeedback` — `{ difficulty: 1-5, enjoyment: 1-5 }` al final del diagnóstico
- Eventos `user_response` con `type: "hit" | "miss" | "omission"` y `category: "bv" | "h" | "consonantes"`
- `metadata.perCategory: { bv: {hits, total}, h: {hits, total}, consonantes: {hits, total} }` — desempeño por regla, mostrado cualitativamente en `ResultScreen` (NO afecta el score Likert global, solo informa el perfil)

## Rúbrica → Likert 0–3

- **Fórmula:** `accuracy = hits / totalWords` (rango [0, 1])
- **Norma provisional D5:** `mean = 0.75, stdDev = 0.18, source: "provisional"`
- **Mapeo z-score → Likert:** ver `packages/core/src/scoring/likertMap.ts`

Implementada en [`rubric.ts`](./rubric.ts) — función `rubricDetectiveOrtografico(raw)`.

**Análisis por categoría**: el campo `metadata.perCategory` ya entrega el desempeño separado por regla. La rúbrica del Likert sigue siendo `accuracy` global (no se rompe la psicometría); el breakdown por regla informa cualitativamente a las investigadoras qué reglas domina cada estudiante. Post-piloto se evaluará si conviene migrar el Likert a un esquema ponderado por regla.

## Compliance (Ley 1581/2012)

- No persiste nombres ni apellidos — solo `studentCode` anónimo
- Fase diagnóstica idéntica para todos (control de equidad)
- Datos sensibles (Art. 5): los puntajes pueden inferir condiciones de aprendizaje, requieren consentimiento explícito (gestionado por `ConsentScreen` antes de iniciar el reto)
- Consentimiento del acudiente: firmado en papel/e-firma fuera de la app por la institución educativa

## Estructura de archivos

- [`manifest.ts`](./manifest.ts) — registro `ChallengeManifest`
- [`Component.tsx`](./Component.tsx) — flujo `intro → diagnostic → result → feedback → practice-menu → done`
- [`scene.ts`](./scene.ts) — Phaser `BaseScene` con drag-drop (palabra arrastrable + 2 drop zones)
- [`config.ts`](./config.ts) — `META`, `DIAGNOSTIC`, `PRACTICE_LEVELS`, `WORD_BANK`, `PALETTE`
- [`rubric.ts`](./rubric.ts) — `rubricDetectiveOrtografico` + `DetectiveOrtograficoMeta`
- [`assets.ts`](./assets.ts) — paths a `/assets/secundaria/...` (mascota space-kit + sonidos sci-fi-sounds Kenney CC0)

## Notas de pilotaje

- Confirmar la norma `mean=0.75 std=0.18` con datos reales de 50 estudiantes piloto USCO/UDES
- El banco de 18 pares es ampliable. Si las investigadoras prefieren palabras del léxico colombiano específico (regionalismos), actualizar `WORD_BANK` en `config.ts`
- La categoría `consonantes` agrupa s/c/z + c/k + g/j (consonantes confusas). Cada item conserva su `rule` específico (`"c ante e/i"`, `"c/k"`, `"g/j"`, etc.) para análisis fino. Discutir con investigadoras si separar en categorías propias post-piloto
