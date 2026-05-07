# Mercado matemático

> **P-DC-01-mercado-matematico** · discalculia · primaria · ítem **B4** del IIDTA-P

## Mapeo al instrumento

- **Ítem:** B4 — "Tiene dificultades para resolver problemas matemáticos sencillos en situaciones cotidianas"
- **Dimensión:** discalculia (sub-dominio: cálculo aplicado a la vida diaria)
- **Fuente:** tabla "Los 90 retos por nivel" en `CLAUDE.md`, IIDTA-P (Primaria, 6-11 años)

## Mecánica

El estudiante visita el **Mercado del Bosque** atendido por **Coni Conejo**. Aparece un producto con su precio (ej: manzana $3, pan $5, queso $9). Debe arrastrar monedas de denominaciones $1, $2 y $5 al carrito hasta sumar el precio exacto, y luego presionar **Pagar**. El reto evalúa la capacidad de combinar valores monetarios y resolver problemas aritméticos de la vida cotidiana sin asistencia.

## Identidad visual

- **Torre:** Torre de los Números (paleta esmeralda + blanco hueso `#FAF7F2`)
- **Mascota:** Coni Conejo (`sprites_animal-pack_PNG_Round (outline)_rabbit`)
- **Tipografía:** Fredoka (títulos), Nunito (cuerpo, base 18 px)

## Fase diagnóstica (única que produce Likert)

| Parámetro | Valor |
|---|---|
| Duración total | 180 s |
| Total de problemas | 6 |
| Timeout por problema | 28 s |
| Monedas disponibles | $1, $2, $5 |
| Rango de precios | $3 – $10 |
| Productos del banco | 10 (huevo $1 → chocolate $10) |

**Idéntica para todos los estudiantes.** Es la única fase comparable; los niveles de práctica NO afectan el puntaje.

## Niveles de práctica (motivacionales — NO afectan el score)

| Nivel | Foco | Problemas | Rango precios | Monedas | Timeout |
|---|---|---|---|---|---|
| 1 | Calentamiento | 5 | $1–$5 | $1, $2 | 30 s |
| 2 | Combinando monedas | 5 | $3–$8 | $1, $2, $5 | 30 s |
| 3 | Más rápido | 5 | $5–$10 | $1, $2, $5 | 25 s |
| 4 | Compras grandes | 6 | $6–$10 | $1, $2, $5 | 22 s |
| 5 | Desafío final (composite) | 6 | $4–$12 | $1, $2, $5 | 20–22 s |

## Métricas registradas (telemetría)

- `hits` — pago correcto (suma exacta = precio)
- `commissions` — pago incorrecto (suma `>` o `<` precio)
- `omissions` — timeout sin pagar
- `responseTimes[]` — ms desde presentación del producto hasta tap en Pagar
- `studentFeedback` — `{ difficulty: 1-5, enjoyment: 1-5 }` al final del diagnóstico
- Eventos `user_response` con `type: "hit" | "over" | "under" | "omission"`

## Rúbrica → Likert 0–3

- **Fórmula:** `accuracy = hits / totalProblems` (rango [0, 1])
- **Norma provisional B4:** `mean = 0.70, stdDev = 0.20, source: "provisional"`
- **Mapeo z-score → Likert:** ver `packages/core/src/scoring/likertMap.ts`

Implementada en [`rubric.ts`](./rubric.ts) — función `rubricMercadoMatematico(raw)`.

## Compliance (Ley 1581/2012)

- No persiste nombres ni apellidos — solo `studentCode` anónimo
- Fase diagnóstica idéntica para todos (control de equidad)
- Datos sensibles (Art. 5): los puntajes pueden inferir condiciones de aprendizaje, requieren consentimiento explícito (gestionado por `ConsentScreen` antes de iniciar el reto)
- Consentimiento del acudiente: firmado en papel/e-firma fuera de la app por la institución educativa

## Estructura de archivos

- [`manifest.ts`](./manifest.ts) — registro `ChallengeManifest`
- [`Component.tsx`](./Component.tsx) — flujo `intro → diagnostic → result → feedback → practice-menu → done`
- [`scene.ts`](./scene.ts) — Phaser `BaseScene` con drag-drop (monedas + carrito + botón Pagar)
- [`config.ts`](./config.ts) — `META`, `DIAGNOSTIC`, `PRACTICE_LEVELS`, `PRODUCTS_BANK`, `PALETTE`
- [`rubric.ts`](./rubric.ts) — `rubricMercadoMatematico` + `MercadoMatematicoMeta`
- [`assets.ts`](./assets.ts) — paths a `/assets/primaria/...` (mascota + sonidos Kenney CC0)

## Notas de pilotaje

- Confirmar la norma `mean=0.70 std=0.20` con datos reales de los 50 estudiantes piloto USCO/UDES
- Considerar separar `omissions` (timeout) de `commissions` (suma incorrecta) en la rúbrica post-piloto — pueden indicar perfiles cognitivos distintos (lentitud vs error aritmético)
- Banco de productos: 10 emojis. Si las investigadoras prefieren productos contextualmente colombianos (arepa, tinto), actualizar `PRODUCTS_BANK` en `config.ts`
