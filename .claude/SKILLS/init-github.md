---
description: Inicializa el repositorio en GitHub (correr DESPUÉS del PROMPT 1, ANTES del PROMPT 2)
---

Voy a configurar el repositorio remoto en GitHub para este proyecto.

**Antes de empezar, necesito que el usuario confirme:**

1. ¿Tiene `gh` CLI instalado? Si no:
   - macOS: `brew install gh`
   - Windows: `winget install --id GitHub.cli`
   - Linux: ver https://github.com/cli/cli#installation

2. ¿Está autenticado en `gh`?
   - Verificar: `gh auth status`
   - Si no: `gh auth login` (elegir GitHub.com → HTTPS → autenticación por navegador)

3. ¿Cómo quiere el repo?
   - **Nombre del repo** (sugerencia: `iidta-platform`)
   - **Privacidad:** privado o público (recomendado: **privado** porque maneja datos de menores y código institucional)
   - **Organización:** ¿bajo su usuario personal o bajo una organización GitHub de USCO/UDES?
   - **Descripción** (sugerencia: "Plataforma de detección temprana de trastornos del aprendizaje — USCO/UDES — 90 videojuegos educativos")

**Pasos a ejecutar:**

1. **Verificar estado del repo local:**

   ```bash
   git status
   git log --oneline -n 5
   ```

   Confirmar que el PROMPT 1 ya hizo `git init` y al menos un commit inicial. Si no, hacer:

   ```bash
   git add .
   git commit -m "chore: scaffolding inicial monorepo Turborepo"
   ```

2. **Mejorar el `.gitignore`** para incluir cosas específicas del proyecto:

   ```gitignore
   # Dependencies
   node_modules/
   .pnp
   .pnp.js

   # Testing
   /coverage
   /.nyc_output

   # Next.js
   /.next/
   /out/
   /build
   .vercel

   # Production
   /dist

   # Misc
   .DS_Store
   *.pem
   .vscode/
   .idea/

   # Debug
   npm-debug.log*
   yarn-debug.log*
   yarn-error.log*
   .pnpm-debug.log*

   # Local env files
   .env
   .env*.local
   .env.development.local
   .env.test.local
   .env.production.local

   # Turborepo
   .turbo

   # IDE
   *.swp
   *.swo
   *~

   # Assets sin procesar (descargados manualmente, no van al repo)
   /assets-source/
   *.psd
   *.ai

   # Audio/video raw
   *.wav
   *.aiff

   # Datos sensibles
   /data/students/
   /backups/

   # Claude Code
   .claude/cache/

   # Logs del proyecto
   *.log
   ```

3. **Crear `LICENSE`** apropiada para el proyecto. **Como es proyecto institucional con datos sensibles, recomiendo NO usar licencia open source pública.** Crear archivo `LICENSE.md` con texto de uso restringido:

   ```markdown
   # Licencia de uso restringido

   Copyright (c) 2026 Universidad Surcolombiana (USCO) — UDES — Proyecto IIDTA

   Este software es propiedad intelectual del proyecto institucional IIDTA
   desarrollado por la Universidad Surcolombiana en convenio con UDES.

   Su uso, copia, modificación y distribución están restringidos al equipo
   autorizado del proyecto. Contiene componentes que manejan datos personales
   de menores bajo la Ley 1581 de 2012 (Habeas Data Colombia).

   Para autorizaciones de uso fuera del equipo del proyecto, contactar a:
   [coordinador del proyecto USCO/UDES]
   ```

4. **Crear `README.md` profesional** del proyecto (reemplaza el genérico):

   ```markdown
   # IIDTA Platform

   Plataforma de detección temprana de trastornos del aprendizaje
   (Dislexia, Discalculia, TDAH) para estudiantes colombianos.

   **Niveles educativos cubiertos:**

   - 🎒 Primaria (6-11 años) — IIDTA-P
   - 🚀 Secundaria (11-15 años) — II-TABAS
   - 🔍 Media (15-18 años) — IIDDA-EM

   ## Stack técnico

   - Next.js 14 (App Router) + TypeScript estricto
   - Phaser 3 (juegos arcade/drag-drop)
   - React + Framer Motion (juegos narrativos)
   - Tailwind CSS, Zustand, Howler.js, Dexie.js
   - Monorepo Turborepo + pnpm workspaces
   - Deploy: Vercel
   - Base de datos: Supabase (PostgreSQL)

   ## Estructura del proyecto
   ```

   apps/web/ Next.js app principal
   packages/core/ Motor base compartido (@iidta/core)
   packages/games-primaria/ 30 retos de primaria
   packages/games-secundaria/ 30 retos de secundaria
   packages/games-media/ 30 retos de media
   packages/ui/ Componentes UI compartidos

   ````

   ## Setup local

   ```bash
   pnpm install
   pnpm dev
   ````

   Abrir http://localhost:3000

   ## Compliance

   Este proyecto cumple con la **Ley 1581 de 2012** (Habeas Data Colombia)
   sobre tratamiento de datos personales de menores.
   - No se almacenan nombres ni apellidos de estudiantes
   - Solo se usan códigos institucionales anónimos
   - Pantalla de consentimiento Habeas Data antes de cualquier juego
   - Datos sensibles requieren autorización explícita

   ## Equipo
   - **Universidad Surcolombiana (USCO)** — entidad líder
   - **UDES** — co-investigación
   - **Investigadoras principales:** Rosa, Irlesa
   - **Estudiantes investigadoras USCO:** María Mercedes Rincón Valencia,
     Ana Sofía Nagles García, Jesús David Forero Sánchez

   ## Licencia

   Uso restringido institucional. Ver `LICENSE.md`.

   ```

   ```

5. **Crear el repositorio en GitHub:**

   ```bash
   # Si va al usuario personal:
   gh repo create iidta-platform \
     --private \
     --description "Plataforma de detección temprana de trastornos del aprendizaje — USCO/UDES — 90 videojuegos educativos" \
     --source=. \
     --push

   # Si va a una organización (ej. usco-udes):
   gh repo create usco-udes/iidta-platform \
     --private \
     --description "..." \
     --source=. \
     --push
   ```

6. **Verificar que se creó correctamente:**

   ```bash
   gh repo view --web
   ```

   (abre el navegador en la URL del repo)

7. **Configurar protección de la rama main:**

   ```bash
   gh api repos/{owner}/iidta-platform/branches/main/protection \
     -X PUT \
     -f required_status_checks='{"strict":true,"contexts":[]}' \
     -f enforce_admins=false \
     -f required_pull_request_reviews='{"dismiss_stale_reviews":true}' \
     -f restrictions=null
   ```

   Esto evita pushes directos a `main`. Todos los cambios deben pasar por PR.

8. **Crear branches estándar:**

   ```bash
   git checkout -b develop
   git push -u origin develop
   git checkout -b feature/core-engine
   ```

9. **Crear los archivos de comunidad GitHub:**
   - `.github/PULL_REQUEST_TEMPLATE.md`
   - `.github/ISSUE_TEMPLATE/bug_report.md`
   - `.github/ISSUE_TEMPLATE/new_challenge.md` (template específico para "agregar reto nuevo")

   El template `new_challenge.md` debe pedir:

   ```markdown
   ## Reto a implementar

   **Nombre:** (kebab-case)
   **Nivel:** primaria | secundaria | media
   **Dimensión:** dislexia | discalculia | tdah
   **Ítem del instrumento:** (ej. A1, B3, C5)
   **Mecánica:** arcade | drag-drop | narrativo | simulación
   **Paradigma científico que aplica:** (Go/No-Go, RAN, etc.)

   ## Métricas a registrar

   - Aciertos
   - Errores
   - Tiempo de respuesta
   - Intentos (max 2)
   - Feedback final del estudiante

   ## Definition of Done

   - [ ] Manifest creado
   - [ ] Component implementado
   - [ ] Rúbrica calibrada
   - [ ] Telemetría enviando al endpoint
   - [ ] TypeScript pasa
   - [ ] ESLint pasa
   - [ ] Probado offline
   - [ ] Documentación en README del reto
   ```

10. **Reportar resumen final:**
    - URL del repo
    - URL del primer commit
    - Lista de archivos creados/modificados
    - Próximos pasos sugeridos (PROMPT 2)

**Importante:**

- NO hacer push directo a `main` después del primer push inicial. Usar siempre PRs desde `feature/*` o `develop`.
- Si el usuario no quiere repo en GitHub aún (solo trabajar localmente), saltar este prompt completo y avisar.
