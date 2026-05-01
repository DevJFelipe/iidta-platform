---
description: Procesa y optimiza assets descargados manualmente para el proyecto IIDTA
---

Voy a procesar assets que el usuario ya descargó manualmente y los preparé para el proyecto.

**Antes de empezar, necesito saber:**

1. **Carpeta fuente:** ¿dónde están los assets sin procesar? (típicamente `~/Desktop/iidta-assets-source/` o similar)
2. **Tipo de assets:**
   - Sprites/imágenes (PNG/JPG)
   - Audio (MP3/WAV)
   - Fuentes (TTF/OTF/WOFF)
   - Otros (Lottie JSON, SVG)
3. **Destino:** ¿a qué reto(s) apuntan? Necesito el path en `packages/games-*/src/...`
4. **Licencia:** ¿qué licencia tienen? (CC0, CC-BY, Kenney, etc.) — para documentarla

**Pipeline de procesamiento:**

### Imágenes (PNG/JPG)

1. Verificar que `sharp` esté instalado: `pnpm add -D sharp -w`
2. Crear script `scripts/optimize-images.mjs` que:
   - Lee todos los PNG/JPG en la carpeta source
   - Los convierte a **WebP con calidad 85** (~50% menos peso)
   - Mantiene un PNG fallback solo si la imagen tiene transparencia y necesita compatibilidad
   - Genera versiones `@1x`, `@2x` si la imagen es para UI responsive
   - Guarda en `apps/web/public/assets/{nivel}/{reto}/` o en bucket externo si están configurado
3. Genera el `assets.ts` del reto con las rutas correctas

### Audio (MP3/WAV)

1. Verificar que `ffmpeg` esté disponible (instrucción de instalación si no)
2. Convertir a **OGG/Opus 64 kbps mono** (suficiente para SFX educativos, 70% menos peso)
3. Si son SFX cortos (<3s) y hay varios: crear un **audio sprite** combinado con el plugin de Howler.js
4. Guardar en `apps/web/public/audio/{nivel}/{reto}/`

### Fuentes

1. Si son archivos TTF/OTF: convertir a WOFF2 con `glyphhanger` o `fonttools`
2. Subset de glifos: solo carga los caracteres que el reto realmente usa (latín básico + acentos español)
3. Configurar en `apps/web/app/fonts.ts` siguiendo el patrón Next.js Font

### Documentación

Por cada batch procesado, generar/actualizar `apps/web/public/assets/LICENSES.md` con:

```markdown
## Assets utilizados

### Reto: {nombre-reto}

- **bg.webp** — origen: Kenney UI Pack — licencia: CC0 — sin atribución requerida
- **correct.ogg** — origen: Freesound user XYZ — licencia: CC-BY 4.0 — atribuir en créditos
```

### Verificación final

1. Reportar tamaño total antes/después de la optimización
2. Confirmar que todos los assets están referenciados desde algún `manifest.ts`
3. Verificar que `pnpm build` no rompa por assets faltantes

**Importante:**

- NO descargar assets de internet sin autorización explícita del usuario
- NO usar assets sin licencia clara
- Si una licencia requiere atribución, AGREGARLA al `LICENSES.md` automáticamente

Cuando me digas la carpeta fuente y a qué reto apuntan, empiezo.
