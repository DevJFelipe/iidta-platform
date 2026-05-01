# 🚀 Cómo iniciar el proyecto IIDTA con Claude Code

Este paquete contiene **2 archivos** que te dejan listo para empezar a construir la plataforma de los 90 videojuegos en Claude Code.

---

## 📦 Archivos en este paquete

| Archivo | Para qué sirve |
|---|---|
| `CLAUDE.md` | Contexto persistente del proyecto. Va en la **raíz del proyecto** y Claude Code lo lee cada sesión nueva. Es la "memoria" del proyecto. |
| `PROMPTS_CLAUDE_CODE.md` | Los 5 prompts que tú vas a copiar/pegar en Claude Code, en orden. |

---

## 📋 Pasos a seguir

### Paso 1: Instalar Claude Code (si no lo tienes)

```bash
npm install -g @anthropic-ai/claude-code
```

Verifica:

```bash
claude --version
```

Si te pide login, acepta y vincula tu cuenta de Anthropic.

---

### Paso 2: Crear la carpeta del proyecto

```bash
cd ~/Desktop          # o donde prefieras
mkdir iidta-platform
cd iidta-platform
```

---

### Paso 3: Colocar `CLAUDE.md` en la raíz

Copia el archivo `CLAUDE.md` (de este paquete) a la raíz de `iidta-platform/`:

```bash
cp /ruta/a/CLAUDE.md ~/Desktop/iidta-platform/CLAUDE.md
```

O simplemente arrástralo desde tu explorador de archivos.

**Estructura final esperada:**

```
iidta-platform/
└── CLAUDE.md
```

---

### Paso 4: Iniciar Claude Code en la carpeta

```bash
cd ~/Desktop/iidta-platform
claude
```

Verás el prompt de Claude Code con un cursor parpadeando. Está listo para recibir instrucciones.

---

### Paso 5: Pegar el primer prompt

Abre `PROMPTS_CLAUDE_CODE.md` en tu editor favorito.

**Copia el bloque que dice "PROMPT 1 — Setup del scaffolding monorepo"** (sin los backticks ```), pégalo en Claude Code, y presiona Enter.

Claude Code va a:

1. Leer `CLAUDE.md`
2. Proponerte un plan
3. Esperar tu confirmación antes de codificar

**Cuando estés conforme con el plan, escribe `ok` y presiona Enter.** Empezará a ejecutar comandos y crear archivos.

---

### Paso 6: Verificar que el primer paso funcionó

Cuando termine el PROMPT 1, deberías poder ejecutar:

```bash
pnpm dev
```

Y ver el Next.js corriendo en `http://localhost:3000`.

Si todo está OK, **ya tienes el scaffolding listo**. Pasa al PROMPT 2.

---

### Paso 7: Continuar con los siguientes prompts

En orden: 2, 3, 4, 5.

**Importante:** No saltes prompts. Cada uno asume que el anterior funcionó. Si algo falla en uno, pídele a Claude Code que lo arregle antes de avanzar.

---

## 🎯 ¿Qué tendrás al final del PROMPT 5?

- ✅ Monorepo Turborepo configurado (apps/web + 6 packages)
- ✅ Next.js 14 con TypeScript estricto, Tailwind, ESLint
- ✅ Phaser 3 integrado correctamente
- ✅ Motor base (`@iidta/core`) con BaseScene, ChallengeRunner, scoring, telemetría, persistencia offline
- ✅ Compliance Habeas Data (pantalla de consentimiento)
- ✅ **9 retos del demo set funcionando** (3 niveles × 3 dimensiones)
- ✅ **Deploy preview en Vercel** que las investigadoras pueden probar desde su celular o computador

Eso es exactamente lo que necesitas para la próxima reunión.

---

## ⚠️ Cosas importantes que debes saber

### Sobre el documento de investigación

El documento largo de investigación (el que generé con DOIs y todo) **NO se lo pegas a Claude Code**. Ese documento es **tu referencia personal** para entender el porqué de cada decisión técnica.

`CLAUDE.md` es la versión condensada y ejecutable. Tiene lo esencial sin abrumar a Claude Code.

### Sobre las cuentas externas

En algún momento (PROMPT 5) vas a necesitar:

- **Cuenta de Vercel** (gratis): https://vercel.com/signup
- **Cuenta de Supabase** (gratis): https://supabase.com/dashboard/sign-up
- **Repo Git** (GitHub recomendado): https://github.com/new

Crea estas cuentas con tu correo institucional USCO si es posible. Mejor para auditoría del proyecto.

### Sobre los assets gráficos

Para los sprites de las mascotas, fondos, etc., te recomiendo **comprar el pack Kenney.nl Game Assets All-in-1** ($20 USD opcionales, 60 000 assets coherentes, licencia CC0). Es la mejor inversión que puedes hacer:

https://kenney.itch.io/kenney-game-assets

Si no quieres invertir, los assets gratuitos de OpenGameArt + Kenney free packs alcanzan.

### Sobre el control de costos

Mientras estés construyendo y haciendo demos, todo es gratis (Vercel Hobby, Supabase free, GitHub free).

Cuando llegue el piloto real (segundo semestre 2026), revisa el documento de investigación sección "Vercel Hobby vs Pro" — ahí está el desglose de cuándo conviene pagar y cuánto.

---

## 🆘 Si algo se rompe

**Claude Code se quedó pensando o no responde:** presiona `Ctrl+C`, escribe `claude` de nuevo, y pídele que retome donde quedó leyendo CLAUDE.md.

**Errores raros de Next.js + Phaser:** 95% de las veces es SSR. Pídele a Claude Code que verifique que el componente del juego usa `"use client"` y `dynamic({ ssr: false })`.

**Build de Vercel falla por tamaño:** los assets son demasiado pesados. Pídele a Claude Code que los mueva a Cloudflare R2 o Supabase Storage.

**Te quedas sin tokens / cuota de Claude Code:** espera al siguiente ciclo de facturación, o sube a un plan superior si el proyecto lo amerita.

---

## 📞 Si te trabas

Vuelve aquí (chat con Claude en navegador) y describe el problema. Puedo:

- Diagnosticar errores específicos
- Generar prompts adicionales si los 5 originales no cubren algo
- Ajustar el `CLAUDE.md` si las investigadoras piden cambios
- Revisar el código que Claude Code generó
- Ayudarte a preparar la siguiente reunión

---

¡Suerte! Ahora a construir.
