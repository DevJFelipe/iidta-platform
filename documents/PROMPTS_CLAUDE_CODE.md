# 🚀 Primer prompt para Claude Code

## Cómo usar este archivo

1. **Asegúrate de que el archivo `CLAUDE.md` esté en la raíz del proyecto.**
2. Abre tu terminal en la carpeta del proyecto y ejecuta `claude`.
3. Copia y pega el bloque de "PROMPT 1" abajo. Espera a que termine.
4. Después continúa con "PROMPT 2", y así sucesivamente.

Cada prompt es una sesión enfocada. Dale tiempo a Claude Code de terminar antes de pasar al siguiente.

---

## PROMPT 1 — Setup del scaffolding monorepo

```
Lee el archivo CLAUDE.md de la raíz completo antes de hacer cualquier cosa.

Tu tarea ahora: crear el scaffolding inicial del proyecto IIDTA.

Antes de codificar, propón:
1. La lista de comandos exactos que vas a ejecutar
2. Los archivos clave que vas a crear
3. Cualquier decisión técnica que requiera mi confirmación

Específicamente necesito:
- Inicializar un monorepo Turborepo con pnpm workspaces
- App Next.js 14 con App Router en apps/web (TypeScript estricto, Tailwind, ESLint)
- Packages vacíos pero con package.json correcto: @iidta/core, @iidta/games-primaria, @iidta/games-secundaria, @iidta/games-media, @iidta/ui, @iidta/eslint-config, @iidta/tsconfig
- Configuración base de TypeScript, ESLint, Prettier compartida
- .gitignore apropiado
- README.md inicial con instrucciones de setup

NO instales todavía: Phaser, Howler, Dexie, Framer Motion, Zustand, etc. Eso viene en el siguiente prompt cuando agreguemos features.

Después de proponer el plan, espera mi "ok" antes de ejecutar.
```

---

## PROMPT 1.5 — Inicializar repo en GitHub (opcional pero recomendado)

```
/init-github
```

Este es un **comando custom** que ya está disponible en `.claude/commands/init-github.md`. Solo escribe `/init-github` en Claude Code y él se encargará.

**Antes de ejecutarlo:**

1. Asegúrate de tener `gh` CLI instalado:
   ```bash
   # macOS
   brew install gh

   # Windows
   winget install --id GitHub.cli

   # Linux (ver https://github.com/cli/cli#installation)
   ```

2. Autentica `gh`:
   ```bash
   gh auth login
   ```
   (Elige GitHub.com → HTTPS → autenticación por navegador)

3. Verifica:
   ```bash
   gh auth status
   ```

Cuando lo corras, Claude Code te preguntará:
- Nombre del repo (sugerencia: `iidta-platform`)
- Si quieres que sea privado (recomendado: **sí**, maneja datos de menores)
- Si va bajo tu cuenta personal o una organización USCO/UDES
- Descripción

Y hará automáticamente:
- Mejora el `.gitignore`
- Crea `LICENSE.md` de uso restringido institucional
- Crea `README.md` profesional con stack, estructura, compliance Habeas Data
- Crea el repo en GitHub vía `gh repo create --push`
- Configura protección de la rama `main` (no permite push directo, requiere PRs)
- Crea las ramas `develop` y `feature/core-engine`
- Configura templates de PR e issues en `.github/`

**Si NO quieres usar GitHub aún** (solo trabajar localmente): salta este prompt y ve directo al PROMPT 2. Puedes correrlo después en cualquier momento.

---

## PROMPT 2 — Integrar dependencias core y crear el motor base

```
Estado: scaffolding monorepo está listo y pnpm dev arranca correctamente.

Tu tarea ahora: integrar las dependencias core y crear el motor base que sostendrá los 90 retos.

Pasos:
1. En apps/web: instalar Phaser 3.80+, Framer Motion, Zustand, Howler, Dexie, Zod, @ducanh2912/next-pwa
2. Adaptar el template oficial Phaser+Next.js (phaserjs/template-nextjs) a la arquitectura App Router. Confirmar que un Phaser scene "Hello World" carga con dynamic({ ssr: false })
3. En packages/core/src crear estos módulos vacíos pero con tipos definidos:
   - engine/BaseScene.ts (clase Phaser que extienden todos los retos arcade)
   - engine/ChallengeRunner.tsx (wrapper React universal)
   - engine/NarrativeRunner.tsx (para retos narrativos React puro)
   - scoring/likertMap.ts (función crudo → 0-3 con z-score)
   - scoring/types.ts (interface ChallengeManifest, LikertRubric, TelemetryEvent)
   - telemetry/events.ts y telemetry/client.ts
   - storage/db.ts (Dexie schema con tablas: pendingResults, consents, progress)
   - storage/sync.ts (cola Background Sync)
   - consent/ConsentScreen.tsx (Habeas Data Ley 1581)
   - ui/ (Hud, Timer, Lives, Feedback)
4. En apps/web crear las route handlers vacías:
   - app/api/telemetry/route.ts
   - app/api/challenge/result/route.ts
   - app/api/session/route.ts
5. Configurar next.config.js con next-pwa habilitado
6. Crear la página app/reto/[level]/[code]/page.tsx que carga dinámicamente el reto por su id

Antes de codificar, confirma el orden de ejecución conmigo.
```

---

## PROMPT 2.5 — Descargar assets visuales y de audio

Antes de empezar el primer reto, conviene tener los assets listos. Esto evita que los retos se queden con SVGs genéricos o emojis como placeholder.

**Paso previo (1 minuto, una sola vez):**

Crea una cuenta gratis en Pixabay (mejora muchísimo la calidad de los assets descargables):

1. Ve a https://pixabay.com/accounts/register/
2. Regístrate con email (gratis, sin tarjeta)
3. Ve a https://pixabay.com/api/docs/ y copia tu API key
4. Guárdala — la usarás en el siguiente paso

**Después en Claude Code:**

```
/descargar-assets
```

Es un **comando custom** que ya está disponible en `.claude/commands/descargar-assets.md`. Te preguntará:
- Para qué nivel descargar (primaria/secundaria/media/todos)
- Tu API key de Pixabay (opcional pero recomendada)
- Modo estricto o permisivo si una descarga falla

Y hará automáticamente:
- Crea `scripts/download-assets.mjs` con manifests por nivel
- Descarga packs de Kenney.nl scrapeando dinámicamente las URLs (no hardcoded — robusto a cambios)
- Descarga audio y imágenes de Pixabay vía API
- Convierte PNG → WebP (50% menos peso)
- Convierte MP3 → OGG/Opus 64kbps (70% menos peso) si tienes ffmpeg instalado
- Genera `assets-manifest.json` por nivel
- Genera `LICENSES.md` documentando cada licencia
- Reporta tamaño total y advierte si hay que mover a CDN externo

**Fuentes que va a usar (todas gratuitas y verificadas):**

| Fuente | Tipo | Licencia |
|---|---|---|
| Kenney.nl | Sprites 2D, UI, audio SFX | CC0 (sin atribución) |
| Pixabay API | Audio + imágenes | Pixabay License (libre) |
| Lucide Icons | Iconos UI vectoriales | ISC |
| Google Fonts | Tipografías | OFL |
| OpenGameArt | Sprites complementarios | CC0/CC-BY |

**Si no tienes ffmpeg:**
- macOS: `brew install ffmpeg`
- Linux: `sudo apt install ffmpeg`
- Windows: `choco install ffmpeg`

No es bloqueante: si no está, los audios quedan en MP3 (más pesados pero funcionales).

**Tiempo estimado del comando:** 5-10 minutos por nivel (depende de tu conexión).

---

## PROMPT 3 — Primer reto end-to-end (Caza de letras espejo)

```
Estado: motor base funcional, ChallengeRunner monta scenes Phaser correctamente.

Tu tarea ahora: implementar el PRIMER reto completo end-to-end. Será "Caza de letras espejo" para primaria (P-DI-01).

Este reto evalúa el ítem A1 del IIDTA-P (confunde letras similares b/d/p/q).

Mecánica:
- Fase 1 (DIAGNÓSTICA, 180s, idéntica para todos):
  - 30 estímulos a razón de 1 por segundo
  - Cada estímulo es una letra (b, d, p, q, m, n) que aparece en el centro
  - El estudiante debe hacer clic SOLO cuando ve la letra "b" (o la que se elija como target)
  - Mide: aciertos en target, omisiones, comisiones (clics en distractores), tiempo de reacción medio
- Fase 2 (PRÁCTICA, 5 niveles progresivos):
  - Nivel 1: target estable, distractores claros (2 distractores)
  - Nivel 2: target rotado, 4 distractores
  - Nivel 3: target en palabras (encuentra la b en "boca")
  - Nivel 4: target con presión de tiempo (500ms por estímulo)
  - Nivel 5: combinación de todo

Estética: Torre de las Letras (índigo #4F46E5, fondo blanco hueso #FAF7F2, mascota búho)

**Assets a usar:**

Si ya corriste `/descargar-assets primaria`, los assets están disponibles en:
- `apps/web/public/assets/primaria/sprites/` (búho, fondos, partículas, UI)
- `apps/web/public/assets/primaria/audio/` (correct, wrong, level-up, success)
- Manifest disponible en `packages/games-primaria/src/assets-manifest.json`

Usa estos assets reales en el reto. Si algún asset específico no existe (ej. una letra animada), genera un SVG inline para complementar, pero **prioriza los assets descargados** sobre SVG genéricos.

Si NO has corrido `/descargar-assets` todavía, **párate aquí** y avisa al usuario. No avances con placeholders.

Implementación:
1. Carpeta: packages/games-primaria/src/dislexia/caza-de-letras-espejo/
2. Archivos: manifest.ts, Component.tsx, scene.ts, config.ts, rubric.ts, assets.ts
3. En `assets.ts`: importar las rutas desde `assets-manifest.json` y exportar las que usa este reto
4. Registrar el manifest en packages/games-primaria/src/index.ts
5. La rúbrica debe convertir crudo → 0-3 según la fórmula z-score de CLAUDE.md
6. Telemetría completa al endpoint POST /api/challenge/result
7. Pantalla de resultado al final con: Likert resultante, métricas, feedback ¿fácil/difícil? ¿gustó?

Antes de codificar:
- Verifica que existen los assets necesarios en /assets/primaria/. Si no, ejecuta /descargar-assets primaria primero.
- Muestra la estructura de archivos que vas a crear
- Confirma la fórmula del puntaje crudo (mi sugerencia: composite = aciertos*0.4 - comisiones*0.3 + (1 - omisiones)*0.3, normalizado a 0-100)
```

---

## PROMPT 4 — Replicar a los 8 retos del demo set

```
Estado: "Caza de letras espejo" funciona end-to-end. La estructura está validada.

Tu tarea ahora: implementar los 8 retos restantes del demo set siguiendo el mismo patrón.

Demo set completo (9 retos = 1 por dimensión × 3 niveles):

PRIMARIA:
- ✅ Caza de letras espejo (dislexia, ya hecho)
- 🔲 Mercado matemático (discalculia, drag-drop)
- 🔲 Semáforo de impulsos (TDAH, Go/No-Go)

SECUNDARIA:
- 🔲 Detective ortográfico (dislexia, drag-drop)
- 🔲 Línea numérica espacial (discalculia, drag-drop)
- 🔲 Cazador de distractores (TDAH, n-back)

MEDIA:
- 🔲 Detector de errores editoriales (dislexia, lectura crítica)
- 🔲 Simulador de presupuesto real (discalculia, simulación)
- 🔲 Sprint de enfoque (TDAH, SART)

Para cada reto:
1. Sigue el patrón Challenge Manifest establecido
2. Aplica la estética del nivel correspondiente (CLAUDE.md sección "Identidad visual")
3. Fase diagnóstica + 5 niveles de práctica (3 actos para retos de media)
4. Rúbrica con z-score
5. Telemetría completa
6. Para retos narrativos (Detector de errores, Simulador de presupuesto): usar React puro + Framer Motion, NO Phaser

Hazlo de a UN reto por iteración. Después de cada uno:
- Compila y verifica que el reto carga
- Pasa lint y typecheck
- Reporta el progreso y espera mi ok antes del siguiente

Empieza por: Semáforo de impulsos (primaria, TDAH).
```

---

## PROMPT 5 — Deploy en Vercel

```
Estado: 9 retos del demo set funcionan localmente.

Tu tarea: preparar el proyecto para deploy en Vercel y desplegarlo.

Pasos:
1. Verificar que pnpm build pasa sin errores
2. Crear archivo vercel.json con configuración de monorepo Turborepo
3. Configurar variables de entorno necesarias en .env.example:
   - DATABASE_URL (Supabase)
   - NEXT_PUBLIC_CDN_URL
   - HABEAS_DATA_VERSION
4. Crear cuenta Supabase (te indico los pasos manuales que tengo que hacer yo)
5. Provisional: usar Vercel Postgres free tier mientras configuro Supabase
6. Conectar repo Git a Vercel (te indico pasos)
7. Verificar que el preview deploy funciona y los 9 retos cargan

Importante:
- NO hagas push a main hasta que yo confirme
- Crea una rama feature/demo-set y haz deploy preview desde ahí
- Genera un README.md de deploy con todos los pasos necesarios

Antes de empezar, lista qué pasos requieren intervención manual mía (crear cuentas, configurar dominios, etc.) vs cuáles puedes hacer tú.
```

---

## 🔁 Después del demo set

Cuando los 9 retos estén deployed y la reunión 3 con investigadoras haya validado el enfoque, los siguientes prompts son para escalar:

- **PROMPT 6:** Completar 30 retos primaria (en lotes de 5)
- **PROMPT 7:** Completar 30 retos secundaria
- **PROMPT 8:** Completar 30 retos media (más esfuerzo narrativo)
- **PROMPT 9:** Dashboard del docente
- **PROMPT 10:** Integración con plataforma USCO/UDES principal vía API

---

## 💡 Tips para trabajar con Claude Code

1. **No le pidas que haga todo de una vez.** Funciona mejor con tareas acotadas (1 reto a la vez, no 9 en paralelo).

2. **Si Claude Code se traba o pierde contexto:** dile "lee CLAUDE.md de nuevo y resume el estado actual antes de continuar".

3. **Cuando dude entre dos opciones técnicas:** pídele que liste las opciones con trade-offs y espere tu decisión, NO que decida solo.

4. **Después de cada sesión:** dile "actualiza CLAUDE.md con el estado actual del proyecto en la sección 'Estado actual'". Esto te salva contexto entre sesiones.

5. **Errores raros de Phaser+Next.js:** casi siempre son SSR. Verifica que el componente usa `"use client"` y `dynamic({ ssr: false })`.

6. **Si el build de Vercel falla por tamaño:** mueve assets a Cloudflare R2 o Supabase Storage (ya documentado en el plan técnico).
