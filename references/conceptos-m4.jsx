import { useState } from "react";

// ─── Design tokens (Fastlane Compass) ───────────────────────────────────────
const T = {
  bg: "#F2F7F4",
  dark: "#1A2520",
  accent: "#2E7D52",
  accentHover: "#3A9E6A",
  surface: "#EAF0EC",
  gold: "#C69B30",
  alert: "#E84434",
  text: "#141F19",
  textSec: "#7A9A8A",
  border: "#e0ebe4",
};

// ─── Shared UI ───────────────────────────────────────────────────────────────
const Badge = ({ children, color = T.accent }) => (
  <span style={{
    background: color + "18", color, border: `1px solid ${color}30`,
    borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 600,
    fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.03em"
  }}>{children}</span>
);

const Pill = ({ children, active, onClick, color }) => (
  <button onClick={onClick} style={{
    background: active ? (color || T.accent) : "transparent",
    color: active ? "#fff" : T.textSec,
    border: `1px solid ${active ? (color || T.accent) : T.border}`,
    borderRadius: 99, padding: "6px 16px", fontSize: 12, fontWeight: 600,
    cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit"
  }}>{children}</button>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: "#fff", borderRadius: 16, border: `1px solid ${T.border}`,
    padding: "20px", ...style
  }}>{children}</div>
);

const HeroCard = ({ children, style = {} }) => (
  <div style={{
    background: T.dark, borderRadius: 16,
    padding: "20px 20px", ...style
  }}>{children}</div>
);

// ─── CONCEPT SELECTOR ────────────────────────────────────────────────────────
const concepts = [
  { id: "A", label: "Concepto A", subtitle: "El Cazador de Problemas" },
  { id: "B", label: "Concepto B", subtitle: "El Sprint de 5 Días" },
  { id: "C", label: "Concepto C", subtitle: "El Mapa de Oportunidades" },
];

// ════════════════════════════════════════════════════════════════════════════
// CONCEPTO A — "El Cazador de Problemas"
// Mecánica: misión diaria de observar + registrar quejas reales.
// La app construye un mapa de patrones automáticamente.
// Objetivo: llegar a una idea validada en 7-14 días sin fricción.
// ════════════════════════════════════════════════════════════════════════════
function ConceptoA() {
  const [quejas, setQuejas] = useState([
    { id: 1, texto: "Mi jefe siempre cancela reuniones a último momento", categoria: "trabajo", potencial: 82 },
    { id: 2, texto: "No encuentro plomero confiable cuando lo necesito", categoria: "hogar", potencial: 91 },
    { id: 3, texto: "Los contadores cobran mucho por declaraciones simples", categoria: "finanzas", potencial: 74 },
  ]);
  const [nueva, setNueva] = useState("");
  const [racha, setRacha] = useState(4);
  const [mision, setMision] = useState("escuchar");

  const misiones = [
    { id: "escuchar", emoji: "👂", label: "Escuchar", desc: "Registra 1 queja real hoy" },
    { id: "patron", emoji: "🔍", label: "Encontrar patrón", desc: "¿Se repite alguna queja?" },
    { id: "validar", emoji: "💬", label: "Validar", desc: "Pregúntale a 3 personas" },
  ];

  const agregar = () => {
    if (!nueva.trim()) return;
    setQuejas(q => [...q, { id: Date.now(), texto: nueva, categoria: "nuevo", potencial: Math.floor(Math.random() * 30) + 60 }]);
    setNueva("");
    setRacha(r => r + 1);
  };

  const catColors = { trabajo: "#6366f1", hogar: T.accent, finanzas: T.gold, nuevo: T.accentHover };

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: T.text, maxWidth: 390, margin: "0 auto" }}>

      {/* Header */}
      <HeroCard style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ color: T.textSec, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Módulo · Ideas</div>
            <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>Cazador de<br />Problemas</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: T.gold, fontSize: 28, fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace" }}>{racha}</div>
            <div style={{ color: T.textSec, fontSize: 10, fontWeight: 600 }}>días seguidos</div>
          </div>
        </div>

        {/* Misión activa */}
        <div style={{ background: "#ffffff12", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 20 }}>👂</div>
          <div>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Misión de hoy</div>
            <div style={{ color: T.textSec, fontSize: 12 }}>Registra 1 queja real que escuches</div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Badge color={T.gold}>Día 5</Badge>
          </div>
        </div>
      </HeroCard>

      {/* Input rápido */}
      <Card style={{ marginBottom: 12, padding: "14px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: T.text }}>¿Qué queja escuchaste hoy?</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={nueva}
            onChange={e => setNueva(e.target.value)}
            onKeyDown={e => e.key === "Enter" && agregar()}
            placeholder="Ej: 'No hay quién repare electrodomésticos rápido...'"
            style={{
              flex: 1, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 12px",
              fontSize: 12, outline: "none", fontFamily: "inherit", color: T.text,
              background: T.bg
            }}
          />
          <button onClick={agregar} style={{
            background: T.accent, color: "#fff", border: "none", borderRadius: 10,
            padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer"
          }}>+</button>
        </div>
      </Card>

      {/* Mapa de quejas */}
      <div style={{ fontSize: 12, fontWeight: 600, color: T.textSec, marginBottom: 8, paddingLeft: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Tu radar · {quejas.length} quejas
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {quejas.map(q => (
          <Card key={q.id} style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.4, marginBottom: 6 }}>{q.texto}</div>
                <Badge color={catColors[q.categoria] || T.accent}>{q.categoria}</Badge>
              </div>
              <div style={{ textAlign: "center", minWidth: 44 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: `conic-gradient(${T.accent} ${q.potencial}%, ${T.border} 0)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative"
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%", background: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, color: T.accent,
                    fontFamily: "'IBM Plex Mono', monospace"
                  }}>{q.potencial}</div>
                </div>
                <div style={{ fontSize: 9, color: T.textSec, marginTop: 2 }}>potencial</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Insight AI */}
      <Card style={{ borderLeft: `3px solid ${T.gold}`, background: T.gold + "08" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ fontSize: 16 }}>✨</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.gold, marginBottom: 3 }}>Patrón detectado</div>
            <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>
              2 de tus quejas apuntan a <strong>servicios de hogar sin confianza</strong>. Este mercado mueve $4B/año en LATAM y tiene baja barrera de entrada.
            </div>
            <button style={{
              marginTop: 8, background: "none", border: `1px solid ${T.gold}`,
              color: T.gold, borderRadius: 8, padding: "5px 12px", fontSize: 11,
              fontWeight: 600, cursor: "pointer"
            }}>Explorar este patrón →</button>
          </div>
        </div>
      </Card>

      {/* Métricas clave */}
      <div style={{ fontSize: 10, color: T.textSec, textAlign: "center", marginTop: 16, lineHeight: 1.8 }}>
        <strong style={{ color: T.text }}>Mecánica:</strong> Misión diaria de 2 min · Racha como accountability · AI detecta patrones automáticamente · Sin chat, sin formularios
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CONCEPTO B — "El Sprint de 5 Días"
// Mecánica: estructura de sprint tipo design thinking comprimido.
// Cada día tiene una tarea específica con duración estimada.
// Objetivo: en 5 días el usuario tiene un experimento listo para lanzar.
// ════════════════════════════════════════════════════════════════════════════
function ConceptoB() {
  const [diaActivo, setDiaActivo] = useState(2);
  const [completados, setCompletados] = useState([0, 1]);

  const dias = [
    {
      n: 1, emoji: "👁️", titulo: "Observar",
      tarea: "Escucha 3 quejas reales en tu entorno hoy",
      duracion: "15 min", resultado: "3 quejas anotadas",
      detalle: "No busques ideas. Solo escucha. En el trabajo, en casa, con amigos. Anota textualmente lo que escuchas.",
      entregable: ["Queja 1: plomero confiable", "Queja 2: contador caro", "Queja 3: reuniones canceladas"]
    },
    {
      n: 2, emoji: "🎯", titulo: "Elegir",
      tarea: "Elige la queja con más potencial",
      duracion: "10 min", resultado: "1 queja seleccionada",
      detalle: "De las 3 quejas del día 1, ¿cuál te genera más curiosidad? ¿Cuál escuchaste más de una vez?",
      entregable: null
    },
    {
      n: 3, emoji: "💬", titulo: "Validar",
      tarea: "Pregúntale a 3 personas sobre ese problema",
      duracion: "20 min", resultado: "3 conversaciones",
      detalle: "No les preguntes si comprarían tu solución. Pregúntales cuándo fue la última vez que tuvieron ese problema.",
      entregable: null
    },
    {
      n: 4, emoji: "💡", titulo: "Idear",
      tarea: "Diseña la solución más simple posible",
      duracion: "15 min", resultado: "1 idea concreta",
      detalle: "¿Cuál es la versión más simple que resolvería el problema? Tan simple que puedas probarla esta semana.",
      entregable: null
    },
    {
      n: 5, emoji: "🚀", titulo: "Lanzar",
      tarea: "Consigue tu primer cliente potencial",
      duracion: "30 min", resultado: "1 conversación real",
      detalle: "No lances un producto. Solo habla con alguien que tenga el problema y dile que estás trabajando en una solución.",
      entregable: null
    },
  ];

  const dia = dias[diaActivo];
  const progreso = Math.round((completados.length / dias.length) * 100);

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: T.text, maxWidth: 390, margin: "0 auto" }}>

      {/* Header */}
      <HeroCard style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ color: T.textSec, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Sprint · Ideas</div>
            <div style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>5 días para tu<br />primer experimento</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: T.gold, fontSize: 28, fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace" }}>{progreso}%</div>
            <div style={{ color: T.textSec, fontSize: 10 }}>completado</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: "#ffffff20", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progreso}%`, background: T.gold, borderRadius: 99, transition: "width 0.5s" }} />
        </div>
      </HeroCard>

      {/* Timeline días */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
        {dias.map((d, i) => {
          const done = completados.includes(i);
          const active = i === diaActivo;
          return (
            <button key={d.n} onClick={() => setDiaActivo(i)} style={{
              minWidth: 58, padding: "8px 6px", borderRadius: 12, border: "none",
              background: active ? T.accent : done ? T.surface : "#fff",
              cursor: "pointer", transition: "all 0.2s",
              boxShadow: active ? `0 4px 12px ${T.accent}40` : "none",
              border: `1px solid ${active ? T.accent : T.border}`
            }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{done && !active ? "✅" : d.emoji}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: active ? "#fff" : done ? T.accent : T.textSec }}>Día {d.n}</div>
              <div style={{ fontSize: 9, color: active ? "#ffffff90" : T.textSec }}>{d.titulo}</div>
            </button>
          );
        })}
      </div>

      {/* Día activo */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ fontSize: 32 }}>{dia.emoji}</div>
          <div>
            <div style={{ fontSize: 11, color: T.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Día {dia.n} · {dia.titulo}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{dia.tarea}</div>
          </div>
        </div>

        <div style={{ background: T.bg, borderRadius: 10, padding: "12px", marginBottom: 12, fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>
          {dia.detalle}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
          <Badge color={T.accent}>⏱ {dia.duracion}</Badge>
          <Badge color={T.gold}>🎯 {dia.resultado}</Badge>
        </div>

        {/* Entregable día 1 */}
        {dia.entregable && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.textSec, marginBottom: 8 }}>LO QUE REGISTRASTE</div>
            {dia.entregable.map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: T.accent, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
                <div style={{ fontSize: 12, color: T.text }}>{e}</div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            if (!completados.includes(diaActivo)) setCompletados(c => [...c, diaActivo]);
            if (diaActivo < dias.length - 1) setDiaActivo(d => d + 1);
          }}
          style={{
            width: "100%", background: T.accent, color: "#fff", border: "none",
            borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700,
            cursor: "pointer", transition: "background 0.2s"
          }}
        >
          {completados.includes(diaActivo) ? `Ir al Día ${diaActivo + 2} →` : "Completar este día ✓"}
        </button>
      </Card>

      <div style={{ fontSize: 10, color: T.textSec, textAlign: "center", lineHeight: 1.8 }}>
        <strong style={{ color: T.text }}>Mecánica:</strong> 5 tareas concretas · 10-30 min por día · Sin chat · Progreso visual · Al día 5 tienes un experimento real
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// CONCEPTO C — "El Mapa de Oportunidades"
// Mecánica: la app usa M1/M2/M3 para pre-generar 3 caminos personalizados.
// El usuario elige uno y recibe un plan de acción específico para su perfil.
// Objetivo: eliminar el "no sé por dónde empezar" con opciones pre-filtradas.
// ════════════════════════════════════════════════════════════════════════════
function ConceptoC() {
  const [seleccionado, setSeleccionado] = useState(null);
  const [vista, setVista] = useState("mapa"); // mapa | detalle

  const caminos = [
    {
      id: "servicios",
      emoji: "🔧",
      titulo: "Monetiza lo que ya sabes",
      subtitulo: "Basado en tu perfil profesional",
      descripcion: "Tienes habilidades que otras personas pagan por no tener que aprender. El camino más rápido al primer ingreso paralelo.",
      tiempo: "2-4 semanas al primer pago",
      barrera: "Baja",
      escala: "Media",
      ejemplos: ["Consultoría en tu área", "Clases o tutorías", "Freelance de fin de semana"],
      match: 94,
      color: T.accent,
      primerPaso: "Escribe 3 cosas que sabes hacer y que alguien más no sabe. Eso es tu oferta."
    },
    {
      id: "problemas",
      emoji: "🎯",
      titulo: "Resuelve un problema real",
      subtitulo: "Basado en lo que ves en tu entorno",
      descripcion: "Observas quejas todos los días sin darte cuenta. Convertir una de ellas en un negocio es el camino más sostenible.",
      tiempo: "4-8 semanas al primer pago",
      barrera: "Media",
      escala: "Alta",
      ejemplos: ["App o servicio simple", "Conectar oferta con demanda", "Automatizar algo manual"],
      match: 78,
      color: "#6366f1",
      primerPaso: "Escucha 3 quejas esta semana. Anótalas aquí."
    },
    {
      id: "contenido",
      emoji: "📱",
      titulo: "Construye una audiencia",
      subtitulo: "Basado en tu tiempo disponible",
      descripcion: "El camino más lento pero con mayor potencial de escala. Construyes activos que generan ingreso mientras duermes.",
      tiempo: "3-6 meses al primer ingreso",
      barrera: "Muy baja",
      escala: "Muy alta",
      ejemplos: ["Newsletter en tu nicho", "Canal de video o podcast", "Comunidad pagada"],
      match: 61,
      color: T.gold,
      primerPaso: "¿De qué podrías hablar 100 episodios sin aburrirte? Escríbelo."
    }
  ];

  const camino = caminos.find(c => c.id === seleccionado);

  if (vista === "detalle" && camino) {
    return (
      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: T.text, maxWidth: 390, margin: "0 auto" }}>
        <button onClick={() => setVista("mapa")} style={{ background: "none", border: "none", color: T.textSec, fontSize: 13, cursor: "pointer", marginBottom: 12, padding: 0 }}>
          ← Volver al mapa
        </button>

        <HeroCard style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>{camino.emoji}</div>
          <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{camino.titulo}</div>
          <div style={{ color: T.textSec, fontSize: 13, marginBottom: 14 }}>{camino.descripcion}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Badge color={T.gold}>⏱ {camino.tiempo}</Badge>
            <Badge color={T.accentHover}>📈 Escala {camino.escala}</Badge>
          </div>
        </HeroCard>

        <Card style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.textSec, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>Ejemplos para tu perfil</div>
          {camino.ejemplos.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: camino.color, flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: T.text }}>{e}</div>
            </div>
          ))}
        </Card>

        <Card style={{ borderLeft: `3px solid ${camino.color}`, background: camino.color + "08", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: camino.color, marginBottom: 6 }}>🎯 Tu primer paso concreto</div>
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6, fontWeight: 500 }}>{camino.primerPaso}</div>
        </Card>

        <button style={{
          width: "100%", background: camino.color, color: "#fff", border: "none",
          borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700, cursor: "pointer"
        }}>
          Empezar este camino →
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: T.text, maxWidth: 390, margin: "0 auto" }}>

      {/* Header */}
      <HeroCard style={{ marginBottom: 12 }}>
        <div style={{ color: T.textSec, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Módulo · Ideas</div>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Tu mapa de<br />oportunidades</div>
        <div style={{ color: T.textSec, fontSize: 13, lineHeight: 1.5 }}>
          Basado en tu perfil: <span style={{ color: "#fff", fontWeight: 600 }}>empleado · 45 hrs/sem · meta $3,000/mes</span>
        </div>
      </HeroCard>

      {/* Contexto de M1/M2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        {[
          { label: "Tu hora vale", value: "$12.4", sub: "real" },
          { label: "Horas libres", value: "18 hrs", sub: "por semana" },
          { label: "Gap mensual", value: "$1,800", sub: "para tu meta" },
        ].map((s, i) => (
          <Card key={i} style={{ padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: T.textSec, lineHeight: 1.3 }}>{s.label}<br />{s.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: T.textSec, marginBottom: 10, paddingLeft: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        3 caminos para tu perfil — elige uno
      </div>

      {/* Caminos */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        {caminos.map(c => (
          <button key={c.id} onClick={() => { setSeleccionado(c.id); setVista("detalle"); }} style={{
            background: "#fff", border: `2px solid ${seleccionado === c.id ? c.color : T.border}`,
            borderRadius: 14, padding: "14px 16px", cursor: "pointer", textAlign: "left",
            transition: "all 0.2s", boxShadow: seleccionado === c.id ? `0 4px 16px ${c.color}25` : "none"
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ fontSize: 28 }}>{c.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.titulo}</div>
                  <div style={{
                    background: c.color + "18", color: c.color, borderRadius: 99,
                    padding: "2px 8px", fontSize: 11, fontWeight: 700,
                    fontFamily: "'IBM Plex Mono', monospace"
                  }}>{c.match}%</div>
                </div>
                <div style={{ fontSize: 12, color: T.textSec, marginBottom: 8 }}>{c.subtitulo}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Badge color={c.color}>⏱ {c.tiempo}</Badge>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 10, color: T.textSec, textAlign: "center", lineHeight: 1.8 }}>
        <strong style={{ color: T.text }}>Mecánica:</strong> Usa datos de M1/M2/M3 · Pre-filtra opciones reales · Sin chat · El usuario elige y recibe un primer paso concreto
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT — Selector de conceptos
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [activo, setActivo] = useState("A");

  const descripciones = {
    A: { titulo: "El Cazador de Problemas", desc: "Misión diaria de registrar quejas reales. La app detecta patrones automáticamente y sugiere oportunidades de negocio.", mecanica: "Registro diario + racha + AI detecta patrones", friccion: "Muy baja", tiempo: "7-14 días", fortaleza: "Accountability + acumulación de datos reales" },
    B: { titulo: "El Sprint de 5 Días", desc: "Estructura de 5 tareas concretas, una por día. Al día 5 el usuario tiene un experimento listo para lanzar.", mecanica: "Sprint estructurado + progreso visual", friccion: "Baja", tiempo: "5 días fijos", fortaleza: "Claridad total + acción inmediata" },
    C: { titulo: "El Mapa de Oportunidades", desc: "La app usa datos de M1/M2/M3 para pre-generar 3 caminos personalizados. El usuario elige y recibe un primer paso.", mecanica: "Personalización por perfil financiero", friccion: "Muy baja", tiempo: "Inmediato", fortaleza: "Elimina el 'no sé por dónde empezar'" },
  };

  const d = descripciones[activo];

  return (
    <div style={{ background: T.bg, minHeight: "100vh", padding: "24px 16px", fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Título */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.textSec, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
          Fastlane Compass · Rediseño M4
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>3 Conceptos de Rediseño</div>
        <div style={{ fontSize: 13, color: T.textSec }}>Selecciona un concepto para explorar el mockup</div>
      </div>

      {/* Selector */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
        {concepts.map(c => (
          <Pill key={c.id} active={activo === c.id} onClick={() => setActivo(c.id)}>
            {c.label} · {c.subtitle}
          </Pill>
        ))}
      </div>

      {/* Descripción del concepto */}
      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${T.border}`, padding: "14px 16px", marginBottom: 20, maxWidth: 420, margin: "0 auto 20px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>{d.titulo}</div>
        <div style={{ fontSize: 12, color: T.textSec, lineHeight: 1.6, marginBottom: 10 }}>{d.desc}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {[
            { label: "Fricción inicial", value: d.friccion },
            { label: "Tiempo al resultado", value: d.tiempo },
          ].map((s, i) => (
            <div key={i} style={{ background: T.bg, borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: T.textSec, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, padding: "8px 10px", background: T.accent + "10", borderRadius: 8 }}>
          <div style={{ fontSize: 10, color: T.textSec, marginBottom: 2 }}>Fortaleza principal</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>{d.fortaleza}</div>
        </div>
      </div>

      {/* Mockup */}
      <div style={{ maxWidth: 420, margin: "0 auto" }}>
        {activo === "A" && <ConceptoA />}
        {activo === "B" && <ConceptoB />}
        {activo === "C" && <ConceptoC />}
      </div>
    </div>
  );
}
