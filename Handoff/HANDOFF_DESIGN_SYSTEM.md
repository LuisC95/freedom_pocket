# Handoff: Fastlane Compass Design System

## Overview
Este paquete contiene el design system completo de **Fastlane Compass** — una app web de finanzas personales basada en la filosofía de *The Millionaire Fastlane* (MJ DeMarco). El objetivo de la app es mostrar visualmente la relación dinero-tiempo: cada peso gastado se expresa en horas de vida.

## About the Design Files
Los archivos en este bundle son **referencias de diseño creadas en HTML** — prototipos interactivos que muestran la apariencia y comportamiento intencionados. La tarea es **recrear estos diseños HTML en el codebase existente** (Next.js 14 + Tailwind CSS v3 + shadcn/ui) usando sus patrones establecidos — no copiar el HTML directamente a producción.

El codebase de referencia está en: `github.com/LuisC95/freedom_pocket`

## Fidelity
**High-fidelity**: Los mockups son pixel-perfect con colores finales, tipografía, espaciado e interacciones. El desarrollador debe recrear la UI con fidelidad usando las librerías y patrones existentes del codebase (Tailwind clases, shadcn/ui components, etc.).

---

## Design Tokens

### Colores — Paleta "B Crecimiento"
```css
--color-base:           #F2F7F4;   /* Fondo general */
--color-dark:           #1A2520;   /* Sidebar, hero cards, modales */
--color-card-dark:      #243028;   /* Variante card oscura */
--color-accent:         #2E7D52;   /* CTAs, logo, activo */
--color-accent-hover:   #3A9E6A;   /* Hover, valores positivos */
--color-accent-ghost:   #2E7D5228; /* Fondo ghost nav activo */
--color-surface:        #EAF0EC;   /* Mini cards, tabs bg, empty states */
--color-gold:           #C69B30;   /* Motor AI y gamification ONLY */
--color-gold-bg:        #C69B3018; /* Chip gold background */
--color-gold-border:    #C69B3040; /* Chip gold border */
--color-danger:         #E84434;   /* Errores, gastos, negativo */
--color-danger-bg:      #E8443418;
--color-text-primary:   #141F19;   /* Títulos, valores */
--color-text-secondary: #7A9A8A;   /* Labels, metadata */
--color-text-on-dark:   #F2F7F4;   /* Texto sobre fondos oscuros */

/* Score ring only */
--color-score-mint: #5DCAA5;
```

### Tipografía
| Uso | Fuente | Tamaño | Peso |
|---|---|---|---|
| Valor hero | IBM Plex Mono | 38px | 600 |
| H1 módulo | IBM Plex Sans | 22px | 700 |
| Score ring | IBM Plex Mono | 22px | 700 |
| Valor asset | IBM Plex Mono | 20px | 600 |
| KPI secundario | IBM Plex Mono | 19px | 500 |
| Section heading | IBM Plex Sans | 13px | 600 |
| UI body | IBM Plex Sans | 13px | 500 |
| Metadata | IBM Plex Sans | 11px | 400 |
| Micro label | IBM Plex Mono | 9px | 400, uppercase, `letter-spacing: 0.09em` |

> **Regla crítica**: TODOS los números, valores monetarios y métricas van en IBM Plex Mono. El texto de UI va en IBM Plex Sans. Nunca mezclar.

### Espaciado
`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40px`

### Border Radius
| Contexto | Valor |
|---|---|
| Badges, chips | 5–6px (o `999px` para pill) |
| Inputs, elementos internos | 8px |
| Cards | 12px |
| Hero cards | 16–20px |
| Modales | 20–24px |
| Avatar, logo, nav pills | `999px` |

### Sombras
```css
/* Card estándar */
box-shadow: 0 1px 3px rgba(20,31,25,0.08), 0 1px 2px rgba(20,31,25,0.04);

/* Modal */
box-shadow: 0 20px 60px rgba(0,0,0,0.35);

/* FAB */
box-shadow: 0 4px 16px rgba(46,125,82,0.4);
```

---

## Layout

### Desktop
- Sidebar fijo izquierdo: `width: 68px`, `bg: #1A2520`
- Contenido: `margin-left: 68px`
- Max content width: `max-w-2xl` (672px), `mx-auto`, `p-4`

### Mobile
- Bottom nav flotante: `position: fixed; bottom: 12px; left: 16px; right: 16px; height: 64px; border-radius: 999px; bg: #1A2520`
- Contenido: `padding-bottom: 88px`

---

## Screens / Views

### 1. Mi Realidad (`/mi-realidad`)
**Propósito**: Calcular el "Precio Real por Hora" — verdadero valor de la hora de trabajo incluyendo commute, preparación y carga mental vs ingresos mensuales.

**Layout**: `max-w-2xl`, `p-4`, scroll vertical.

**Componentes**:

#### Hero Card Dark
- `bg: #1A2520`, `border-radius: 20px`, `p: 20px`
- Micro label 9px Mono caps `#3A9E6A`: `"precio real por hora"`
- Valor hero 38px Mono 600 `#3A9E6A`: `"$18.40"`
- Gold chip derecha: `bg: #C69B3018`, `border: 0.5px solid #C69B3040`, `border-radius: 999px`, `p: 4px 10px`, texto 11px Mono `#C69B30`: `"↑ +$2.10 vs 2024"`
- Secondary row: `bg: rgba(46,125,82,0.1)`, `border-radius: 999px`, 19px Mono values (verde/blanco)
- Desglose horas: grid 2–3 cols de mini-pills con `bg: rgba(255,255,255,0.06)`, `border-radius: 8px`

#### Income Sources Section
- Section title 13px Sans 600 + ghost button `"+ Nueva fuente"`
- Cards white con `border: 1px solid #EAF0EC`, `border-radius: 12px`, p-14px
- Badges: `bg: #EAF0EC`, `color: #7A9A8A`, `border-radius: 5px`
- Expandible: `border-top: 1px solid #EAF0EC`, entries con fecha + monto mono verde

**Estados**:
- `sin_datos`: Hero oscuro con valor placeholder, steps de onboarding
- `solo_ingresos`: Mensaje "Agrega tus horas reales"
- `completo`: Precio + delta + desglose completo

---

### 2. Dashboard (`/dashboard`)
**Propósito**: Tracker financiero — neto vs gastos, costo en horas de vida por transacción, presupuestos, recurrentes.

**Hero Card** (idéntico al de Mi Realidad):
- `"retenido este mes"` como label
- Neto como valor protagonista (verde si positivo, rojo si negativo)
- Gold chip: días de autonomía
- Secondary row: ingresos / gastos en 19px
- Barra retención: 6px, verde sobre rojo ghost

**Tabs** (`Gastos / Presupuestos / Recurrentes`):
- `bg: #EAF0EC`, `border-radius: 999px`, `p: 4px`
- Tab activo: `bg: white`, shadow sutil, `border-radius: 999px`

**Tab Gastos**:
- Agrupado por fecha (label micro caps)
- Card white por grupo: `border-radius: 12px`, `p: 0 14px`
- Cada transacción: dot de color de categoría + nombre/categoría + monto 14px Mono bold (verde ingreso / rojo gasto) + chip horas 9px `#C69B30`

**Tab Presupuestos**:
- Row por categoría: nombre + monto/promedio + barra progreso 5px
  - Verde `< 80%`, Gold `80–100%`, Rojo `> 100%`

**Tab Recurrentes**:
- Row: nombre + día + monto + badge estado (`activo`/`pendiente`)

**FAB**:
- `position: fixed`, `bottom: 80px` desktop / `bottom: 80px` mobile, `right: 20px`
- `width/height: 52px`, `border-radius: 999px`, `bg: #2E7D52`
- Icon: `+` blanco, `box-shadow: 0 4px 16px rgba(46,125,82,0.4)`

**Modal AddTransaction** (`bg: #1A2520`, sheet desde abajo):
- Toggle Gasto/Ingreso cambia color de acción (rojo/verde)
- Campo monto: Mono 18px
- Select categoría, date picker

---

### 3. Brújula (`/brujula`)
**Propósito**: Patrimonio neto, vehículos de riqueza (activos/negocios), pasivos, metas de libertad, score Fastlane.

**Hero Card Dark**:
- Score ring SVG: `r=36`, `stroke: #5DCAA5`, `strokeWidth: 6`; número 22px Mono bold
- Métricas: Días libertad (22px Mono), ingreso pasivo (16px), neto (16px `#5DCAA5`)
- 4 Dimension pills: `bg: rgba(255,255,255,0.06)`, `border-radius: 12px`, barra 3px `#5DCAA5`

**Summary pills**: Grid 3 cols, cards white, label micro + valor 15–16px Mono

**Tabs Activos/Negocios**: misma pill tab pattern

**Asset Card** (white card):
- Nombre 13px + badge tipo + badge Líquido (verde)
- Valor 20px Mono 600 `#141F19`
- Yield: 11px muted

**Liability Card** (white card):
- Badge deuda: `bg: #FFF0EF`, `color: #E84434`, `border-radius: 5px`
- Valor 20px Mono 600 `#E84434`

**Freedom Goal Row**:
- Checkbox circular: `border-radius: 50%`, completado `bg: #2E7D52` + checkmark SVG blanco
- Barra progreso 5px `#2E7D52`
- Completado: `bg: #EAF0EC`, texto tachado `#7A9A8A`

---

### 4. Ideas (`/ideas`)
**Propósito**: Sesiones de desarrollo de ideas de negocio con IA.

- CTA primario full-width: `bg: #2E7D52`, `border-radius: 999px`, 13px Sans 600
- Lista de sesiones: cards white con badge status + fecha
- Promo Motor AI: empty state con icono gold

---

## Interactions & Behavior

| Elemento | Hover | Active/Press |
|---|---|---|
| Ghost buttons | `color: #3A9E6A` | — |
| Nav items | `color: #3A9E6A` | `bg: #2E7D5228` |
| Primary button | `bg: #3A9E6A` | — |
| FAB | `bg: #3A9E6A` | `scale(0.93)` |
| Cards | — | — |

- **Pending states**: `opacity: 0.5` + `transition: opacity 0.15s` en el contenedor
- **Modales**: `animation: slideUp 0.2s cubic-bezier(0.32,0.72,0,1)` desde abajo
- **Overlay modal**: `rgba(0,0,0,0.5)`, click fuera cierra

---

## Copy Guidelines
- **Idioma**: Español latinoamericano
- **Casing**: Labels micro en UPPERCASE vía CSS; secciones en minúsculas; módulos capitalizados
- **Pronombre**: Tú/tus (informal)
- **Números**: Siempre en IBM Plex Mono, formato `Intl.NumberFormat` con símbolo de moneda
- **Positivos**: prefijo `+`, color `#3A9E6A`
- **Negativos**: prefijo `−`, color `#E84434`
- **Emoji**: Nunca
- **CTAs**: siempre prefijo `+` (e.g. `+ Nueva fuente`, `+ Agregar`)

---

## Iconografía
- Sin librería de iconos — todos son SVGs inline custom
- `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth={1.8}`, `strokeLinecap="round"`, `strokeLinejoin="round"`
- Tamaño estándar: `w-5 h-5` (20px)
- Activo: `#3A9E6A` | Inactivo: `#6A8A7A`

---

## Assets
- `assets/icons.svg` — SVG sprite con todos los iconos de navegación
- `colors_and_type.css` — Todos los CSS vars y clases base
- `ui_kits/web_app/index.html` — Prototipo interactivo completo (referencia visual)
- `preview/` — 12 cards de preview del design system

---

## Files in this Package
```
design_handoff/
├── README.md                     ← Este archivo
├── colors_and_type.css           ← CSS vars y tokens completos
├── assets/
│   └── icons.svg                 ← SVG sprite de iconos
└── ui_kits/web_app/
    └── index.html                ← Prototipo interactivo (referencia)
```
