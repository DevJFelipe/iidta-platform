# CLAUDE.md — Proyecto IIDTA Platform

> Este archivo es el contexto persistente para Claude Code. Léelo completo en cada sesión nueva.

---

## 🎯 Qué es este proyecto

Plataforma web de **detección temprana de trastornos del aprendizaje** (Dislexia, Discalculia, TDAH) para la **Universidad Surcolombiana (USCO) y UDES** en Colombia. Piloto institucional para segundo semestre 2026.

**Mi rol en el proyecto:** desarrollador encargado de construir los **90 videojuegos educativos** que se integran a la plataforma principal. Las investigadoras (Rosa e Irlesa de UDES) construyen el instrumento; las desarrolladoras de UDES construyen la plataforma; **yo construyo los juegos y los expongo como una app Next.js separable que luego se integra**.

---

## 📚 Contexto científico (no inventar — está validado)

El proyecto tiene **3 instrumentos** ya validados con alpha de Cronbach > 0.80:

| Instrumento | Población | Edad | Items | Dimensiones |
|---|---|---|---|---|
| **IIDTA-P** | Primaria | 6-11 años | 15 (5 por dimensión) | A=Dislexia, B=Discalculia, C=TDAH |
| **II-TABAS** | Secundaria | 11-15 años | 15 | D=Dislexia, C=Discalculia, T=TDAH |
| **IIDDA-EM** | Media | 15-18 años | 15 | A=Dislexia, B=Discalculia, C=TDAH (varía orden) |

Cada ítem se evalúa con **escala Likert 0-3**: Nunca / A veces / Frecuente / Siempre.

**RF-22 del proyecto:** cada videojuego debe producir un puntaje **equivalente al ítem Likert que evalúa**. Esto es psicométricamente delicado — separar **fase diagnóstica calibrada** (idéntica para todos) de **fase de práctica con niveles** (variable, motivacional, no afecta el puntaje).

---

## 🏗️ Stack técnico definitivo

```yaml
Framework: Next.js 14+ (App Router) con TypeScript estricto
Motor de juegos 2D: Phaser 3.80+ (template oficial: phaserjs/template-nextjs)
UI/HUD: React + Tailwind 3 + Framer Motion (para narrativa)
Estado global: Zustand
Audio: Howler.js
Persistencia local: Dexie.js sobre IndexedDB
PWA/Offline: @ducanh2912/next-pwa
Validación: Zod
DB: Supabase (Postgres, DC São Paulo para residencia LATAM)
Auth: NextAuth.js / Auth.js
Deploy: Vercel Pro durante piloto / Cloudflare Pages como plan B
Monorepo: Turborepo + pnpm workspaces
```

**No usar:** PixiJS solo (sin engine), Construct/GDevelop export, Konva (Phaser cubre todo).

**Para retos narrativos tipo escape room (media):** React puro + Framer Motion + Zustand, NO Phaser. La regla es:
- Arcade, Go/No-Go, drag-drop → **Phaser**
- Decisiones, lectura, escape rooms → **React puro**

---

## 📁 Estructura del repositorio (Turborepo)

```
iidta-platform/
├── apps/
│   └── web/                          # Next.js 14 App Router
│       ├── app/
│       │   ├── page.tsx              # Landing
│       │   ├── consent/page.tsx      # Habeas Data
│       │   ├── reto/[level]/[code]/page.tsx
│       │   └── api/
│       │       ├── telemetry/route.ts
│       │       ├── challenge/result/route.ts
│       │       └── session/route.ts
│       ├── public/
│       └── next.config.js
├── packages/
│   ├── core/                         # @iidta/core
│   │   └── src/
│   │       ├── engine/
│   │       │   ├── BaseScene.ts      # Phaser scene base con telemetría
│   │       │   ├── ChallengeRunner.tsx
│   │       │   └── NarrativeRunner.tsx
│   │       ├── scoring/
│   │       │   ├── likertMap.ts
│   │       │   └── rubrics/
│   │       ├── telemetry/
│   │       ├── storage/
│   │       │   ├── db.ts             # Dexie schema
│   │       │   └── sync.ts           # Background sync
│   │       ├── consent/
│   │       └── ui/
│   ├── games-primaria/               # @iidta/games-primaria (30 retos)
│   ├── games-secundaria/             # @iidta/games-secundaria (30 retos)
│   ├── games-media/                  # @iidta/games-media (30 retos)
│   ├── ui/                           # @iidta/ui (componentes compartidos)
│   ├── eslint-config/
│   └── tsconfig/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── CLAUDE.md                         # ESTE archivo
```

---

## 🎨 Identidad visual por nivel

### Primaria (6-11) — "Academia de Héroes del Saber"
- Paleta: índigo `#4F46E5` (Letras), esmeralda `#10B981` (Números), coral `#F97316` (Enfoque)
- Fondo: `#FAF7F2` blanco hueso
- Tipografías: títulos **Fredoka** o **Baloo 2**, cuerpo **Nunito** (Google Fonts)
- Tamaño base: 18 px (mejor para lectores con dislexia leve)
- Mascotas: 1 por torre (loro "El Loro Sabio" para Letras, ardilla, colibrí)

### Secundaria (11-15) — "Estación Orbital del Aprendizaje"
- Paleta: azul espacial `#0F172A` + cian `#06B6D4` + magenta `#D946EF` + amarillo `#FACC15`
- Tipografías: títulos **Orbitron** o **Space Grotesk**, cuerpo **Inter**
- Tamaño base: 16 px
- Estética: ciencia ficción ligera, no Halo

### Media (15-18) — "Agencia Cognitiva"
- Paleta: grafito `#0A0A0F` + ámbar `#F59E0B` + carmín `#DC2626` + esmeralda apagado `#059669`
- Tipografías: títulos **JetBrains Mono** o **IBM Plex Mono**, cuerpo **Inter** o **Manrope**
- Estética: thriller minimalista (tipo *True Detective* + Apple TV)
- **NUNCA**: emojis infantiles, Comic Sans, colores saturados tipo cartoon

---

## 🧠 Patrón "Challenge Manifest" (clave para escalar a 90 retos)

Cada reto exporta un objeto tipado siguiendo este contrato:

```typescript
// packages/games-primaria/src/discalculia/caza-de-numeros/manifest.ts
import type { ChallengeManifest } from "@iidta/core";

export const manifest: ChallengeManifest = {
  id: "P-DC-01-caza-de-numeros",
  level: "primaria",
  dimension: "discalculia",
  itemCode: "B1",                    // mapea ítem del IIDTA-P
  diagnosticDuration: 180,           // segundos de fase comparable
  practiceLevels: 5,
  rubric: cazaDeNumerosRubric,       // función crudo → 0-3
  Component: dynamic(() => import("./Component"), { ssr: false }),
  assetsManifest: ["bg.webp", "numbers.png", "correct.mp3", "wrong.mp3"]
};
```

El `ChallengeRunner` lee el manifest, monta el componente con `ssr:false`, aplica consentimiento, instrumenta telemetría, y al terminar mapea con la rúbrica.

---

## 📊 Rúbrica de puntuación (Crudo → Likert 0-3)

```
Z-score del desempeño contra norma piloto:
  z ≤ -1     → Likert 3 (Siempre presenta dificultad)
  -1 < z ≤ -0.3 → Likert 2 (Frecuente)
  -0.3 < z ≤ 0.3 → Likert 1 (A veces)
  z > 0.3    → Likert 0 (Nunca)

PROVISIONAL hasta tener norma propia con 50 estudiantes piloto.
La rúbrica vive en rubric.ts por reto y es ajustable sin recompilar.
```

---

## 📦 Los 90 retos por nivel

### PRIMARIA (IIDTA-P, ítems prefijo P-)

**Discalculia (B1-B5):**
1. Caza de números (B1)
2. Memoria numérica (B1)
3. Camino del valor posicional (B3)
4. Carrera de sumas simples (B4)
5. Mercado matemático (B4)
6. Puzzle de series numéricas (B4)
7. Batalla de signos (B2)
8. Torre de tablas (B5)
9. Laberinto de problemas (B4)
10. Bingo matemático (B1)

**Dislexia (A1-A5):**
1. Caza de letras espejo (A1)
2. Rompecabezas de sílabas (A2)
3. Carrera de lectura (A2)
4. Detective de palabras (A3)
5. Dictado mágico (A5)
6. Memoria de palabras e imágenes (A4)
7. Ordena la oración (A4)
8. Eco lector (A2)
9. Completa la palabra (A5)
10. Laberinto de comprensión (A4)

**TDAH (C1-C5):**
1. Semáforo de impulsos (C5)
2. Busca y completa (C2)
3. Encuentra el cambio (C1)
4. Sigue la secuencia (C1)
5. Carrera del silencio (C5)
6. Pesca de atención (C1)
7. Torre de instrucciones (C1)
8. Memoria con distractores (C1)
9. Ruta del explorador (C3)
10. Misión espera y responde (C5)

### SECUNDARIA (II-TABAS, ítems prefijo S-)

**Dislexia (D1-D5):**
1. Cazador de sílabas perdidas (D1)
2. Eco lector (D2)
3. Guardianes de rimas y sonidos (D1)
4. Copia galáctica del tablero (D4)
5. Detective ortográfico (D5)
6. Bosque de frases con trampas (D3)
7. Laboratorio grafema-fonema (D1)
8. Constructor morfológico (D1, D5)
9. Escape room de lectura extensa (D3)
10. Novela interactiva "Elige y lee" (D2, D3, D5)

**Discalculia (C1-C5):**
1. Ciudad del valor posicional (C3)
2. Carrera de símbolos numéricos (C1)
3. Arena de tablas mágicas (C2)
4. Laberinto de secuencias (C5)
5. Escape aritmético (C4)
6. Mercado del cambio exacto (C3, C4)
7. Línea numérica espacial (C1, C3)
8. Taller de algoritmos (C4)
9. Torres de estimación (C1)
10. Misión matemática contextualizada (C4, C5)

**TDAH (T1-T5):**
1. Radar de enfoque (T1, T2)
2. Semáforo de impulsos (T2, T4)
3. Misión terminar (T3)
4. Guardián del turno (T4)
5. Quietud con propósito (T5)
6. Cadena de instrucciones (T1, T3)
7. Pomodoro Quest (T1, T3)
8. Clasificador relevante / irrelevante (T2)
9. Planificador de misiones (T3)
10. Cooperativo de escucha y espera (T1, T4)

### MEDIA (IIDDA-EM, ítems prefijo M-)

**Dislexia (B1-B5):**
1. Misión: Código de lectura (B1, B2)
2. Detector de errores editoriales (B2, B4)
3. Escape de comprensión (B3, B5)
4. Radar de fluidez (B1)
5. Decisión narrativa (B3)
6. Rompecabezas de párrafos (B1, B3)
7. Duelo de subtítulos (B3, B4)
8. Ruta de palabras clave (B3)
9. Archivo ortográfico clasificado (B4)
10. Misión lectura breve, logro largo (B5, B1, B3)

**Discalculia (C1-C5):**
1. Simulador de presupuesto real (C1, C2, C5)
2. Mapa de magnitudes (C1)
3. Código de operadores (C2, C3)
4. Reconstrucción del algoritmo (C4)
5. Caza del error matemático (C2, C3, C4)
6. Ruta del valor posicional (C1)
7. Laboratorio de patrones (C4)
8. Misión coordenadas (C1, C3)
9. Banco de fracciones y porcentajes (C1, C2, C5)
10. Desafío anti-frustración matemática (C5)

**TDAH (A1-A5):**
1. Sprint de enfoque (A1, A3)
2. Cazador de distractores (A2)
3. Checklist de misión completa (A3)
4. Semáforo de autorregulación (A4, A5)
5. El turno exacto (A5)
6. Ruta sin pausa falsa (A1, A2, A3)
7. Control de impulsos en escena (A5, A4)
8. Base organizada (A3)
9. Pausa activa inteligente (A4)
10. Foco maestro (A1, A2, A3, A4, A5)

---

## ⚖️ Compliance Ley 1581 / Habeas Data Colombia

**OBLIGATORIO:**
- NO almacenar nombres ni apellidos de estudiantes. Solo código institucional anónimo.
- Pantalla de **asentimiento del menor** antes de jugar (lenguaje adaptado por edad).
- **Consentimiento del acudiente** firmado en papel/e-firma ANTES del piloto (gestionado por USCO/UDES, fuera de la app).
- **Aviso de privacidad** accesible desde menú principal.
- Datos relacionados con salud mental (puntajes TDAH/dislexia/discalculia) son **datos sensibles** (Art. 5) → autorización explícita.
- Si DB en US (Vercel default) → cláusula de transferencia internacional. Mejor: Supabase São Paulo.

---

## 🚨 Restricciones críticas (no negociables)

1. **NO inventar contenido** que no esté validado en los documentos del proyecto. Si surge una duda sobre un ítem, marcarlo como TODO y consultar.
2. **Cada reto debe registrar:** aciertos, errores, tiempo de respuesta, intentos (máx 2 según P-21), feedback final del estudiante (¿fácil/difícil? ¿gustó?).
3. **Modo offline obligatorio** (RNF-03, P-49: zonas rurales con conectividad limitada). Dexie + Service Worker + Background Sync.
4. **Para retos TDAH específicamente:** UI dentro del reto debe ser **limpia y de baja distracción** (la literatura dice que gráficos llamativos perjudican el desempeño en TDAH). Llamativo en menú, sobrio en juego.
5. **Separación diagnóstico vs práctica:** la fase diagnóstica (180s, parámetros idénticos a todos) genera el puntaje Likert. La fase de práctica (niveles progresivos) NO afecta el puntaje, solo motivación.
6. **Sin leaderboards globales** entre estudiantes (ético en menores). Solo achievements personales.
7. **TypeScript estricto** en todo el monorepo. Cero `any` sin justificación documentada.

---

## 📋 Estado actual del proyecto

**Última actualización:** 2026-05-07

### Hitos previos

- [x] Reunión 1 con investigadoras: aprobaron concepto general "Academia de Héroes del Saber"
- [x] Reunión 2 con investigadoras: pidieron **niveles de progresión, mayor complejidad, visualmente más llamativos**
- [x] 3 prototipos HTML estáticos creados (descartados — no escalan)
- [x] Investigación técnica completa (ver documento `Plan_Tecnico_IIDTA.md`)
- [x] Scaffolding monorepo + core engine
- [ ] Demo set: **5/9 retos navegables** (1 por dimensión × 3 niveles)
- [ ] Deploy preview en Vercel
- [ ] Reunión 3 con investigadoras (presentar demo)
- [ ] Producción de los 85 retos restantes

### Infraestructura

- ✅ Monorepo Turborepo + pnpm workspaces (7 packages)
- ✅ Next.js 14 (App Router) + TypeScript estricto
- ✅ Phaser 3.90 integrado vía `PhaserMount` con dynamic import client-side
- ✅ Core engine: `BaseScene`, `ChallengeRunner`, `ChallengeManifest`, scoring (`likertMap`), telemetry (`TelemetryClient`)
- ✅ Persistencia offline: Dexie (IndexedDB) — tablas `pendingResults`, `consents`, `progress`
- ✅ Pantalla de consentimiento Habeas Data: `ConsentScreen` + `useConsent` hook con cache localStorage + Dexie por (level, consentVersion)
- ✅ Tipografías cargadas vía `next/font/google`: Fredoka+Nunito (primaria 18px), Orbitron+Inter (secundaria 16px)
- ⚠️ Service Worker / PWA: deshabilitado en dev (mode prod pendiente)
- ❌ Deploy en Vercel (sin `vercel.json` ni `.vercel/`)

### Retos por nivel y dimensión

**PRIMARIA (3/30 completados):**

- Dislexia: 1/10 — Caza de letras espejo (P-DI-01, ítem A1, Loro Sabio)
- Discalculia: 1/10 — Mercado matemático (P-DC-01, ítem B4, Coni Conejo)
- TDAH: 1/10 — Semáforo de impulsos (P-TD-01, ítem C5, Mono Mensajero)

**SECUNDARIA (2/30 completados):**

- Dislexia: 1/10 — Detective ortográfico (S-DI-01, ítem D5, AURA)
- Discalculia: 1/10 — Línea numérica espacial (S-DC-01, ítems C1+C3, ZARA)
- TDAH: 0/10 — *próximo: Cazador de distractores (S-TD-01, n-back)*

**MEDIA (0/30 completados):**

- Dislexia: 0/10
- Discalculia: 0/10
- TDAH: 0/10

### Calidad técnica

- TypeScript: ✅ pasa (6/6 packages)
- ESLint: ✅ pasa (6/6 packages, 0 warnings)
- READMEs por reto: ✅ los 5 retos implementados tienen documentación pedagógica para investigadoras

### Próximos pasos sugeridos

1. Implementar **S-TD-01 Cazador de distractores** (secundaria/TDAH, paradigma n-back) — siguiente según PROMPT 4
2. Implementar los 3 retos de Media: M-DI-01 Detector de errores editoriales, M-DC-01 Simulador de presupuesto real (ambos React puro + Framer Motion), M-TD-01 Sprint de enfoque (Phaser SART)
3. Configurar deploy en Vercel (`vercel.json` + dominio para preview con investigadoras)
4. Habilitar Service Worker en build de producción para offline real
5. Reunión 3 con investigadoras: presentar demo set de 9 retos navegables

---

## 🎯 Cómo trabajar conmigo (Claude Code)

**Cuando inicies una tarea:**
1. Lee CLAUDE.md completo.
2. Si la tarea no está clara, pregunta UNA pregunta concreta antes de codificar.
3. Si vas a crear archivos nuevos, propón la estructura PRIMERO con `tree` o lista, espera confirmación.
4. Implementa en pasos pequeños, ejecuta tests/lint después de cada paso significativo.
5. Al terminar, deja un mensaje resumen con: archivos creados/modificados, comandos para verificar, próximos pasos sugeridos.

**Comandos del proyecto (cuando existan):**
```bash
pnpm dev          # arranca Next.js en :3000
pnpm build        # build producción
pnpm lint         # ESLint en todo el monorepo
pnpm test         # Vitest
pnpm typecheck    # tsc --noEmit en todos los packages
pnpm storybook    # opcional para componentes UI
```

**No hagas:**
- No instales librerías nuevas sin proponerlas primero.
- No reescribas archivos completos cuando un edit pequeño basta.
- No agregues comentarios obvios al código.
- No uses `any` en TypeScript a menos que justifiques por qué.
- No commitees código sin que pase `pnpm lint` y `pnpm typecheck`.

---

## 📞 Contactos del proyecto

- **Investigadoras UDES:** Rosa, Irlesa (toman decisiones de instrumento)
- **Estudiantes investigadoras USCO:** María Mercedes Rincón Valencia, Ana Sofía Nagles García, Jesús David Forero Sánchez
- **Yo:** desarrollador encargado de los videojuegos
