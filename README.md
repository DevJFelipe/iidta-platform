# IIDTA Platform

Plataforma web de **detección temprana de trastornos del aprendizaje** (Dislexia, Discalculia, TDAH) para la Universidad Surcolombiana (USCO) y UDES, Colombia. Piloto institucional 2026 H2.

> Este repositorio contiene los **90 videojuegos educativos** que se integran a la plataforma principal, expuestos como una aplicación Next.js separable.

---

## Stack

| Capa      | Tecnología                                    |
| --------- | --------------------------------------------- |
| Framework | Next.js 14 (App Router) + TypeScript estricto |
| UI        | React 18 + Tailwind CSS 3                     |
| Monorepo  | Turborepo + pnpm workspaces                   |
| Tooling   | ESLint 8, Prettier 3, EditorConfig            |

> Las librerías de runtime (Phaser, Howler, Dexie, Framer Motion, Zustand, Zod, next-pwa, Supabase) se agregan en fases posteriores. Este scaffolding **solo** establece la estructura.

---

## Estructura

```
iidta-platform/
├── apps/
│   └── web/                    # Next.js 14 App Router
├── packages/
│   ├── core/                   # @iidta/core — engine, telemetría, scoring
│   ├── games-primaria/         # @iidta/games-primaria — 30 retos (6-11 años)
│   ├── games-secundaria/       # @iidta/games-secundaria — 30 retos (11-15)
│   ├── games-media/            # @iidta/games-media — 30 retos (15-18)
│   ├── ui/                     # @iidta/ui — componentes compartidos
│   ├── eslint-config/          # @iidta/eslint-config — presets ESLint
│   └── tsconfig/               # @iidta/tsconfig — presets TS
├── turbo.json
├── pnpm-workspace.yaml
└── CLAUDE.md                   # Contexto persistente para Claude Code
```

---

## Prerequisitos

- **Node.js** ≥ 20.11.0 (recomendado 20.11.1, ver `.nvmrc`)
- **Corepack** habilitado (incluido con Node ≥ 16.13)
- **Git**

```bash
# Verificar Node
node --version  # ≥ v20.11.0

# Habilitar corepack y activar pnpm pinneado
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm --version  # 9.15.0
```

---

## Setup

```bash
git clone <repo-url>
cd iidta-platform
pnpm install
```

---

## Comandos

| Comando             | Descripción                                        |
| ------------------- | -------------------------------------------------- |
| `pnpm dev`          | Arranca Next.js en `http://localhost:3000` con HMR |
| `pnpm build`        | Build de producción de todos los packages          |
| `pnpm lint`         | ESLint en todo el monorepo                         |
| `pnpm typecheck`    | `tsc --noEmit` en todos los packages               |
| `pnpm format`       | Aplica Prettier a todo el código                   |
| `pnpm format:check` | Verifica formato sin escribir                      |
| `pnpm clean`        | Borra `node_modules` y caches de Turbo             |

---

## Compliance — Habeas Data (Ley 1581 Colombia)

Esta plataforma trata **datos sensibles de menores** (puntajes relacionados con TDAH, dislexia, discalculia). Restricciones críticas:

- **No** almacenar nombres ni apellidos de estudiantes — solo código institucional anónimo.
- Requiere **asentimiento del menor** + **consentimiento del acudiente** firmado en papel/e-firma.
- Datos en residencia LATAM (Supabase São Paulo) durante el piloto.
- Aviso de privacidad accesible desde la home en todo momento.

Más detalles en `CLAUDE.md` y `documents/documento-tecnico-del-proyecto.md`.

---

## Estado del proyecto

- [x] Scaffolding monorepo (este commit)
- [ ] PROMPT 2 — runtime de juegos (Phaser, Howler, Dexie, Framer Motion, Zustand)
- [ ] PROMPT 3 — primer reto demo end-to-end
- [ ] Demo set: 9 retos (1 por dimensión × 3 niveles)
- [ ] Reunión 3 con investigadoras UDES
- [ ] Producción de los 81 retos restantes

---

## Equipo

- **Investigadoras UDES:** Rosa, Irlesa
- **Estudiantes investigadoras USCO:** María Mercedes Rincón Valencia, Ana Sofía Nagles García, Jesús David Forero Sánchez
- **Desarrollo de videojuegos:** Felipe Andrade
