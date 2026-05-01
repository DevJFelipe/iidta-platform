---
description: Actualiza la sección "Estado actual del proyecto" en CLAUDE.md
---

Voy a actualizar la sección **"📋 Estado actual del proyecto"** en `CLAUDE.md` con el progreso real.

**Pasos:**

1. **Leer CLAUDE.md** completo.

2. **Inspeccionar el repositorio** para detectar:
   - Qué packages existen (`packages/*/package.json`)
   - Qué retos existen (carpetas en `packages/games-*/src/{dimension}/*/`)
   - Qué retos están registrados en cada `index.ts`
   - Estado del deploy (verificar `vercel.json` y `.vercel/`)
   - Resultados de `pnpm typecheck` y `pnpm lint` (correr ambos)

3. **Generar el reporte:**

   ```markdown
   ## 📋 Estado actual del proyecto

   **Última actualización:** {fecha actual}

   ### Infraestructura

   - [x/✅/❌] Monorepo Turborepo
   - [x/✅/❌] Next.js 14 + TypeScript estricto
   - [x/✅/❌] Phaser 3 integrado
   - [x/✅/❌] Core engine (BaseScene, ChallengeRunner, scoring, telemetry)
   - [x/✅/❌] Persistencia offline (Dexie + Service Worker)
   - [x/✅/❌] Pantalla de consentimiento Habeas Data
   - [x/✅/❌] Deploy en Vercel

   ### Retos por nivel y dimensión

   **PRIMARIA (X/30 completados):**

   - Dislexia: X/10 — listar nombres
   - Discalculia: X/10
   - TDAH: X/10

   **SECUNDARIA (X/30 completados):**

   - Dislexia: X/10
   - Discalculia: X/10
   - TDAH: X/10

   **MEDIA (X/30 completados):**

   - Dislexia: X/10
   - Discalculia: X/10
   - TDAH: X/10

   ### Calidad técnica

   - TypeScript: ✅ pasa | ❌ N errores
   - ESLint: ✅ pasa | ❌ N warnings
   - Build: ✅ exitoso | ❌ falla

   ### Próximos pasos sugeridos

   1. ...
   2. ...
   3. ...
   ```

4. **Reemplazar la sección "Estado actual"** en `CLAUDE.md` con el reporte generado, conservando todo lo demás del archivo intacto.

5. **Mostrarme el diff** antes de guardar.

Empezar ahora.
