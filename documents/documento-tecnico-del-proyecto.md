# Plan Técnico y de Contenido — IIDTA: 90 videojuegos educativos en Next.js + Vercel

## TL;DR

- **Empieza HOY con Next.js 14 (App Router) + TypeScript + Tailwind + Phaser 3** como motor base para 2D arcade y drag-and-drop, **complementado por React + Framer Motion** para experiencias narrativas tipo escape room en secundaria/media. Phaser publica template oficial Next.js (marzo 2024) que resuelve SSR, hot-reload y comunicación React↔Phaser vía EventBus, con una curva mucho más corta que PixiJS puro y mejor que Konva para juegos arcade. Tu dev ya sabe React, así que esto reutiliza el 70 % de su conocimiento.
- **Construye un "demo set" de 9 juegos (3 por nivel educativo, 1 por dimensión) en 3–4 semanas** apalancado en un *core engine* compartido (`@iidta/core`) que estandariza puntuación, telemetría, conversión Likert 0-3, persistencia offline (Dexie/IndexedDB) y sync diferido. Después escala a los 81 restantes a un ritmo de 2–4 horas por reto promedio reutilizando plantillas. Para la próxima reunión, las investigadoras deben poder jugar 9 retos navegables, ver datos guardándose y entender la equivalencia con la escala Likert del IIDTA.
- **Despliega en Vercel Hobby para el piloto** (50–200 estudiantes basta con 100 GB/mes y 1M edge requests), pero con el conocimiento de que Vercel **prohíbe uso comercial en Hobby** y que un proyecto institucional financiado por USCO/UDES requiere idealmente Pro ($20 USD/mes) o, mejor para ese presupuesto, **Cloudflare Pages como plan B gratuito sin esa restricción**. Mueve los assets pesados (sprites, audio) a un bucket externo (Supabase Storage o Cloudflare R2) en lugar de empaquetarlos: bajará tu bandwidth Vercel ~80 %.

---

## Key Findings

1. **Phaser 3 es la apuesta correcta**, no PixiJS ni r3f. Phaser tiene template oficial Next.js (`phaserjs/template-nextjs`) con bridge React ↔ Phaser por EventBus, motor de física, audio, input táctil, scenes y >1 800 ejemplos. PixiJS rinde ~2× más en píxeles puros (1M+ sprites) pero **no tiene ningún sistema de juego** — escenas, físicas, input, audio: tendrías que construirlo. Para 90 retos en 6 meses eso sería suicida.
2. **Konva.js es excelente para los juegos drag-and-drop puramente WCAG-friendly** (drag boundaries, snap-to-grid, Transformer, react-konva oficial), pero su rendimiento Canvas 2D es inferior y duplicar engines (Phaser + Konva) complica el `core`. Recomendación: **un solo motor (Phaser) cubre todo**.
3. La literatura científica respalda fuertemente el enfoque: **Wilson & Dehaene (2006, DOI 10.1186/1744-9081-2-19) The Number Race** para discalculia; **Rello et al. (2020, DOI 10.1371/journal.pone.0241687) Dytective** detecta dislexia gamificada en español con sensibilidad >80 % en 3 600 niños; **Keshav et al. (2019, DOI 10.3390/children6060072)** correlaciona desempeño en juego con escalas clínicas de TDAH. Tu instrumento Likert-equivalente tiene precedente científico.
4. **El Conners CPT-3 como predictor único de TDAH es débil** (Callan et al., 2024, DOI 10.1177/10870547231223727). Esto es importante: tus juegos NO sustituyen al diagnóstico clínico, **complementan el cuestionario Likert** del instrumento ya validado por las investigadoras (alpha > 0.80). El videojuego mide el mismo constructo del ítem por *behavioral data* (latencia, errores, omisiones), no diagnostica por sí solo.
5. **Vercel Hobby permite 100 GB/mes de bandwidth y 1M edge requests** pero su política Fair Use **prohíbe uso comercial / institucional financiado**. Para un piloto académico no-monetizado puedes argumentar uso personal-académico, pero el riesgo de suspensión existe. **Cloudflare Pages tiene plan free sin esa restricción**, builds ilimitados y bandwidth ilimitado.
6. **Flow theory (Csikszentmihalyi) + ZPD (Vygotsky) + scaffolding (Wood, Bruner & Ross 1976)** es el marco pedagógico canónico para dificultad progresiva. Pero hay un riesgo crítico que tus investigadoras deben entender: **un juego con dificultad adaptativa demasiado libre rompe la comparabilidad psicométrica del instrumento diagnóstico**. La solución es separar **"nivel diagnóstico calibrado"** (3–5 minutos, fijo, comparable entre niños — fuente del puntaje Likert) de **"niveles de práctica"** (variables, motivacionales, no calibrados — para engagement).
7. **El estudio personalizado de Personalized Game-Based Content para TDAH (PMC 11673005, 2024)** mostró que en niños con TDAH, los gráficos llamativos NO mejoran el desempeño y a veces lo perjudican. **Tu UI debe ser visualmente atractiva en el menú/onboarding pero limpia y de baja distracción dentro de los juegos TDAH específicamente.** Esto es un hallazgo contraintuitivo crucial para responder a las investigadoras.

---

## Details

### 1. Arquitectura técnica óptima

**Decisión: Phaser 3 + Next.js 14 App Router + TypeScript + Tailwind + Zustand + Howler + Dexie**

| Capa | Tecnología elegida | Justificación |
|------|---|---|
| Framework web | Next.js 14 (App Router) | SSR para landing/login + dynamic imports para juegos client-side; Vercel-friendly |
| Lenguaje | TypeScript estricto | Auto-completado en `core engine` y tipos compartidos entre 90 retos |
| Motor de juego 2D | **Phaser 3.80+** | Template oficial Next.js, físicas, scenes, input, audio, comunidad gigante, ~1.2 MB pero compartido entre todos los retos vía bundle splitting |
| UI/HUD | React + Tailwind 3 + Framer Motion | El HUD (vida, puntaje, instrucciones) en React encima del canvas; Framer para narrativa escape room |
| Estado global | **Zustand** | Mucho más ligero que Redux; persiste sesión, progreso, perfil estudiante |
| Audio | **Howler.js** | Estándar de facto, ~7 KB, fallback HTML5↔WebAudio, sprites de audio |
| Persistencia local | **Dexie.js** sobre IndexedDB | API limpia para offline-first; soporta queries indexadas, fundamental para RNF-03 (zonas rurales) |
| Service Worker | **Serwist** (sucesor de next-pwa) o `@ducanh2912/next-pwa` | Cache de app shell + assets; Background Sync para reintentos |
| Animaciones UI | Framer Motion | Las pantallas narrativas (escape rooms para media) se hacen en React puro |
| Validación esquemas | Zod | Validar payloads que envían los juegos al API antes de persistir |
| Testing | Vitest + Playwright | Vitest para core engine; Playwright para flujo end-to-end de un reto |

**Por qué NO los demás:**

- **PixiJS solo:** 450 KB pero requiere construir físicas, scenes, audio, input desde cero. Para 90 retos en plazo institucional, irreal.
- **react-three-fiber / Three.js:** brillante para 3D inmersivo, pero es overkill 2D y la curva de aprendizaje (shaders, scene graph 3D) consumirá semanas que no tienes. Reservar como opcional para algún reto "vitrina" en media (`Misión coordenadas`).
- **Construct 3 / GDevelop export:** generan código no idiomático React, dependencias propietarias, deploy frágil en Vercel y no permite compartir el `core engine` de telemetría con tipado.
- **Excalibur.js:** TypeScript-first y elegante, pero comunidad ~10× menor y menos ejemplos pedagógicos.
- **Konva.js:** opción defendible si solo fueras a hacer drag-and-drop, pero Phaser cubre eso vía Arcade Physics + `setInteractive({ draggable: true })` perfectamente.

**Cobertura por mecánica que necesitas:**

| Tipo de mecánica | Phaser cubre con… |
|---|---|
| (a) Arcade "atrapar letras flotantes", Go/No-Go (Semáforo de impulsos, Caza de letras espejo, Pesca de atención) | Arcade Physics + sprites + groups + colliders |
| (b) Drag-and-drop ortografía/matemáticas (Rompecabezas de sílabas, Mercado matemático, Banco de fracciones) | `setInteractive({ draggable: true })` + zones |
| (c) Narrativa tipo escape room (Escape de comprensión, Novela interactiva, Misión Código de lectura) | **No usar Phaser para esto** — usar React + Framer Motion + Zustand para máquina de estados narrativa, con sprites/imágenes/animaciones HTML/CSS, dentro del mismo Next.js. Solo retos arcade van a Phaser. |

**Estructura del core engine compartido (`packages/core`):**

```
packages/
  core/
    src/
      engine/
        BaseScene.ts         // Phaser scene base con telemetría
        ChallengeRunner.tsx  // Wrapper React que monta cualquier reto
        NarrativeRunner.tsx  // Para retos React puro (escape rooms)
      scoring/
        likertMap.ts         // 0-3 según percentiles del puntaje crudo
        rubrics/
          dyslexia.ts        // 10 rúbricas de mapeo (1 por reto)
          dyscalculia.ts
          adhd.ts
      telemetry/
        events.ts            // tipo TelemetryEvent
        client.ts            // POST /api/telemetry con cola offline
      storage/
        db.ts                // Dexie schema
        sync.ts              // Background sync queue
      consent/
        ConsentScreen.tsx    // Habeas Data Ley 1581
        antiCheat.ts         // tab visibility, click timing
      ui/
        Hud.tsx, Timer.tsx, Lives.tsx, Feedback.tsx
apps/
  web/                       // Next.js app (App Router)
    app/
      reto/[level]/[code]/page.tsx   // page entry universal
      api/telemetry/route.ts
      api/session/route.ts
games/
  primaria/
    discalculia/
      caza-de-numeros/
        index.tsx            // exporta ChallengeManifest
        scene.ts             // Phaser scene (si arcade)
        config.ts            // niveles, parámetros de dificultad
        rubric.ts            // mapeo a Likert
        assets/              // sprites locales o referencias a CDN
    dislexia/...
    tdah/...
  secundaria/...
  media/...
```

**Patrón "Challenge Manifest" — la abstracción que ahorra tiempo:**

Cada reto exporta un objeto tipado:

```ts
export const manifest: ChallengeManifest = {
  id: "P-DC-01-caza-de-numeros",
  level: "primaria",
  dimension: "discalculia",
  itemCode: "C1",                 // mapea ítem del IIDTA-P
  diagnosticDuration: 180,        // segundos de la fase comparable
  practiceLevels: 5,
  rubric: cazaDeNumerosRubric,
  Component: dynamic(() => import("./Component"), { ssr: false }),
  assetsManifest: ["bg.webp","numbers.png","correct.mp3","wrong.mp3"]
};
```

El `ChallengeRunner` lee el manifest, monta el componente con `ssr:false` (Phaser requiere `window`), aplica consentimiento, instrumenta telemetría y al terminar mapea con la rúbrica.

**Lazy loading y bandwidth:**

- Cada reto **es un dynamic import separado** → Next.js genera 90 chunks distintos. Ningún niño descarga >1 reto a la vez.
- Phaser core (~1.2 MB gzip ~400 KB) se comparte como vendor chunk una sola vez.
- **Mueve TODOS los assets pesados (PNG, sprites, audio MP3) a un bucket externo**: Cloudflare R2 (10 GB free, sin egress fees), Supabase Storage (1 GB free) o Bunny CDN ($0.01/GB). En `next.config.js` agrega esos dominios a `images.remotePatterns` y configura headers `Cache-Control: public, max-age=31536000, immutable`. Esto es **crítico**: con 90 retos × ~2 MB de assets cada uno = 180 MB de assets; servidos desde Vercel y reproducidos por 200 estudiantes × 30 retos cada uno son 1.08 TB/mes. Imposible en Hobby. Externalizando el bandwidth de assets, Vercel solo sirve HTML/JS y queda en ~5 GB/mes.
- Convierte sprites a **WebP** (50 % menos peso) y audio a **OGG/Opus 64 kbps** mono (suficiente para SFX educativos).
- Usa `next/image` con `placeholder="blur"` para imágenes UI; para canvas Phaser carga directo del bucket.

### 2. Sistema de niveles y progresión

**Marco pedagógico (anclado en literatura):**

- **Vygotsky (1978) — Zona de Desarrollo Próximo (ZDP):** los retos deben caer en la franja "no puedo solo, sí puedo con apoyo". El "apoyo" en un juego digital se materializa en *scaffolds* (Wood, Bruner & Ross, 1976, DOI 10.1111/j.1469-7610.1976.tb00381.x): instrucciones graduadas, pistas progresivas, modelado por demostración.
- **Csikszentmihalyi (1990) — Flow:** la dificultad debe escalar al mismo ritmo que la habilidad. Si dificultad < habilidad → aburrimiento; si dificultad > habilidad → ansiedad. El canal de flow se mantiene si cada nivel ajusta ~10 % arriba del desempeño previo.
- **Massimini, Csikszentmihalyi & Carli (1987)** — modelo de 8 zonas: añade matiz para no caer en *apathy* (low skill + low challenge → desinterés total).

**Recomendación concreta de niveles por edad:**

| Nivel educativo | Niveles por reto | Duración total por reto | Razón |
|---|---|---|---|
| Primaria 6-11 (IIDTA-P) | **5 niveles** + "modo entrenamiento" inicial | 5–8 min total | Atención sostenida limitada; engagement por novedad |
| Secundaria 11-15 (II-TABAS) | **7 niveles** + boss/desafío final | 8–12 min total | Capacidad metacognitiva creciente; les motiva la maestría |
| Media 15-18 (IIDDA-EM) | **3 actos × 3 escenas (= 9 unidades)** narrativos | 12–18 min total | Prefieren narrativa de "misión" sobre niveles arcade clásicos |

**Crítico — separación diagnóstico vs. progresión:**

> El núcleo del problema es: si la dificultad cambia, ¿cómo comparar puntajes entre niños?

**Solución: arquitectura "dos fases":**

1. **Fase 1 — Diagnóstico calibrado (180 s, mismo para todos):** parámetros idénticos a todos los niños (ej. 30 estímulos a 1 estímulo/s, mismo tipo, misma proporción Go/No-Go 70/30). Genera el puntaje **convertible a Likert 0-3** que cumple RF-22. Esta es la única fase con valor psicométrico. Todos los niños la juegan exactamente igual.
2. **Fase 2 — Progresión motivacional (niveles 1-5/7):** post-diagnóstico, el juego desbloquea niveles con dificultad escalada para *engagement*, no para evaluación. Estos niveles **no contribuyen al puntaje Likert** sino a un "puntaje de práctica" separado. Si el niño rinde mal en F1 pero excelente en F2, eso es una **señal cualitativa adicional** (puede indicar ansiedad evaluativa, no déficit cognitivo) que se reporta al investigador.

Este diseño es defendible ante las investigadoras porque preserva la psicometría del instrumento (alpha > 0.80) sin matar la motivación.

**Mapeo crudo → Likert (rúbrica genérica, ajustar por reto):**

- Se calcula `z-score` del desempeño contra una **norma piloto** (los primeros 50 estudiantes de tipificación). Hasta tener norma propia, se usa norma provisional acordada con las investigadoras.
- Mapeo: `z ≤ −1` → 3 (Siempre presenta dificultad); `−1 < z ≤ −0.3` → 2 (Frecuente); `−0.3 < z ≤ 0.3` → 1 (A veces); `z > 0.3` → 0 (Nunca).
- Esto se **calibra por reto y por nivel educativo** y queda en `rubric.ts`.

**Sistema de desbloqueo (linear vs. branching):**

- Para **piloto institucional (no competitivo)**, recomendación clara: **lineal por dimensión, paralelo entre dimensiones**. El estudiante puede elegir libremente entre las 3 torres/zonas/agencias (Letras/Números/Enfoque), pero dentro de cada una los retos se desbloquean en orden 1→10. Esto:
  - Evita comparación entre estudiantes (sin leaderboard global, ético en menores y compatible con Ley 1581 que impide datos sensibles públicos).
  - Genera una *progresión coherente psicométricamente* (el reto 5 asume que el 1-4 ya se hicieron).
- **Insignias / achievements: SÍ**, pero **personales y no comparativas** ("Maestro de la torre de Letras", "Detective ortográfico", etc). NO leaderboards. NO ranking de aulas.
- **Estrellas por reto:** 1-3 estrellas según desempeño, con copy reforzante ("¡Sigue practicando!" en 1 estrella, no "Perdiste").

### 3. Fundamento pedagógico y científico por dimensión

#### Dislexia — paradigmas a implementar

| Paradigma | Reto IIDTA donde se implementa | Cita clave |
|---|---|---|
| Discriminación visual b/d/p/q (efecto espejo) | Caza de letras espejo (P-D1) | Hulme & Snowling (2009) — Developmental Dyslexia |
| Rapid Automatized Naming (RAN) | Eco lector (P-D8), Radar de fluidez (M-D4) | Wolf & Bowers (1999), Patel et al. — DOI 10.3389/fpsyg.2020.00928 |
| Conciencia fonológica (sílabas, fonemas) | Rompecabezas de sílabas, Laboratorio grafema-fonema (S-D7) | Snowling (1981); Peterson & Pennington (2012) DOI 10.1016/S0140-6736(12)60198-6 |
| Fluidez lectora (palabras/min con pacing) | Carrera de lectura, Eco lector | Wimmer, Mayringer & Landerl (2000) |
| Comprensión inferencial | Laberinto de comprensión, Escape de comprensión (M-D3) | PROLEC-R (Cuetos, Rodríguez, Ruano) |
| Detección de errores ortográficos | Detective ortográfico (S-D5), Detector de errores editoriales (M-D2) | Marinelli et al. — DOI 10.1007/s00221-022-06530-w |
| Doble déficit (fonológico + nombramiento rápido) | Combo Eco lector + Detective de palabras | Wolf & Bowers (1999) |

**Para el español (ortografía transparente):** la consistencia del español hace que la **fluidez** y el **RAN** sean marcadores más sensibles que la decodificación pura (Reis et al., 2020). El Dytective de Rello et al. (2020) está validado en español con >200 000 usuarios → es referencia obligada.

#### Discalculia — paradigmas a implementar

| Paradigma | Reto IIDTA | Cita clave |
|---|---|---|
| Number sense / comparación numérica | Caza de números, Carrera de sumas, Mapa de magnitudes (M-C2) | Dehaene (1997) The Number Sense; Wilson et al. (2006) DOI 10.1186/1744-9081-2-19 |
| Subitización | Bingo matemático, Caza de números (modo flash) | Butterworth (2010) DOI 10.1016/j.tics.2010.04.007 |
| Valor posicional | Camino del valor posicional, Ruta del valor posicional | Geary (2004) DOI 10.1177/00222194040370010201 |
| Recuperación de hechos (fact retrieval) | Torre de tablas, Batalla de signos | Geary subtipo "semantic memory" |
| Resolución de problemas verbales | Mercado matemático, Laberinto de problemas, Simulador de presupuesto real | Kaufmann & Aster (2012) DOI 10.3238/arztebl.2012.0767 |
| Línea numérica mental | Puzzle de series numéricas, Mapa de magnitudes | Siegler & Booth (2004) |
| Patrones algebraicos | Laboratorio de patrones, Reconstrucción del algoritmo | Geary subtipo "procedural" |
| Memoria de trabajo visuoespacial | Memoria numérica, Misión coordenadas | Raghubar, Barnes & Hecht (2010) DOI 10.1016/j.lindif.2009.10.005 |

**Instrumentos de referencia:** TEMA-3 (Test of Early Mathematics Ability), BDE-2 (Battery for Dyscalculia Evaluation), ZAREKI (Neuropsychological Test Battery for Number Processing).

#### TDAH — paradigmas a implementar

| Paradigma | Reto IIDTA | Cita clave |
|---|---|---|
| Go/No-Go | Semáforo de impulsos, Cazador de distractores, Control de impulsos en escena | Bezdjian et al.; Conners CPT-3 |
| Stop-Signal Task | Misión espera y responde, El turno exacto | Logan & Cowan (1984); Verbruggen & Logan (2008) |
| Sustained Attention to Response Task (SART) | Carrera del silencio, Sprint de enfoque, Foco maestro | Robertson et al. (1997) |
| n-back (working memory) | Memoria con distractores, Pesca de atención (versión n-back) | Bock et al. — DOI 10.3389/fpsyt.2020.00585 |
| Atención selectiva con distractores | Busca y completa, Encuentra el cambio | Attention Network Test (Fan et al., 2002) |
| Planificación / checklist (función ejecutiva) | Torre de instrucciones, Checklist de misión, Base organizada | Vanderbilt scale items |
| Inquietud motora compensatoria | Pausa activa inteligente | Rapport et al. (2009) |
| Auto-regulación emocional | Semáforo de autorregulación | Barkley (1997) |

**Crítico (ya señalado en hallazgos):** Conners CPT-3 como predictor único de TDAH es **débil** (Callan et al., 2024, DOI 10.1177/10870547231223727). Los juegos refuerzan, no reemplazan, el cuestionario Vanderbilt/Conners parental que las investigadoras ya usan. Documenta esto en limitaciones del proyecto.

**Mapeo videojuego → ítem Likert (RF-22):** cada reto produce un puntaje crudo (composite de exactitud, latencia, omisiones, comisiones según corresponda) que se convierte a 0-3 vía la rúbrica calibrada con la norma piloto. El puntaje del reto sustituye o complementa la respuesta del estudiante al ítem correspondiente del IIDTA. Conservar **ambos** (autoreporte + behavioral) y reportarlos paralelos al investigador.

### 4. Diseño visual por nivel educativo

#### Primaria (6-11) — "Academia de Héroes del Saber"

- **Paleta:** índigo `#4F46E5` (Letras) / esmeralda `#10B981` (Números) / coral `#F97316` (Enfoque); blanco hueso `#FAF7F2` de fondo; negro suave `#1F2937` para texto. Tres "torres" claramente diferenciadas por color, con saturación alta pero no neón.
- **Tipografías:** títulos en **Fredoka** o **Baloo 2** (Google Fonts, gratis, redondeadas, alfabetizables); cuerpo en **Nunito**. Tamaño base 18 px (para lectores con dislexia leve, mejor que 16 px).
- **Mascotas:** un personaje por torre (un búho lector, una ardilla matemática, un colibrí del foco). **Genera con DALL-E 3 / Midjourney** una vez y reutiliza; mantén consistencia con LoRA o referencia visual.
- **Assets recomendados:**
  - **Kenney.nl** (CC0) — UI Pack, Toon Characters, Animal Pack: estética coherente, uso comercial sin atribución, ~60 000 assets gratis. Es **literalmente la mejor opción** para tu caso.
  - **Flaticon** — íconos UI con licencia educativa.
  - **Freepik** — ilustraciones de fondos para narrativa (cuidado con la atribución requerida en plan free).
  - **OpenGameArt** (CC-BY/CC0) — efectos sonoros y música ambiental.
- **Animaciones:** muy expresivas pero **breves** (200-400 ms); usa Framer Motion para transitions y Phaser tweens para feedback in-game.

#### Secundaria (11-15) — "Estación Orbital del Aprendizaje"

- **Paleta:** azul espacial `#0F172A` de fondo + cian `#06B6D4` + magenta `#D946EF` + amarillo holográfico `#FACC15` para acentos. Look "ciencia ficción ligera", no Halo.
- **Tipografías:** títulos en **Orbitron** o **Space Grotesk**; cuerpo en **Inter**. Tamaño base 16 px.
- **Narrativa:** los retos son "misiones de bordo" en una estación. El "comandante" (avatar tutor) explica la misión en 1-2 viñetas antes de cada reto.
- **Assets:** Kenney Space Pack, Sci-Fi Pack; sintetizadores chiptune para SFX (OpenGameArt). Para fondos de holograma usar shaders simples Phaser o WebGL post-effects.

#### Media (15-18) — "Agencia Cognitiva"

- **Paleta:** grafito `#0A0A0F` + ámbar `#F59E0B` (acentos clave) + carmín `#DC2626` (errores) + esmeralda apagado `#059669` (aciertos) + frost `#94A3B8` para elementos secundarios. **Cero infantilismo, cero corporativo aburrido**: tipo "thriller minimalista" estilo *True Detective* + Apple TV.
- **Tipografías:** títulos en **JetBrains Mono** o **IBM Plex Mono** (look investigador/código), cuerpo en **Inter** o **Manrope**. Subrayado funcional, no decorativo.
- **Narrativa:** **eres un agente novato de la Agencia Cognitiva**. Cada reto es un "expediente" (escape room, simulación, investigación). Los datos del juego son "evidencia clasificada" que el sistema analiza al final.
- **Assets:** menos assets gráficos, más **tipografía + UI minimalista + microinteracciones** (Framer Motion). Algunos retos pueden ser puramente texto + decisiones (Decisión narrativa, Novela interactiva). Para vibe usa fondos generados con CSS gradients animados, no PNGs pesados.
- **Crucial:** ningún emoji infantil, ningún Comic Sans, ningún color saturado. Si no encuentras assets coherentes, **es mejor minimalismo tipográfico que sprites cartoon mal pegados**.

### 5. Integración con plataforma y datos

**Endpoints Next.js (Route Handlers) que necesitas crear:**

```
POST /api/session/start         → crea sesión, retorna session_id
POST /api/telemetry             → recibe TelemetryEvent[], persiste
POST /api/challenge/result      → resultado final del reto + puntaje Likert
GET  /api/student/[id]/progress → estado de retos completados (max 2 intentos)
POST /api/consent               → registra consentimiento Habeas Data
```

**Payload `challenge/result` (cubre RF-23):**

```ts
{
  studentId: string,         // código del estudiante
  date: ISO8601,
  challengeId: string,       // P-DC-01-caza-de-numeros
  level: "primaria" | "secundaria" | "media",
  dimension: "dislexia" | "discalculia" | "tdah",
  itemCode: string,          // C1..C5, D1..D5, T1..T5
  attempt: 1 | 2,            // P-21
  rawScore: number,
  likertScore: 0|1|2|3,      // RF-22
  classification: "Nunca"|"A veces"|"Frecuente"|"Siempre",
  semester: string,
  responseTimeMs: number,
  feedback: { difficulty: "easy"|"medium"|"hard", liked: boolean },
  metrics: { accuracy, omissions, commissions, meanRT, sdRT } // por dimensión
}
```

**Persistencia local + sync (Dexie + Background Sync):**

```ts
// db.ts
const db = new Dexie("iidta");
db.version(1).stores({
  pendingResults: "++id, studentId, challengeId, syncedAt",
  consents: "studentId",
  progress: "[studentId+challengeId]"
});
```

- Cada `challenge/result` se escribe **primero a Dexie**, luego se intenta POST. Si falla (offline), entra a `pendingResults`.
- Service Worker con Workbox `BackgroundSyncPlugin` reintenta cuando vuelve la conexión.
- El UI muestra un badge "🔄 N resultados pendientes de enviar".
- Al login, sincroniza progreso del servidor con local.

**Compliance Ley 1581 / Habeas Data:**

- El art. 7 protege especialmente a menores. Para niños/as **< 18 años el consentimiento lo otorga el representante legal**, pero el niño tiene derecho a ser escuchado (Art 12 CIDN reflejado en Decreto 1377/2013).
- **Pantallas necesarias antes de jugar:**
  1. **Asentimiento del menor** (lenguaje adaptado por edad): "Vamos a jugar y tu computadora va a guardar cómo te fue. Eso ayuda a tus profes y a científicos a hacer mejores juegos. ¿Quieres jugar? [SÍ] [Más info]". En primaria con ícono y voz.
  2. **Consentimiento previo del acudiente** (firmado en papel o e-firma digital ANTES del piloto, gestionado por la USCO/UDES) que cubre: finalidad (investigación), datos recolectados (puntajes, latencia, semestre, código institucional NO nombres), tiempo de retención, derecho ARCO.
  3. **Aviso de privacidad** accesible desde menú principal, con datos del responsable (USCO – facultad respectiva), encargado (UDES si aplica), oficial de protección de datos.
- Los datos almacenados deben usar **código de estudiante anónimo** (hash o ID institucional), nunca nombre/apellido en payload.
- **Datos sensibles** (Art. 5 Ley 1581): los datos relativos a salud lo son; un puntaje de TDAH/dislexia/discalculia se considera dato relacionado con salud mental → requiere autorización **explícita**, finalidad específica, y NO puede transferirse a países sin nivel adecuado de protección.
- Servidor: si usas Vercel (US), técnicamente hay transferencia internacional. Cubre con cláusula contractual y autorización explícita. Alternativa: hostear DB en proveedor con DC en Latinoamérica (Supabase São Paulo, AWS São Paulo).

**Anti-trampa simple (suficiente para piloto):**

- `document.visibilityState !== "visible"` → pausa el reto, marca el evento.
- Tiempo entre clics: si <50 ms entre clics consecutivos → flag bot.
- Patrón de respuestas: si todas las respuestas son la primera opción → flag.
- Detección de DevTools abiertos (heurística por `outerWidth - innerWidth > 160`) → flag, no bloquea.
- Estos flags solo se reportan al investigador, no se usan para puntuar (privacidad).

### 6. Plan de despliegue

**`next.config.js` recomendado:**

```js
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    runtimeCaching: [
      { urlPattern: /^https:\/\/cdn\.iidta\.usco\.edu\.co\/.*/, handler: "CacheFirst",
        options: { cacheName: "assets", expiration: { maxAgeSeconds: 60*60*24*30 }}},
      { urlPattern: /\/api\//, handler: "NetworkFirst" }
    ]
  }
});
module.exports = withPWA({
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.iidta.usco.edu.co" }],
    formats: ["image/webp"]
  },
  experimental: { optimizePackageImports: ["framer-motion","howler"] },
  webpack(config) {
    config.module.rules.push({ test: /\.(ogg|mp3|wav)$/, type: "asset/resource" });
    return config;
  }
});
```

**Variables de entorno (.env):**

```
DATABASE_URL=postgres://...     # Supabase / Neon
NEXT_PUBLIC_CDN_URL=https://...
NEXT_PUBLIC_TELEMETRY_BATCH=10
INSTITUTIONAL_API_TOKEN=...     # para integrar con plataforma USCO
HABEAS_DATA_VERSION=2026-05
```

**Renderizado:**

- Landing, login, dashboard de profesor → **SSG/ISR** (rápidos, cacheables).
- Páginas de reto (`/reto/[level]/[code]`) → **client component** (`"use client"`) con `dynamic(() => import(...), { ssr: false })`. Phaser requiere `window`.
- API Routes → Edge Runtime para telemetry (latencia baja), Node runtime para integraciones con DB.
- **No usar SSR para canvas games** — bug garantizado.

**Vercel Hobby vs Pro vs alternativas (decisión informada):**

| Plan | Bandwidth | Edge Req | Función | Uso comercial | Costo | Recomendación |
|---|---|---|---|---|---|---|
| Vercel Hobby | 100 GB | 1 M | 1 M inv | **NO** (Fair Use prohíbe) | $0 | Solo prototipo personal del dev |
| Vercel Pro | 1 TB + $0.15/GB | 10 M + $2/M | gen | Sí | **$20 USD/mes/seat** + pago por uso | Recomendado para piloto institucional |
| **Cloudflare Pages** | **Ilimitado** | 100 K req/día free | Workers free 100K/día | Sí | $0 free, $5/mes Pro | **PLAN B preferido si presupuesto cero** |
| Netlify Free | 100 GB | 125 K func | gen | Sí | $0 | Bandwidth similar a Vercel pero allows commercial |
| Railway / Render | variable | — | always-on | Sí | $5+/mes | Backend tradicional, no edge |

**Decisión recomendada:** **Vercel Pro durante el piloto** (3-6 meses, ~$60-120 USD totales) porque:
1. Tu dev sabe Next.js, Vercel es el deploy más fluido.
2. Pro elimina restricción comercial.
3. Si presupuesto = 0, **mover a Cloudflare Pages** funciona pero requiere ajustes (no Image Optimization nativo, edge runtime ligeramente distinto). Documenta esto pero no migres prematuramente.

**Dominio y caching:**

- Dominio: pide a TIC de USCO un subdominio `iidta.usco.edu.co`; CNAME a `cname.vercel-dns.com`.
- Edge caching: estatic assets `Cache-Control: public, immutable, max-age=31536000`; HTML `s-maxage=60, stale-while-revalidate=600`.
- ISR para landing y guías docentes; SSG para términos legales.

### 7. Plan de construcción escalonado

**Estimación realista por reto (después del MVP demo set):**

| Tipo de reto | Horas dev | Razón |
|---|---|---|
| Arcade simple (Caza de números, Pesca de atención) | **3-4h** | Reusas BaseScene + plantilla "spawner aleatorio" |
| Drag-and-drop (Rompecabezas de sílabas, Mercado matemático) | **4-6h** | Plantilla "drop zones" + lógica validación |
| Memoria/secuencia (Memoria numérica, Sigue la secuencia) | **3-5h** | Plantilla "flash + recall" |
| Comprensión textual interactiva (Detective de palabras, Laberinto de comprensión) | **5-7h** | Más diseño de contenido que código |
| Escape room narrativo (Escape de comprensión, Misión Código de lectura) | **10-15h** | React puro + Framer + lógica de pistas |
| Simulación (Simulador de presupuesto real, Banco de fracciones) | **8-12h** | Modelado del dominio |
| Boss/Final (boss mode de cada torre) | **4-6h** | Composición de mecánicas previas |

**Total estimado del proyecto:**
- 30 retos primaria: ~120-150h
- 30 retos secundaria: ~150-200h
- 30 retos media (más narrativos): ~200-280h
- **Total: 470-630 horas** = ~3 meses de un desarrollador full-time o ~6 meses al 50 %.
- + 80h de core engine, sync, autenticación, dashboard profesor, despliegue.
- **Total proyecto:** ~550-710 h.

**Demo set para la próxima reunión (3-4 semanas, ~80h):**

Construye **9 retos** (uno por dimensión por nivel) que muestren las 3 mecánicas distintas:

| Nivel | Dislexia | Discalculia | TDAH |
|---|---|---|---|
| Primaria | Caza de letras espejo (arcade) | Mercado matemático (drag-drop) | Semáforo de impulsos (Go/No-Go) |
| Secundaria | Detective ortográfico (drag-drop) | Constructor morfológico (drag) → cambia a un reto discalculia simple | Cazador de distractores (n-back) |
| Media | Detector de errores editoriales (texto) | Simulador de presupuesto real (simulación) | Sprint de enfoque (SART) |

Estos 9 demuestran a las investigadoras: (1) que el motor cubre todos los tipos de mecánica, (2) que la estética de cada nivel es distinta y madura, (3) que la telemetría persiste y produce el puntaje Likert del IIDTA, (4) que funciona offline.

**Cronograma sugerido (asumiendo 1 dev medio tiempo, 20h/semana):**

| Semana | Entregable |
|---|---|
| 1 | Scaffolding repo (Turborepo monorepo: `apps/web` + `packages/core` + `packages/games`); Phaser template Next.js integrado; ConsentScreen funcional; Dexie + sync básico |
| 2 | BaseScene + ChallengeRunner + 1er reto (Caza de letras espejo P-D1) navegable end-to-end; rúbrica + Likert funcionando; persistencia y telemetría OK |
| 3 | 4 retos más (1 drag-drop primaria, 1 Go/No-Go primaria, 1 drag-drop secundaria, 1 narrativo media) |
| 4 | Cerrar 9-reto demo set; deploy en Vercel Pro o CF Pages; preparar reunión con métricas reales jugadas |
| 5-6 | Reunión investigadoras → ajustes; comenzar producción masiva primaria |
| 7-12 | 30 retos primaria completos |
| 13-18 | 30 retos secundaria |
| 19-26 | 30 retos media (más esfuerzo narrativo) |
| 27-28 | QA, normas piloto, calibración rúbricas, dashboard profesor |
| 29-30 | Piloto controlado 50-200 estudiantes |

**Repositorio Git — monorepo Turborepo:**

```
iidta/
├── apps/
│   └── web/                    # Next.js 14
├── packages/
│   ├── core/                   # @iidta/core
│   ├── games-primaria/         # @iidta/games-primaria
│   ├── games-secundaria/       # @iidta/games-secundaria
│   ├── games-media/            # @iidta/games-media
│   ├── ui/                     # @iidta/ui (botones, paneles, mascotas)
│   ├── eslint-config/
│   └── tsconfig/
├── turbo.json
└── pnpm-workspace.yaml
```

Por qué monorepo: cada nivel educativo es un paquete que puedes versionar separadamente y diferentes tesistas/desarrolladores pueden trabajar en paralelo sin pisarse. Vercel detecta Turborepo automáticamente y solo rebuilda lo cambiado.

**Stack auxiliar definitivo:**

| Decisión | Sí/No | Justificación |
|---|---|---|
| TypeScript estricto | **SÍ** obligatorio | 90 retos sin tipos = pesadilla de mantenimiento |
| Tailwind 3 | **SÍ** | UI rápida; coherencia visual por design tokens en `tailwind.config.ts` |
| Zustand | **SÍ** | Estado global ligero (sesión, progreso, audio settings) |
| Redux | **NO** | Overkill |
| Framer Motion | **SÍ** | Narrativa media + transiciones primaria |
| Howler | **SÍ** | Audio sprites para SFX, fácil pause global |
| Dexie | **SÍ** | IndexedDB con buena DX |
| Drizzle ORM + Postgres (Supabase) | **SÍ** | DB para servidor; Supabase tiene plan free generoso (DC São Paulo cumple residencia LATAM) |
| NextAuth.js / Auth.js | **SÍ** | Login institucional; soporta SAML si USCO lo provee |
| Sentry | Sí, opcional | Tracking de errores en producción ($0 plan dev) |
| Posthog / Plausible | Plausible | Analytics privacy-friendly compatible Habeas Data |
| Zod | **SÍ** | Validar payloads telemetry; catch errores antes de DB |

### 8. Recursos y referencias

**Plataformas similares analizadas:**

- **Khan Academy Kids** — usa React Native; arquitectura monorepo iOS+Android+web; design system Wonder Blocks open source ([blog.khanacademy.org](https://blog.khanacademy.org/our-transition-to-react-native/)). Lección: monorepo con design system desde el día 1 paga dividendos.
- **Cognifit** — más de 30 juegos web HTML5; ensayo clínico actual (NCT06766149) en niños de Hong Kong evaluando ejecutiva. Lección: el modelo "evaluación inicial → entrenamiento adaptativo" es validable.
- **Cogmed** — específico para working memory en TDAH; backed por Pearson. Evidencia mixta (ver Conversation, 2017). Lección: declarar honestamente las limitaciones.
- **Lumosity** — multado por FTC en 2016 por claims sin evidencia. **NO copies sus claims**; sé conservador en lo que prometes.
- **Dytective (Rello et al., 2020)** — Spanish dyslexia screening, 200 K usuarios, ML, recall >78 % en niños. Es el modelo más cercano a tu proyecto.

**Estudios clave (con DOI verificable, 2020-2025):**

| Autores | Año | DOI | Relevancia |
|---|---|---|---|
| Rello, Baeza-Yates et al. | 2020 | 10.1371/journal.pone.0241687 | Dytective — gamified dyslexia screening en español, machine learning |
| Mauti et al. | 2023 | 10.3390/app13074512 | Revisión sistemática SG para literacia, PRISMA |
| Yildirim & Surer | 2021 | 10.2196/25997 | Adaptive serious games para SLD: usabilidad y aceptación |
| Wilson, Dehaene et al. | 2006 | 10.1186/1744-9081-2-19 | The Number Race — fundacional para discalculia gamificada |
| Wilson, Dehaene et al. | 2006 | 10.1186/1744-9081-2-20 | Open trial Number Race — efficacy data |
| Keshav, Vahabzadeh, Sahin et al. | 2019 | 10.3390/children6060072 | Correlación juego AR ↔ medidas clínicas TDAH |
| Callan et al. | 2024 | 10.1177/10870547231223727 | Limitaciones del CPT-3 como predictor único TDAH |
| Park et al. (Attention Slackline) | 2025 | en PMC 12091841 | Validación serious game TDAH en niños 6-11 (no en adolescentes) |
| Personalized Game-Based Content | 2024 | en PMC 11673005 | Hallazgo: gráficos llamativos pueden perjudicar a niños con TDAH |
| Geary | 2004 | 10.1177/00222194040370010201 | Subtipos de dyscalculia |
| Peterson & Pennington | 2012 | 10.1016/S0140-6736(12)60198-6 | Developmental dyslexia — Lancet review |
| Butterworth | 2010 | 10.1016/j.tics.2010.04.007 | Foundational numerical capacities |
| Shaikh et al. (review) | 2026 (online 01/14) | 10.3389/fbioe.2025.1672718 | Revisión sistemática reciente serious gaming + eye tracking en NDD |
| Patel et al. RAN/dyslexia | 2020 | 10.3389/fpsyg.2020.00928 | RAN como predictor en portugués (relevante para español) |

**Para Vygotsky/Csikszentmihalyi/Wood-Bruner-Ross** (clásicos sin DOI):
- Vygotsky, L. S. (1978). *Mind in Society*. Harvard University Press.
- Csikszentmihalyi, M. (1990). *Flow: The Psychology of Optimal Experience*. Harper & Row.
- Wood, D., Bruner, J. & Ross, G. (1976). *The role of tutoring in problem-solving*. Journal of Child Psychology and Psychiatry, 17, 89-100. DOI 10.1111/j.1469-7610.1976.tb00381.x.

**Activos gráficos/audio de costo cero o bajo:**

| Recurso | Licencia | Uso |
|---|---|---|
| **Kenney.nl Game Assets All-in-1** | CC0 | $20 USD opcional; 60 000+ assets cohesivos. **Comprar.** |
| **OpenGameArt.org** | CC0 / CC-BY | SFX, música, sprites |
| **Freesound.org** | CC0 / CC-BY | Efectos de sonido específicos |
| **Flaticon (premium)** | educativa | Íconos UI consistentes |
| **Google Fonts** | OFL | Tipografías citadas |
| **Lottiefiles free** | varias | Animaciones JSON ligeras para feedback |

---

## Recommendations

### Acción inmediata (esta semana — antes de la próxima reunión)

1. **HOY:** crea repo Turborepo con `npx create-turbo@latest` + `apps/web` (Next.js 14 App Router con TypeScript) + `packages/core`. Sube a GitHub privado USCO/UDES.
2. **DÍA 1-2:** integra el [template oficial Phaser+Next.js](https://github.com/phaserjs/template-nextjs) en `apps/web` (adaptar a App Router). Verifica que un Phaser scene "Hello World" carga con `dynamic({ ssr: false })`.
3. **DÍA 3:** Define el contrato `ChallengeManifest`, `BaseScene`, `TelemetryEvent`, `LikertRubric` en `packages/core/src/`. **Este es el contrato que sostendrá los 90 retos**: invierte tiempo aquí, no lo escatimes.
4. **DÍA 4:** integra Dexie + cola de sync + Service Worker (`@ducanh2912/next-pwa`). Verifica que un evento generado offline se envía cuando vuelve la conexión.
5. **DÍA 5:** ConsentScreen Habeas Data + flujo "asentimiento del menor" + persistencia de versión consentida.
6. **SEMANA 2:** primer reto end-to-end (Caza de letras espejo P-D1). Mide tiempo real de implementación → recalibra estimaciones.
7. **SEMANA 3:** 4 retos más (1 drag-drop, 1 Go/No-Go, 1 drag-drop secundaria, 1 narrativo media — el de media debe verse "no infantil").
8. **SEMANA 4:** completar demo set 9 retos, deploy preview en Vercel, registro completo de un estudiante pasando los 9, **screenshots para reunión**.

### Cómo convencer a las investigadoras en la próxima reunión

Lleva **3 cosas** (en este orden):

1. **Demo navegable real**: laptop o tablet con los 9 retos. Que jueguen una niña/adolescente real (un sobrino o estudiante voluntario) frente a ellas. Nada vende como ver a un niño riéndose mientras hace Go/No-Go.
2. **Tabla de equivalencia psicométrica**: muestra cómo el puntaje crudo de "Caza de letras espejo" se mapea a 0-3 Likert según norma piloto provisional, y compara con la respuesta del ítem D1 del IIDTA-P del mismo niño. Si correlacionan razonablemente (incluso con N=5 piloto), tienes argumento de oro para defender el enfoque.
3. **Documento de 2 páginas con limitaciones**: "los videojuegos NO diagnostican; son una fuente complementaria de evidencia behavioral que el clínico interpreta junto con el cuestionario validado". Esto te blinda contra críticas de "¿pero esto reemplaza el instrumento?".

### Prioridad de retos para la fase 2 (después del demo)

Construye los retos **en orden de mayor impacto pedagógico × menor esfuerzo dev**:

| Prioridad | Retos | Razón |
|---|---|---|
| Alta | Todos los **arcade simples** (Caza de números, Pesca de atención, Semáforo de impulsos…) | 3-4h cada uno, demuestran progreso rápido |
| Alta | Los 5 retos que **mejor mapean al ítem Likert** (uno por sub-dimensión por nivel) | Cubrir el instrumento completo lo antes posible |
| Media | Drag-and-drop / memoria | Plantillas reutilizables |
| Baja | Escape rooms y simulaciones de media | Más esfuerzo, pero necesarios para credibilidad con adolescentes |

### Umbrales que deberían cambiar tus decisiones

- **Si bandwidth Vercel supera 60 GB/mes** → mueve YA assets a Cloudflare R2 / Bunny.
- **Si las investigadoras dicen "no sirve la rúbrica"** → la rúbrica vive en `rubric.ts` por reto y es ajustable sin recompilar; calibra con su norma de 50 estudiantes.
- **Si dev solo tiene <10 h/semana** → reduce a 60 retos (20 por nivel) o a 45 (5 por dimensión por nivel) y publica una v1 honesta.
- **Si Vercel suspende tu Hobby por uso institucional** → ya tendrás backup en Cloudflare Pages listo (mismo `next build`).
- **Si la USCO no aprueba transferencia internacional de datos** → migra DB a Supabase São Paulo y/o despliegue en Cloudflare LATAM, mantiene Next.js export estático para frontend.

---

## Caveats

- **La literatura específica de juegos digitales validados para detección de TDAH en español/Latam es escasa.** Los estudios más sólidos están en inglés. Tu proyecto puede convertirse en una contribución original — pero también significa que las normas piloto deben construirse con cuidado y los puntos de corte ajustarse a la población colombiana, no copiar valores de Conners CPT-3 estandarizado en EE. UU.
- **Los "brain training" tipo Lumosity/Cogmed tienen evidencia mixta** sobre transferencia y mejora cognitiva real (FTC settled $2M con Lumosity en 2016). **No prometas** que jugar mejora dislexia/discalculia/TDAH; promete *detección* y *evidencia behavioral complementaria* — eso sí está respaldado.
- **El template oficial Phaser-Next.js (marzo 2024)** envía un ping anónimo a `gryzor.co` por build. Es trivial pero está bien que lo sepas y lo deshabilites en producción si tu compliance officer lo requiere (`npm run build-nolog`).
- **Vercel Hobby Fair Use:** el riesgo de suspensión es real para proyectos institucionales. La SIC podría considerar problemático que datos de menores colombianos pasen por edge nodes en EE. UU. sin transferencia documentada. **No obvies este punto** con la coordinación legal/ética de USCO.
- **El Conners CPT-3 como predictor único es débil** (Callan et al., 2024). Aplica también a tus juegos: nunca presentes un puntaje de 1 reto como diagnóstico. El instrumento IIDTA con sus 15 ítems × 3 dimensiones (alpha > 0.80) **sigue siendo el ancla psicométrica**; los juegos lo apoyan, no lo sustituyen.
- **El estudio Park (Attention Slackline 2025)** encontró que el juego discrimina TDAH en niños 6-11 pero **NO en adolescentes** (efectos de techo, estrategias compensatorias). Espera resultados similares: probablemente tu instrumento de primaria detectará mejor que el de media. Reporta esto como hallazgo, no como falla.
- **El estudio personalizado de TDAH (PMC 11673005, 2024)** sugiere que en TDAH específicamente, gráficos llamativos pueden perjudicar el desempeño. Dilo tal cual: el menú principal y la estética macro pueden ser visualmente atractivos (engagement), pero **dentro de los retos TDAH la pantalla de tarea debe ser limpia**, baja distracción. Esto es contraintuitivo para alguien que pidió "más llamativos" pero es defendible con cita.
- **La estimación de 470-630 horas asume reuso agresivo de plantillas**. Si el dev empieza cada reto desde cero, fácilmente se duplica. **Invertir 2 semanas en el `core engine` ahorra 200+ horas más adelante**: no negocies este tiempo.
- **No existe la "norma piloto" hasta que la corras.** El primer despliegue con 50 estudiantes es estrictamente para construir norma; los puntajes Likert generados antes de la calibración son provisionales. Las investigadoras deben aceptar este orden temporal.
- **La Ley 1581 está en proceso de modernización (2025-2026)** según foro SIC noviembre 2025. Mantente atento a si se baja la edad de consentimiento autónomo (propuesta de 14+ años). Mientras no se reforme, sigue rigiendo el régimen actual de consentimiento del representante legal.