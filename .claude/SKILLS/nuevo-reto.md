---
description: Crea un nuevo reto siguiendo el patrón Challenge Manifest del proyecto IIDTA
---

Voy a crear un nuevo reto siguiendo el patrón establecido en CLAUDE.md.

**Argumentos esperados:**

- Nivel: primaria | secundaria | media
- Dimensión: dislexia | discalculia | tdah
- Nombre del reto (kebab-case)
- Ítem del instrumento al que mapea (ej. A1, B3, C5)

**Pasos que voy a ejecutar:**

1. **Leer CLAUDE.md** para confirmar la identidad visual del nivel y restricciones del proyecto.

2. **Crear la estructura de archivos** en `packages/games-{nivel}/src/{dimension}/{nombre-reto}/`:
   - `manifest.ts` — exporta `ChallengeManifest` con id, level, dimension, itemCode, rubric, Component
   - `Component.tsx` — wrapper React que monta la scene Phaser o el flujo narrativo
   - `scene.ts` — solo si es reto arcade/drag-drop; clase que extiende `BaseScene`
   - `config.ts` — parámetros de la fase diagnóstica (idénticos para todos) y los 5 niveles de práctica
   - `rubric.ts` — función `(metrics) => 0|1|2|3` con z-score contra norma piloto provisional
   - `assets.ts` — manifest de assets a precargar
   - `README.md` — documentación del reto: qué mide, paradigma científico, métricas registradas

3. **Registrar el reto** en `packages/games-{nivel}/src/index.ts` para que el routing dinámico lo encuentre.

4. **Implementar las dos fases obligatorias:**
   - **Fase 1 (DIAGNÓSTICA):** 180 segundos, parámetros idénticos a todos los estudiantes, produce el puntaje Likert. NO niveles aquí.
   - **Fase 2 (PRÁCTICA):** niveles 1-5 (primaria), 1-7 (secundaria) o 3 actos × 3 escenas (media). Dificultad escalable. NO afecta el puntaje Likert.

5. **Telemetría completa:** cada acción del estudiante emite `TelemetryEvent` que va a la cola Dexie y luego al endpoint `/api/telemetry`.

6. **Pantalla de resultado:** mostrar Likert resultante, métricas crudas, feedback (¿fácil/difícil? ¿gustó?).

7. **Verificar:**
   - `pnpm typecheck` pasa
   - `pnpm lint` pasa
   - `pnpm dev` y navegar a `/reto/{nivel}/{nombre-reto}` carga sin errores

**Restricciones críticas (de CLAUDE.md):**

- Si es reto TDAH: UI dentro del juego debe ser limpia y de baja distracción (literatura: gráficos llamativos perjudican desempeño en TDAH).
- Si es reto narrativo (típicamente media): usar React puro + Framer Motion, NO Phaser.
- Nunca almacenar nombre del estudiante. Solo código institucional.
- Máximo 2 intentos por reto (P-21).
- TypeScript estricto. Cero `any` sin justificar.

**Antes de empezar:**

- Confirma conmigo el nombre exacto del reto y el ítem que mapea.
- Propón la mecánica específica antes de codificar.
- Lista los archivos que vas a crear.

Cuando confirme, empieza.
