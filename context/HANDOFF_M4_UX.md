# HANDOFF — M4 Ideas · UX & Componentes
> Para Claude Code. Leer completo antes de tocar código.
> Basado en mockup aprobado (26-abr-2026).

---

## Contexto

M4 es un embudo de ideas de negocio. La pantalla principal no es una lista plana — es un **tablero de momentum** dividido en zonas. El usuario ve el estado de todas sus ideas de un vistazo, y al entrar a una la app lo guía según la fase en que está.

Filosofía de la pantalla: **claridad + acción**. Cada elemento debe responder "¿qué hago ahora?" sin que el usuario tenga que pensar.

---

## Archivos a crear / modificar

```
src/app/(protected)/ideas/page.tsx         ← página principal (reemplazar stub)
src/modules/ideas/components/
├── IdeasPage.tsx                           ← componente raíz de la pantalla
├── IdeaCard.tsx                            ← card individual (completa y compacta)
├── IdeaDetail.tsx                          ← sheet de detalle (bottom sheet)
├── NewIdeaSheet.tsx                        ← sheet entry point selector
├── ScoreBadge.tsx                          ← badge de score CENTS
└── ActivityDot.tsx                         ← indicador de momentum
```

---

## Sistema de Diseño (respetar exacto)

```
Fuentes:
  IBM Plex Mono  → números, scores, métricas
  IBM Plex Sans  → todo lo demás

Colores:
  Base       #F2F7F4   fondo de página
  Dark       #1A2520   cards destacadas, next step hero
  Acento     #2E7D52   CTAs, activo, botón principal
  Acento+    #3A9E6A   hover, positivos
  Surface    #EAF0EC   fondos secundarios, chips
  Gold       #C69B30   estado committed, alerta media
  Alerta     #E84434   momentum urgente (>14 días sin actividad)
  Texto      #141F19   títulos, valores principales
  TextoSec   #7A9A8A   labels, metadata, subtítulos
  Borde      #e0ebe4   separadores, bordes card

Layout:
  max-width: 480px, centrado
  padding horizontal: 20px
  padding bottom: 100px (espacio para nav)
```

---

## Pantalla principal — 3 zonas

### Zona 0 — Header (siempre visible)

```
┌─────────────────────────────────────────┐
│ Ideas                          + Nueva  │
│ 2 en marcha · 2 por evaluar             │
│                                         │
│ [En marcha] [Por evaluar] [Todas] [...] │
└─────────────────────────────────────────┘
```

**Elementos:**
- `h1` "Ideas" — 22px, IBM Plex Sans 700, `#141F19`
- Subtítulo — 12px, `#7A9A8A` — formato: `{n activas} en marcha · {n nuevas} por evaluar`
- Botón "+ Nueva" — pill verde `#2E7D52`, 13px 600, abre `NewIdeaSheet`
- Tabs de filtro: `En marcha` / `Por evaluar` / `Todas` / `Descartadas`
  - Activo: `bg #141F19`, texto blanco
  - Inactivo: `bg #EAF0EC`, texto `#7A9A8A`
  - Border-radius: 20px

---

### Zona 1 — "EN MARCHA" (ideas con status committed/validando/construyendo/operando)

**Header de sección:**
- Label "EN MARCHA" — 13px, 700, `#141F19`, letter-spacing 0.2px
- Badge contador — `{n} ideas`, 11px 600, color `#2E7D52`, bg `rgba(46,125,82,0.1)`, pill

**IdeaCard completa** (una por idea):
- Fondo: `white`
- Border: `1.5px solid #e0ebe4`
- Border-radius: 14px
- Padding: `16px 18px`
- Barra superior de color: 3px, color del estado, `border-radius: 14px 14px 0 0`
- Hover: border → `#2E7D52`, sombra `0 4px 20px rgba(46,125,82,0.1)`, translateY(-1px)

**Contenido de la card:**

```
[barra de color top]
Título de la idea  [badge estado]
Descripción corta (concept) — 12px, #7A9A8A, 2 líneas max

[score CENTS]  [modelo badge]  [⚠ momentum si aplica]

┌─────────────────────────────────┐
│ Próximo paso: texto del paso    │ ← fondo #F2F7F4, radius 8
└─────────────────────────────────┘
```

**Badge de estado:**
| status | label | color texto | color bg |
|---|---|---|---|
| generated | Nueva | `#7A9A8A` | `rgba(122,154,138,0.12)` |
| committed | Comprometida | `#C69B30` | `rgba(198,155,48,0.12)` |
| validando | Validando | `#3A9E6A` | `rgba(58,158,106,0.12)` |
| construyendo | Construyendo | `#2E7D52` | `rgba(46,125,82,0.18)` |
| operando | Operando | `#1a6e3c` | `rgba(26,110,60,0.2)` |
| discarded | Descartada | `#7A9A8A` | `rgba(122,154,138,0.08)` |

Todos en uppercase, 10px, 600, letter-spacing 0.5px, padding `2px 7px`, border-radius 20px.

**ScoreBadge:**
- `null` → `—/50`, 13px IBM Plex Mono, color `#7A9A8A`
- `0-24` → color `#E84434`
- `25-34` → color `#C69B30`
- `35-50` → color `#2E7D52`
- Siempre bold, letter-spacing -0.5px

**Modelo badge:**
- 11px, `#7A9A8A`, bg `#EAF0EC`, padding `2px 7px`, radius 8px
- Mapeo: `saas→SaaS`, `producto_fisico→Producto`, `servicio→Servicio`, `contenido→Contenido`, `renta→Renta`, `custom→Otro`

**ActivityDot (momentum):**
- Oculto si `lastActivity <= 3 días`
- `4-14 días`: punto `#C69B30` con glow, texto "Xd sin actividad" en `#C69B30`
- `>14 días`: punto `#E84434` con glow, texto "Xd sin actividad" en `#E84434`
- 6px dot, `box-shadow: 0 0 6px [color]`
- 11px, inline-flex

**Flecha de acción:**
- Círculo 28px bg `#EAF0EC`, color `#2E7D52`, símbolo `→`
- Solo visible si hay `nextStep` y status != discarded
- Alineado arriba a la derecha de la card

---

### Zona 2 — "POR EVALUAR" (ideas con status generated)

Misma estructura de header que Zona 1, pero:
- Label "POR EVALUAR"
- Badge: color `#C69B30`, bg `rgba(198,155,48,0.1)`
- **IdeaCard compacta** (sin concept ni next step block)
  - Padding: `12px 14px`
  - Título + badge de estado en la misma línea
  - Debajo: score + modelo + momentum
  - Sin descripción, sin next step

---

### Zona 3 — "DESCARTADAS" (filter="descartadas" o "todas")

- Label "DESCARTADAS", 13px 700, `#7A9A8A`
- Cards compactas
- `opacity: 0.55`, `bg: rgba(234,240,236,0.4)`
- Sin barra de color activa (dot en `#ccc`)
- Sin hover effect activo

---

### Empty state

Cuando filter="activas" y no hay ideas en marcha:

```
        🧭
  Sin ideas en marcha
  Comprometete con una idea
  para empezar a validarla

     [+ Agregar idea]
```
- Centrado vertical y horizontal
- Emoji 40px, título 16px 600 `#141F19`, subtítulo 13px `#7A9A8A`
- Botón verde `#2E7D52`, radius 12px

---

## IdeaDetail (Bottom Sheet)

Se abre al tocar cualquier card no descartada.

**Overlay:**
- `position: fixed, inset: 0, z-index: 50`
- `background: rgba(20,31,25,0.55)`, `backdrop-filter: blur(4px)`
- Click en overlay → cierra

**Sheet:**
- `background: white`, `border-radius: 24px 24px 0 0`
- `max-width: 480px`, centrado, `padding: 28px 24px 40px`
- Entrada: `animation slideUp 0.25s ease`
- Handle: `width 36px, height 4px, bg #e0ebe4, radius 99, margin auto`

**Contenido:**
1. Título + badge de estado (flex, space-between)
2. Concepto — 14px, `#7A9A8A`, lineHeight 1.6
3. Stats row — bg `#F2F7F4`, radius 14px, padding `14px 16px`:
   - "Score CENTS" + ScoreBadge
   - "Modelo" + nombre
   - "Actividad" + `Xd atrás` (color según urgencia, IBM Plex Mono)
4. Next step hero — bg `#1A2520`, radius 14px, padding `14px 16px`:
   - Label "PRÓXIMO PASO" — 11px, `#7A9A8A`
   - Texto — 14px, blanco, 500
5. Botones:
   - "Continuar →" — flex 1, bg `#2E7D52`, blanco, radius 12px, 14px 600
   - "⋯" — 48px ancho, bg `#F2F7F4`, `#7A9A8A`, radius 12px

---

## NewIdeaSheet (Bottom Sheet)

Mismo overlay y estructura de sheet que IdeaDetail.

**Contenido:**
- Título "Nueva idea" — 20px 700
- Subtítulo "¿En qué punto estás?" — 13px `#7A9A8A`
- 3 opciones seleccionables:

| key | icon | label | sub |
|---|---|---|---|
| `sin_idea` | 🧭 | "No sé por dónde empezar" | "La AI te ayuda a encontrar ideas basadas en tus habilidades" |
| `idea_vaga` | 💡 | "Tengo algo en mente pero vago" | "Refinamos juntos hasta que tenga forma" |
| `idea_clara` | 🎯 | "Tengo una idea clara" | "Evaluamos directamente con el método CENTS" |

**Card de opción:**
- Border `2px solid #e0ebe4`, radius 14px
- Seleccionada: border → `#2E7D52`, bg → `#F2F7F4`, checkmark `✓` verde a la derecha
- Contenido: emoji 20px + label 14px 600 + sub 12px `#7A9A8A`

**Botón "Empezar →":**
- Full width, radius 12px, 15px 600
- Sin selección: bg `#e0ebe4`, texto `#7A9A8A`, cursor default
- Con selección: bg `#2E7D52`, texto blanco, cursor pointer

---

## Botón flotante (FAB)

```
position: fixed
bottom: 24px, right: 24px
width/height: 52px, border-radius: 50%
bg: #2E7D52, color: white
font-size: 24px
box-shadow: 0 4px 20px rgba(46,125,82,0.4)
z-index: 40
hover: scale(1.08)
```

Abre `NewIdeaSheet`. Siempre visible excepto cuando un sheet ya está abierto.

---

## Animaciones

```css
@keyframes slideUp {
  from { transform: translateY(40px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

@keyframes fadeIn {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}
```

- Sections de la lista: `fadeIn 0.3s ease`
- Bottom sheets: `slideUp 0.25s ease`
- Card hover: `transition: all 0.18s ease`
- Tabs: `transition: all 0.15s ease`
- FAB hover: `transition: transform 0.15s ease`

---

## Datos que necesita la página

La página necesita llamar a `listIdeas(userId)` al montar y separar los resultados en 3 grupos:

```typescript
const activas    = ideas.filter(i => ["committed","validando","construyendo","operando"].includes(i.status))
const nuevas     = ideas.filter(i => i.status === "generated")
const descartadas = ideas.filter(i => i.status === "discarded")
```

El campo `lastActivity` no existe en DB — calcularlo en el componente:
```typescript
const lastActivity = differenceInDays(new Date(), new Date(idea.updated_at))
```

El campo `nextStep` tampoco existe en DB — se deriva del status:
```typescript
const NEXT_STEP_BY_STATUS = {
  generated:    "Evaluar con CENTS",
  committed:    "Completar evaluación CENTS",
  validando:    "Registrar resultado de validación",
  construyendo: "Completar Deep Dive",
  operando:     null,
  discarded:    null,
}
```

---

## Lo que este handoff NO cubre

- El flujo interno de cada idea (chat con AI, formulario CENTS, deep dive) — se diseña en sesión separada
- La lógica del Motor AI y contexto de usuario — pendiente de diseño
- El mecanismo de autorización early adopters — pendiente de diseño

---

## Notas para Claude Code

1. Respetar paleta y tipografía al pie de la letra — están en el sistema de diseño global
2. `lastActivity` y `nextStep` son campos calculados en cliente, no vienen de DB
3. Los bottom sheets usan `position: fixed` — cuidar que no interfieran con el nav móvil
4. El FAB se oculta cuando hay un sheet abierto (z-index o condicional en render)
5. Usar `createAdminClient()` para el fetch de ideas — nunca SSR client
6. La action `listIdeas` ya existe en `src/modules/ideas/actions/ideas.ts`
