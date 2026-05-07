---
description: Revisa consistencia de un reto IIDTA contra los requisitos del proyecto
---

Voy a auditar un reto del proyecto IIDTA para verificar que cumple todos los requisitos antes de marcarlo como terminado.

**Pasos:**

1. **Leer CLAUDE.md** completo para tener fresco el contexto.

2. **Pedirme cuál reto auditar** (path en `packages/games-*/src/...`).

3. **Verificar lista de control:**

   **Estructura:**
   - [ ] Existe `manifest.ts` con todos los campos requeridos del tipo `ChallengeManifest`
   - [ ] Existe `Component.tsx`, `config.ts`, `rubric.ts`, `assets.ts`, `README.md`
   - [ ] Si es arcade/drag-drop: existe `scene.ts` que extiende `BaseScene`
   - [ ] El reto está registrado en `packages/games-{nivel}/src/index.ts`

   **Contenido:**
   - [ ] El `itemCode` mapea a un ítem real del instrumento (verificar contra CLAUDE.md sección "Los 90 retos")
   - [ ] Existe la **fase diagnóstica de 180 segundos** con parámetros fijos
   - [ ] Existen los **niveles de práctica** apropiados para el nivel educativo (5 niveles primaria/secundaria, 3 actos media — según PROMPT 4)
   - [ ] La rúbrica convierte crudo → 0-3 con z-score
   - [ ] La telemetría registra: aciertos, errores, tiempo respuesta, intentos (max 2), feedback final

   **Identidad visual:**
   - [ ] Si es primaria: paleta índigo/esmeralda/coral, fondos blanco hueso, tipografías Fredoka/Nunito
   - [ ] Si es secundaria: paleta azul espacial/cian/magenta, tipografías Orbitron/Space Grotesk
   - [ ] Si es media: paleta grafito/ámbar/carmín, tipografías mono, **NO infantil**

   **Compliance:**
   - [ ] El componente no almacena nombre del estudiante (solo código)
   - [ ] La pantalla de consentimiento se muestra antes de jugar
   - [ ] Datos sensibles van con autorización explícita

   **Calidad técnica:**
   - [ ] TypeScript estricto sin `any` sin justificar
   - [ ] Pasa `pnpm typecheck`
   - [ ] Pasa `pnpm lint`
   - [ ] Si es Phaser: usa `dynamic({ ssr: false })`
   - [ ] Si es TDAH: UI dentro del juego es limpia (no demasiados estímulos visuales decorativos)
   - [ ] Modo offline funciona (probar desconectando red en navegador)

4. **Reportar resultado** en formato:

   ```
   ✅ Aprobado | ⚠️ Aprobado con observaciones | ❌ Requiere cambios

   Observaciones:
   - ...
   - ...

   Sugerencias de mejora:
   - ...
   ```

5. **Si hay problemas críticos:** ofrecer corregirlos antes de cerrar.

Cuando me digas qué reto auditar, empiezo.
