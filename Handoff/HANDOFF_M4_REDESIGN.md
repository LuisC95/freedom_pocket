# 🧭 HANDOFF · Rediseño M4 — Ideas de Negocio v2

> **Fuente de verdad para implementar el rediseño completo del Módulo 4 de Fastlane Compass.**
> Diseñado en Claude.ai (sesión 29-abr-2026). Implementar en Claude Code o DeepSeek (OpenClaw).
> Este documento reemplaza: `HANDOFF_M4_UNIFIED.md`, `HANDOFF_M4_TYPES.md`, `HANDOFF_M4_ACTIONS.md`, `HANDOFF_M4_AI_LAYER.md`.

---

## 📌 Estado actual y scope

- **M4 actual:** ✅ Completo y funcional (~7,004 líneas) — chat por fases con AI coach
- **Decisión:** REEMPLAZAR COMPLETAMENTE con nuevo diseño
- **Motivo:** el chat AI se siente genérico, lento, y no lleva a acción concreta
- **No hay usuarios con datos** — no hay migración de data, solo código
- **Schema DB existente:** se reutiliza parcialmente + nuevas tablas
- **AIProvider:** se reutiliza intacta (Anthropic ✅ + DeepSeek ✅)
- **Mockup interactivo de referencia:** `m4-rediseno-integrado.jsx` (exportado junto a este handoff)

---

## 🎯 Filosofía del rediseño

### Antes (v1)
- Chat AI con 4 fases (Observar → Definir → Idear → Evaluar)
- Asumía que el usuario tiene una idea
- 40 preguntas antes de llegar a algo concreto
- Sin accountability ni seguimiento

### Ahora (v2)
- **El usuario típico es un empleado, perdido, sin idea clara**
- En vez de preguntar "¿qué idea tienes?", le dice "escucha quejas, anota lo que ves"
- El módulo es un **sistema de 4 pantallas conectadas**, no un chat:
  1. **Mapa de Oportunidades** → entrada personalizada con datos de M1/M2/M3
  2. **Cazador de Problemas** → hábito diario de registrar observaciones reales
  3. **Banco de Ideas** → acumulación y selección
  4. **Sprint** → 5 tareas concretas generadas por AI para una idea específica

### Fundamento
- **Behavioral Activation** — la motivación no precede a la acción, la sigue
- **Lean Startup** — smallest viable experiment
- **"Do things that don't scale"** (Paul Graham) — empezar manual y pequeño
- **The Mom Test** (Rob Fitzpatrick) — escuchar quejas = demanda no satisfecha

---

## 🗺️ Arquitectura de pantallas

```
┌─────────────────┐
│ MAPA            │ ← Entrada al módulo. Usa datos de M1/M2/M3.
│ de Oportunidades│   Pre-genera 3 caminos personalizados.
└────┬───────┬────┘
     │       │
     ▼       ▼
┌────────┐ ┌─────────┐
│CAZADOR │ │ BANCO   │ ← Las dos se alimentan mutuamente.
│Problemas│ │de Ideas │   Cazador genera observaciones → AI detecta patrones → Ideas.
└────┬───┘ └─┬───┬───┘   Mapa también alimenta el Banco directamente.
     │       │   │
     └───────┘   ▼
           ┌──────────┐
           │ SPRINT   │ ← Se activa SOLO desde el Banco, para una idea seleccionada.
           │ 5 días   │   AI genera las 5 tareas específicas para esa idea.
           └──────────┘

        ┌──────────┐
        │ ✨ CHAT  │ ← Burbuja flotante. AI real con contexto del sprint/pantalla actual.
        │ flotante │   Red de seguridad, no protagonista.
        └──────────┘
```

### Navegación
- **Bottom nav** con 4 tabs: 🗺️ Mapa · 👂 Cazador · 💡 Ideas · ⚡ Sprint
- Sprint tab deshabilitado si no hay idea activa en sprint
- Burbuja chat ✨ siempre visible (position fixed, esquina inferior derecha)

---

## 📱 Pantalla 1 — Mapa de Oportunidades

### Qué hace
Pantalla de entrada al módulo. Muestra datos reales del usuario (de M1/M2/M3) y le presenta 3 caminos personalizados.

### Datos que consume de otros módulos
| Dato | Fuente | Cómo se obtiene |
|---|---|---|
| Valor real de la hora | M1 `real_hours` + `incomes` | Cálculo existente de Algoritmo 1 |
| Horas libres por semana | M1 `real_hours` | `168 - horas_trabajo_semanal` (simplificado) |
| Gap mensual hacia meta | M3 `freedom_goals` + M2 `transactions` | Meta mensual - ingreso neto actual |

### Los 3 caminos
Los caminos son **fijos** (no generados por AI). Se muestran siempre los mismos 3, pero el porcentaje de "match" se calcula dinámicamente con el perfil del usuario.

| Camino | Emoji | Color | Match calculado con... |
|---|---|---|---|
| **Monetiza lo que ya sabes** | 🔧 | `#2E7D52` (accent) | Horas libres + experiencia laboral (si se captura) |
| **Resuelve un problema real** | 🎯 | `#6366f1` (indigo) | Número de observaciones en Cazador |
| **Construye una audiencia** | 📱 | `#C69B30` (gold) | Horas libres (requiere más tiempo) |

### Componentes
```
MapaPage.tsx
├── HeroCard (dark card)
│   ├── Título: "Tu mapa de oportunidades"
│   ├── Contexto: "Basado en tu perfil: empleado · X hrs/sem · meta $Y/mes"
│   └── 3 mini-stats: hora real, horas libres, gap mensual
├── NavCards (2 botones → Cazador / Mis Ideas)
└── CaminoCards (3 cards clickeables)
    ├── Emoji + título + subtítulo
    ├── Badge de match (%) calculado
    └── Badges: tiempo estimado + barrera de entrada
```

### Interacción
- Click en un camino → navega al **Banco de Ideas** (el camino queda como filtro activo)
- Click en "Cazador" → navega a pantalla 2
- Click en "Mis Ideas" → navega a pantalla 3

---

## 📱 Pantalla 2 — Cazador de Problemas

### Qué hace
Registro diario de observaciones/quejas reales. El usuario escucha quejas en su entorno y las anota aquí. Es un hábito — como Duolingo pero para detectar oportunidades de negocio.

### Mecánica
1. Input de texto libre: "¿Qué queja escuchaste hoy?"
2. Cada observación se guarda con timestamp
3. La app mantiene una **racha** (días consecutivos con al menos 1 observación)
4. Periódicamente, la AI analiza las observaciones y detecta **patrones** (agrupaciones temáticas)
5. Cuando un patrón tiene 2+ observaciones, la AI sugiere convertirlo en idea → va al Banco

### Componentes
```
CazadorPage.tsx
├── BackButton → Mapa
├── HeroCard (dark)
│   ├── Título: "Cazador de Problemas"
│   ├── Racha: contador de días + badge "Día X"
│   └── Misión activa: "Registra 1 queja real que escuches hoy"
├── InputCard
│   ├── Pregunta: "¿Qué queja escuchaste hoy?"
│   ├── Input texto + botón "+"
│   └── Placeholder: "Escríbela tal como la escuchaste..."
├── PatronCard (condicional — aparece cuando AI detecta patrón)
│   ├── Ícono ✨ + "Patrón detectado por AI"
│   ├── Descripción del patrón
│   └── Botón: "Ver en mis ideas →"
└── ObservacionesList
    └── ObservacionCard (por cada observación)
        ├── Texto de la queja
        ├── Badge categoría (auto-asignada o manual)
        └── Indicador de potencial (0-100, visual circular)
```

### Racha
- Se calcula en el frontend comparando fechas de observaciones
- Una observación por día = mantiene racha
- Si pasa un día sin observación = racha se reinicia a 0
- La racha es puramente motivacional (sin recompensas aún)

### Detección de patrones (AI)
- **Cuándo se ejecuta:** cada vez que el usuario agrega una nueva observación Y tiene 3+ observaciones totales
- **Qué hace:** envía las últimas 10 observaciones a la AI con un prompt que pide: ¿hay algún patrón temático? Si sí, devuelve: título del patrón + descripción + qué observaciones lo componen
- **Formato de respuesta AI:** JSON estructurado (usar `structured.ts` existente)
- **Cómo se muestra:** card dorado con borde izquierdo gold (ver mockup)
- **Acción:** botón "Ver en mis ideas" navega al Banco con la idea pre-creada

---

## 📱 Pantalla 3 — Banco de Ideas

### Qué hace
Repositorio central de todas las ideas del usuario. Aquí llegan ideas desde dos fuentes: el Cazador (patrones detectados por AI) y el Mapa (caminos explorados). El usuario elige una idea y lanza un Sprint.

### Fuentes de ideas
| Fuente | Badge | Cómo se crea |
|---|---|---|
| Cazador | 👂 Cazador | AI detecta patrón en observaciones → crea idea automáticamente |
| Mapa | 🗺️ Mapa | Usuario explora un camino y crea idea manualmente (o AI sugiere) |
| Manual | ✍️ Manual | Botón "nueva idea" (formulario simple: título + descripción) |

### Estados de una idea
| Estado | Significado | Badge color |
|---|---|---|
| `nueva` | Recién creada, no se ha trabajado | `#2E7D52` (accent) |
| `en_sprint` | Tiene un sprint activo | `#C69B30` (gold) |
| `sprint_completado` | Completó el sprint de 5 días | `#3A9E6A` (accentHover) |
| `promovida` | Se convirtió en negocio (fue a M3) | `#2E7D52` |
| `descartada` | El usuario decidió no seguir | `#E84434` (alert) |

### Filtros
4 tabs horizontales: Todas · 👂 Cazador · 🗺️ Mapa · ⚡ En sprint

### Componentes
```
BancoPage.tsx
├── BackButton → Mapa
├── Header: "Mis Ideas" + subtítulo
├── FiltroTabs (4 opciones)
└── IdeaList
    └── IdeaCard (por cada idea)
        ├── Emoji + título + descripción
        ├── Indicador de potencial (numérico)
        ├── Badges: estado + fuente
        └── Botón: "Lanzar sprint" o "Continuar sprint"
```

### Crear idea manual
- Botón "+" o "Nueva idea" en la esquina superior
- Modal simple: título (required) + descripción (required) + modelo de negocio (optional select)
- Se crea en estado `nueva`

---

## 📱 Pantalla 4 — Sprint de 5 Días

### Qué hace
Plan de acción concreto de 5 tareas, **generado por AI**, específico para la idea seleccionada. Es el corazón del módulo — donde ocurre la acción real.

### Cómo se genera el sprint
1. Usuario toca "Lanzar sprint" en una idea del Banco
2. Se llama a la AI con:
   - Título y descripción de la idea
   - Datos del perfil del usuario (M1/M2/M3): horas disponibles, ingreso actual, meta
   - Información de contexto: tipo de empleo, industria (si se capturó)
3. La AI devuelve un JSON estructurado con 5 tareas, cada una con:
   - `day_number` (1-5)
   - `emoji`
   - `title` (nombre corto de la tarea)
   - `task` (instrucción concreta en segunda persona)
   - `duration_minutes` (estimado)
   - `detail` (explicación expandida de cómo hacerla)
   - `goal` (qué se espera al completar esta tarea)

### Prompt para generar sprint
```
Eres un coach de negocios práctico. El usuario es un empleado que quiere 
construir una fuente de ingreso paralela. Su idea es:

Título: {idea.title}
Descripción: {idea.description}

Contexto del usuario:
- Horas libres por semana: {perfil.horas_libres}
- Ingreso actual por hora: ${perfil.hora_real}
- Gap mensual hacia su meta: ${perfil.gap_mensual}

Genera un sprint de 5 días con tareas concretas y accionables.

REGLAS:
- Cada tarea debe poderse hacer en 10-30 minutos máximo
- Las tareas van de menor a mayor compromiso (Día 1 = observar, Día 5 = acción real)
- Usa lenguaje directo, sin jerga de negocios
- El Día 1 siempre involucra hablar con personas reales que tengan el problema
- El Día 5 siempre termina con un experimento listo para lanzar
- NO asumas que el usuario tiene capital, equipo, o experiencia técnica

Responde SOLO en JSON con este formato exacto:
{
  "tasks": [
    {
      "day_number": 1,
      "emoji": "🔍",
      "title": "Nombre corto",
      "task": "Instrucción concreta en segunda persona",
      "duration_minutes": 20,
      "detail": "Explicación de cómo hacerla",
      "goal": "Qué se espera al completar"
    }
  ]
}
```

### Componentes
```
SprintPage.tsx
├── BackButton → Banco
├── HeroCard (dark)
│   ├── Título: nombre de la idea
│   ├── Badge: "Sprint generado por AI"
│   ├── Progreso: porcentaje + barra
│   └── Subtítulo: sprint de 5 días
├── DayTimeline (horizontal scroll, 5 botones)
│   └── DayButton (emoji + "Día N" + estado ✅/activo/pendiente)
├── ActiveDayCard
│   ├── Emoji grande + título del día + tarea
│   ├── Detalle expandido (bg surface)
│   ├── Badges: duración + meta
│   ├── TextArea: notas del usuario para esta tarea
│   └── Botón: "Marcar como completado ✓" / "Ir al Día X →"
└── CompletionCard (condicional — aparece al completar los 5 días)
    ├── "Sprint completado 🎉"
    ├── Resumen de lo logrado
    └── Opciones: Promover a M3 / Nuevo sprint / Descartar
```

### Notas del usuario
- Cada día tiene un `textarea` donde el usuario anota sus descubrimientos
- Las notas se guardan por día y persisten
- Son útiles para la AI (contexto futuro) y para el usuario (retrospectiva)

### Al completar el sprint
El usuario tiene 3 opciones:
1. **Promover a negocio** → crea entrada en M3 (usa `promote_idea_to_operando` existente o su equivalente v2)
2. **Nuevo sprint** → genera otro sprint de 5 días con tareas más avanzadas (iteración)
3. **Descartar** → marca la idea como descartada

---

## 💬 Mini Chat Flotante

### Qué hace
Burbuja de chat flotante en esquina inferior derecha, siempre visible. Conecta con AI real (AIProvider existente). Es la red de seguridad — si el usuario se traba, tiene a quién preguntarle.

### Contexto dinámico
El system prompt del chat cambia según la pantalla donde está el usuario:

| Pantalla | System prompt incluye... |
|---|---|
| Mapa | Perfil general del usuario + descripción de los 3 caminos |
| Cazador | Últimas 5 observaciones del usuario |
| Banco | Lista de ideas del usuario con estados |
| Sprint | Idea activa + día actual + notas escritas hasta ahora |

### Componentes
```
MiniChat.tsx (position: fixed, z-index alto)
├── ChatBubble (botón flotante ✨, 50x50px, bg dark + border gold)
└── ChatPanel (300px ancho, max 420px alto)
    ├── Header (dark): "Coach AI" + contexto actual + botón cerrar
    ├── MessageList (scroll)
    │   ├── AIBubble (bg surface, radius izq)
    │   ├── UserBubble (bg accent, radius der)
    │   └── TypingIndicator (3 dots animados)
    └── InputBar: input + botón enviar
```

### Restricciones
- **Máximo 3 mensajes por sesión gratis** (placeholder para tier logic, no implementar ahora)
- **Admin bypass:** `is_admin=true` → sin límite
- Tracking en `ai_usage_logs` obligatorio (ya existe la infraestructura)
- Respuestas concisas: system prompt incluye "Responde en máximo 3 oraciones"

---

## 🗄️ Schema de base de datos

### Tablas existentes que se reutilizan
- `ideas` — se agrega campo `sprint_status` y se simplifica
- `idea_session_messages` — se reutiliza para el mini chat
- `user_profile_tags` — se reutiliza (tags extraídos por AI del Cazador)
- `ai_usage_logs` — tracking de costos AI

### Tablas nuevas

#### `observations` — Cazador de Problemas
```sql
CREATE TABLE public.observations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content         text NOT NULL,
  category        text,                           -- auto-asignada por AI o manual
  potential_score integer CHECK (potential_score BETWEEN 0 AND 100),  -- calculado por AI
  pattern_id      uuid REFERENCES observation_patterns(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_observations_user_date ON observations(user_id, created_at DESC);
```

#### `observation_patterns` — Patrones detectados por AI
```sql
CREATE TABLE public.observation_patterns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text NOT NULL,
  idea_id         uuid REFERENCES ideas(id) ON DELETE SET NULL,  -- si generó idea
  observation_count integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON observation_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### `sprints` — Sprint de 5 días
```sql
CREATE TABLE public.sprints (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  idea_id         uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'abandoned')),
  tasks_json      jsonb NOT NULL,                 -- las 5 tareas generadas por AI
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sprints_user ON sprints(user_id);
CREATE INDEX idx_sprints_idea ON sprints(idea_id);

COMMENT ON COLUMN sprints.tasks_json IS 'Array de 5 tareas generadas por AI. 
Estructura: [{day_number, emoji, title, task, duration_minutes, detail, goal}]';
```

#### `sprint_day_progress` — Progreso por día
```sql
CREATE TABLE public.sprint_day_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id       uuid NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  day_number      integer NOT NULL CHECK (day_number BETWEEN 1 AND 5),
  notes           text,                           -- notas del usuario para ese día
  completed       boolean NOT NULL DEFAULT false,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE(sprint_id, day_number)
);
```

#### `streaks` — Racha del Cazador
```sql
CREATE TABLE public.streaks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature         text NOT NULL DEFAULT 'cazador'
                    CHECK (feature IN ('cazador')),  -- extensible a futuro
  current_count   integer NOT NULL DEFAULT 0,
  longest_count   integer NOT NULL DEFAULT 0,
  last_activity   date,

  UNIQUE(user_id, feature)
);
```

### Modificaciones a tablas existentes

#### `ideas` — cambios
```sql
-- Nuevos campos
ALTER TABLE public.ideas
  ADD COLUMN source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('cazador', 'mapa', 'manual')),
  ADD COLUMN potential_score integer
    CHECK (potential_score BETWEEN 0 AND 100);

-- El campo status se simplifica para v2
-- Los estados de v1 (generated/committed/validando/construyendo/operando/discarded) 
-- se reemplazan por:
-- nueva / en_sprint / sprint_completado / promovida / descartada

-- ⚠️ ANTES de alterar el CHECK: verificar nombre real del constraint
-- SELECT conname FROM pg_constraint WHERE conrelid = 'ideas'::regclass AND contype = 'c';
-- Luego:
ALTER TABLE public.ideas DROP CONSTRAINT ideas_status_check;
ALTER TABLE public.ideas ADD CONSTRAINT ideas_status_check
  CHECK (status IN ('nueva', 'en_sprint', 'sprint_completado', 'promovida', 'descartada'));

-- Actualizar default
ALTER TABLE public.ideas ALTER COLUMN status SET DEFAULT 'nueva';
```

#### `profiles` — campo opcional de ocupación
```sql
ALTER TABLE public.profiles
  ADD COLUMN occupation text;

COMMENT ON COLUMN public.profiles.occupation IS 'Ocupación del usuario. Se pide una sola vez en onboarding. Alimenta personalización del Mapa de Oportunidades.';
```

### RLS Policies (todas las tablas nuevas)
```sql
-- observations
ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own observations" ON observations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own observations" ON observations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own observations" ON observations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own observations" ON observations FOR DELETE USING (auth.uid() = user_id);

-- observation_patterns
ALTER TABLE public.observation_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own patterns" ON observation_patterns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own patterns" ON observation_patterns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own patterns" ON observation_patterns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own patterns" ON observation_patterns FOR DELETE USING (auth.uid() = user_id);

-- sprints
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own sprints" ON sprints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sprints" ON sprints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sprints" ON sprints FOR UPDATE USING (auth.uid() = user_id);

-- sprint_day_progress (acceso via sprint ownership)
ALTER TABLE public.sprint_day_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sprint progress" ON sprint_day_progress
  FOR ALL USING (
    EXISTS (SELECT 1 FROM sprints WHERE sprints.id = sprint_day_progress.sprint_id AND sprints.user_id = auth.uid())
  );

-- streaks
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own streaks" ON streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own streaks" ON streaks FOR ALL USING (auth.uid() = user_id);
```

---

## 📁 Estructura de archivos (reemplazo)

### Archivos a ELIMINAR (M4 v1)
```
src/modules/ideas/actions/sessions.ts       ← reemplazar
src/modules/ideas/actions/messages.ts       ← reemplazar
src/modules/ideas/actions/phases.ts         ← eliminar (no hay fases en v2)
src/modules/ideas/actions/transitions.ts    ← reemplazar parcialmente
src/modules/ideas/actions/deepDive.ts       ← eliminar (no hay deep dive en v2)
src/modules/ideas/ai/prompts.ts             ← reemplazar (nuevos prompts)
src/modules/ideas/ai/context.ts             ← reemplazar
src/modules/ideas/ai/summary.ts             ← eliminar
src/modules/ideas/components/*.tsx          ← eliminar TODOS (25 componentes)
src/app/(protected)/ideas/[ideaId]/chat/    ← eliminar carpeta completa
src/app/(protected)/ideas/new/page.tsx      ← reemplazar
```

### Archivos a CONSERVAR
```
src/modules/ideas/ai/provider.ts            ← intacto (AIProvider multi-proveedor)
src/modules/ideas/ai/resolver.ts            ← intacto
src/modules/ideas/ai/structured.ts          ← intacto (parsing JSON de AI)
src/modules/ideas/ai/usage.ts               ← intacto (tracking costos)
src/modules/ideas/utils/admin-guard.ts      ← intacto
src/modules/ideas/utils/error-copy.ts       ← intacto
```

### Archivos NUEVOS
```
src/modules/ideas/
├── types/index.ts                  ← REESCRIBIR (nuevos tipos v2)
├── constants.ts                    ← REESCRIBIR (nuevas constantes v2)
├── mappers.ts                      ← REESCRIBIR (nuevos mappers v2)
├── actions/
│   ├── observations.ts             ← NUEVO: CRUD observaciones + racha
│   ├── patterns.ts                 ← NUEVO: detección AI de patrones
│   ├── ideas.ts                    ← REESCRIBIR: crear/listar/filtrar ideas
│   ├── sprints.ts                  ← NUEVO: generar sprint AI + CRUD progreso
│   ├── chat.ts                     ← NUEVO: mini chat flotante
│   ├── mapa.ts                     ← NUEVO: datos del mapa (consume M1/M2/M3)
│   └── index.ts                    ← barrel
├── ai/
│   ├── prompts.ts                  ← REESCRIBIR: prompts para cazador + sprint + chat
│   └── context.ts                  ← REESCRIBIR: buildUserContext desde M1/M2/M3
├── components/
│   ├── MapaPage.tsx                ← NUEVO
│   ├── CaminoCard.tsx              ← NUEVO
│   ├── CazadorPage.tsx             ← NUEVO
│   ├── ObservacionCard.tsx         ← NUEVO
│   ├── PatronCard.tsx              ← NUEVO
│   ├── BancoPage.tsx               ← NUEVO
│   ├── IdeaCard.tsx                ← REESCRIBIR (nueva estructura)
│   ├── SprintPage.tsx              ← NUEVO
│   ├── DayTimeline.tsx             ← NUEVO
│   ├── ActiveDayCard.tsx           ← NUEVO
│   ├── MiniChat.tsx                ← NUEVO (burbuja + panel)
│   ├── StreakBadge.tsx             ← NUEVO
│   └── index.ts                    ← barrel
└── hooks/
    ├── useStreak.ts                ← NUEVO
    ├── useSprint.ts                ← NUEVO
    └── index.ts

src/app/(protected)/
├── ideas/page.tsx                  ← REESCRIBIR: ahora renderiza MapaPage
├── ideas/cazador/page.tsx          ← NUEVO
├── ideas/banco/page.tsx            ← NUEVO
├── ideas/sprint/[sprintId]/page.tsx← NUEVO
└── ideas/[ideaId]/page.tsx         ← REESCRIBIR: detalle simplificado
```

---

## 🔧 Server Actions

### `actions/observations.ts` (Cazador)

| Función | Params | Retorna | Qué hace |
|---|---|---|---|
| `addObservation` | `{content: string}` | `ActionResult<Observation>` | Inserta observación + actualiza racha + dispara detección de patrones si hay 3+ |
| `getObservations` | `{limit?: number}` | `ActionResult<Observation[]>` | Lista observaciones del usuario, más recientes primero |
| `deleteObservation` | `{id: string}` | `ActionResult<void>` | Elimina una observación |
| `getStreak` | — | `ActionResult<Streak>` | Retorna racha actual del cazador |

### `actions/patterns.ts` (Detección AI)

| Función | Params | Retorna | Qué hace |
|---|---|---|---|
| `detectPatterns` | `{observations: Observation[]}` | `ActionResult<Pattern[]>` | Envía observaciones a AI, guarda patrones detectados |
| `convertPatternToIdea` | `{patternId: string}` | `ActionResult<Idea>` | Crea idea desde un patrón + vincula |

### `actions/ideas.ts` (Banco)

| Función | Params | Retorna | Qué hace |
|---|---|---|---|
| `createIdea` | `{title, description, source, business_model?}` | `ActionResult<Idea>` | Crea idea en estado `nueva` |
| `listIdeas` | `{source?: string, status?: string}` | `ActionResult<Idea[]>` | Lista con filtros opcionales |
| `updateIdea` | `{id, title?, description?}` | `ActionResult<Idea>` | Editar título/descripción |
| `discardIdea` | `{id, reason?}` | `ActionResult<Idea>` | Marca como descartada |

### `actions/sprints.ts` (Sprint)

| Función | Params | Retorna | Qué hace |
|---|---|---|---|
| `generateSprint` | `{ideaId: string}` | `ActionResult<Sprint>` | Llama AI para generar 5 tareas → guarda en DB → actualiza idea a `en_sprint` |
| `getSprint` | `{sprintId: string}` | `ActionResult<Sprint & {progress: DayProgress[]}>` | Sprint con progreso de cada día |
| `getActiveSprintForIdea` | `{ideaId: string}` | `ActionResult<Sprint | null>` | Sprint activo de una idea (puede no tener) |
| `completeDayProgress` | `{sprintId, dayNumber, notes?}` | `ActionResult<DayProgress>` | Marca día como completado + guarda notas |
| `updateDayNotes` | `{sprintId, dayNumber, notes}` | `ActionResult<DayProgress>` | Actualiza notas sin completar |
| `completeSprint` | `{sprintId}` | `ActionResult<Sprint>` | Marca sprint como completado → idea a `sprint_completado` |
| `abandonSprint` | `{sprintId}` | `ActionResult<Sprint>` | Marca como abandonado → idea vuelve a `nueva` |

### `actions/chat.ts` (Mini Chat Flotante)

| Función | Params | Retorna | Qué hace |
|---|---|---|---|
| `sendChatMessage` | `{message, context: ChatContext}` | `ActionResult<{response: string}>` | Envía a AI con contexto de pantalla actual → retorna respuesta |

```typescript
// ChatContext define qué información contextual incluir
interface ChatContext {
  screen: 'mapa' | 'cazador' | 'banco' | 'sprint';
  ideaId?: string;     // si está en sprint
  sprintId?: string;   // si está en sprint
  dayNumber?: number;  // día actual del sprint
}
```

### `actions/mapa.ts` (Mapa de Oportunidades)

| Función | Params | Retorna | Qué hace |
|---|---|---|---|
| `getMapaData` | — | `ActionResult<MapaData>` | Calcula datos de M1/M2/M3 para el mapa |

```typescript
interface MapaData {
  hourly_rate: number;       // valor real de la hora (M1)
  free_hours_week: number;   // horas libres por semana (M1)
  monthly_gap: number;       // gap hacia meta de libertad (M3 - M2)
  occupation: string | null; // de profiles
  caminos: CaminoMatch[];    // 3 caminos con match % calculado
}
```

---

## 🎨 Decisiones de diseño locked-in

### Visual
- Usar design system existente (colores, tipografía, patrones de card/modal)
- Hero cards dark para headers de cada pantalla
- Gold (✨) exclusivo para AI y gamificación (racha, patrones, sprint generado)
- Bottom nav dentro del módulo (4 tabs, no reemplaza el bottom nav principal de la app)

### UX
- **Cero formularios largos** — la interacción más compleja es un textarea
- **Progresión natural** — Mapa → Cazador → Banco → Sprint
- **No forzar orden** — el usuario puede ir directo al Banco o al Cazador desde cualquier pantalla
- **Sprint tab deshabilitado** si no hay sprint activo (previene pantalla vacía)
- **Chat flotante siempre disponible** pero nunca protagonista

### AI
- **Sprint generado = 1 llamada AI** (no iterativo, no conversacional)
- **Detección de patrones = 1 llamada AI** por observación nueva (si hay 3+ observaciones)
- **Chat flotante = conversación efímera** (no se persiste historial entre sesiones)
- **Respuestas concisas:** system prompt siempre incluye "máximo 3 oraciones"
- **Admin bypass:** `is_admin=true` → sin límites de AI

---

## ⚠️ Pendientes NO incluidos en este handoff

1. **Función SQL `promote_idea_to_operando()`** — pendiente de v1, ahora se adapta a v2 (de sprint_completado → promovida, crea business en M3)
2. **Rebranding legal** — los términos de DeMarco siguen sin reemplazar
3. **Build Vercel** — verificar que compile limpio después del reemplazo
4. **Perfil progresivo completo** — v2 solo captura `occupation`. Datos adicionales (industria, habilidades, etc.) se agregan en fases futuras
5. **Match % algoritmo real** — v2 usa cálculo simplificado. Algoritmo preciso requiere más datos del usuario

---

## 🧭 Orden de implementación sugerido

```
1. Migraciones SQL (tablas nuevas + alteraciones)
2. Types + Constants + Mappers (v2)
3. Actions: observations + streaks
4. Actions: patterns (AI)
5. Actions: ideas (v2)
6. Actions: sprints (AI generado)
7. Actions: mapa (consume M1/M2/M3)
8. Actions: chat
9. Componentes: Mapa
10. Componentes: Cazador
11. Componentes: Banco
12. Componentes: Sprint
13. Componente: MiniChat
14. Pages + routing
15. Eliminar archivos v1
16. Build + type-check
```

---

## 📎 Archivos de referencia adjuntos

| Archivo | Qué es |
|---|---|
| `m4-rediseno-integrado.jsx` | Mockup interactivo completo con las 5 pantallas + chat flotante funcional |
| `conceptos-m4.jsx` | Los 3 conceptos individuales que originaron el diseño (para referencia histórica) |

---

**Final del handoff. Este documento es la fuente de verdad para el rediseño de M4.**