import { useState, useRef, useEffect } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#F2F7F4", dark: "#1A2520", accent: "#2E7D52", accentHover: "#3A9E6A",
  surface: "#EAF0EC", gold: "#C69B30", alert: "#E84434",
  text: "#141F19", textSec: "#7A9A8A", border: "#e0ebe4",
};

// ─── Shared components ────────────────────────────────────────────────────────
const Badge = ({ children, color = T.accent, style = {} }) => (
  <span style={{
    background: color + "18", color, border: `1px solid ${color}30`,
    borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 600,
    fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.03em", ...style
  }}>{children}</span>
);

const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{
    background: "#fff", borderRadius: 16, border: `1px solid ${T.border}`,
    padding: "16px", cursor: onClick ? "pointer" : "default",
    transition: "all 0.2s", ...style
  }}>{children}</div>
);

const HeroCard = ({ children, style = {} }) => (
  <div style={{ background: T.dark, borderRadius: 16, padding: "20px", ...style }}>
    {children}
  </div>
);

const Btn = ({ children, onClick, style = {}, variant = "primary" }) => (
  <button onClick={onClick} style={{
    background: variant === "primary" ? T.accent : variant === "ghost" ? "transparent" : "#fff",
    color: variant === "primary" ? "#fff" : T.accent,
    border: variant === "ghost" ? "none" : `1.5px solid ${variant === "outline" ? T.accent : "transparent"}`,
    borderRadius: 12, padding: "13px 20px", fontSize: 14, fontWeight: 700,
    cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
    width: "100%", ...style
  }}>{children}</button>
);

const BackBtn = ({ onClick }) => (
  <button onClick={onClick} style={{
    background: "none", border: "none", color: T.textSec, fontSize: 13,
    cursor: "pointer", padding: "0 0 16px 0", display: "flex", alignItems: "center", gap: 4
  }}>← Volver</button>
);

// ─── Pantallas ────────────────────────────────────────────────────────────────
// 1. MAPA · 2. CAZADOR · 3. BANCO · 4. SPRINT · 5. (modal chat)

// ════════════════════════════════════════════════════════════════════════════
// PANTALLA 1 — MAPA DE OPORTUNIDADES
// ════════════════════════════════════════════════════════════════════════════
function Mapa({ onCamino, onCazador, onBanco }) {
  const [sel, setSel] = useState(null);

  const caminos = [
    {
      id: "servicios", emoji: "🔧", color: T.accent, match: 94,
      titulo: "Monetiza lo que ya sabes",
      sub: "El camino más rápido al primer ingreso",
      tiempo: "2-4 semanas", barrera: "Baja",
      desc: "Tienes habilidades que otros pagan por no tener que aprender.",
    },
    {
      id: "problemas", emoji: "🎯", color: "#6366f1", match: 78,
      titulo: "Resuelve un problema real",
      sub: "El camino más sostenible a largo plazo",
      tiempo: "4-8 semanas", barrera: "Media",
      desc: "Convierte una queja cotidiana en un negocio con demanda probada.",
    },
    {
      id: "contenido", emoji: "📱", color: T.gold, match: 61,
      titulo: "Construye una audiencia",
      sub: "El camino con mayor potencial de escala",
      tiempo: "3-6 meses", barrera: "Muy baja",
      desc: "Activos que generan ingreso mientras duermes.",
    },
  ];

  return (
    <div>
      <HeroCard style={{ marginBottom: 14 }}>
        <div style={{ color: T.textSec, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Módulo · Ideas</div>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginBottom: 8 }}>Tu mapa de<br />oportunidades</div>
        <div style={{ color: T.textSec, fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>
          Basado en tu perfil: <span style={{ color: "#fff", fontWeight: 600 }}>empleado · 45 hrs/sem · meta $3,000/mes</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "Hora real", value: "$12.4" },
            { label: "Horas libres", value: "18/sem" },
            { label: "Gap mensual", value: "$1,800" },
          ].map((s, i) => (
            <div key={i} style={{ background: "#ffffff12", borderRadius: 10, padding: "8px", textAlign: "center" }}>
              <div style={{ color: T.gold, fontSize: 14, fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace" }}>{s.value}</div>
              <div style={{ color: T.textSec, fontSize: 10 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </HeroCard>

      {/* Nav secundaria */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={onCazador} style={{
          flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
          padding: "10px", cursor: "pointer", fontFamily: "inherit"
        }}>
          <div style={{ fontSize: 16 }}>👂</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.text, marginTop: 2 }}>Cazador</div>
          <div style={{ fontSize: 10, color: T.textSec }}>Registrar observación</div>
        </button>
        <button onClick={onBanco} style={{
          flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
          padding: "10px", cursor: "pointer", fontFamily: "inherit"
        }}>
          <div style={{ fontSize: 16 }}>💡</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.text, marginTop: 2 }}>Mis Ideas</div>
          <div style={{ fontSize: 10, color: T.textSec }}>Ver banco de ideas</div>
        </button>
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: T.textSec, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        3 caminos para tu perfil
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {caminos.map(c => (
          <Card key={c.id} onClick={() => onCamino(c)} style={{
            border: `2px solid ${sel === c.id ? c.color : T.border}`,
            boxShadow: sel === c.id ? `0 4px 16px ${c.color}20` : "none",
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ fontSize: 28, lineHeight: 1 }}>{c.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{c.titulo}</div>
                  <div style={{
                    background: c.color + "18", color: c.color, borderRadius: 99,
                    padding: "2px 8px", fontSize: 11, fontWeight: 700,
                    fontFamily: "'IBM Plex Mono', monospace"
                  }}>{c.match}%</div>
                </div>
                <div style={{ fontSize: 12, color: T.textSec, marginBottom: 8 }}>{c.sub}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Badge color={c.color}>⏱ {c.tiempo}</Badge>
                  <Badge color={T.textSec}>🚧 Barrera {c.barrera}</Badge>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PANTALLA 2 — CAZADOR DE PROBLEMAS
// ════════════════════════════════════════════════════════════════════════════
function Cazador({ onBack, onBanco }) {
  const [obs, setObs] = useState([
    { id: 1, texto: "Mi jefe cancela reuniones a último momento", tag: "trabajo", pot: 82 },
    { id: 2, texto: "No hay plomero confiable cuando lo necesito", tag: "hogar", pot: 91 },
    { id: 3, texto: "Los contadores cobran mucho por cosas simples", tag: "finanzas", pot: 74 },
  ]);
  const [nueva, setNueva] = useState("");
  const [racha, setRacha] = useState(4);
  const tagColors = { trabajo: "#6366f1", hogar: T.accent, finanzas: T.gold, nuevo: T.accentHover };

  const agregar = () => {
    if (!nueva.trim()) return;
    setObs(o => [...o, { id: Date.now(), texto: nueva, tag: "nuevo", pot: Math.floor(Math.random() * 25) + 65 }]);
    setNueva("");
    setRacha(r => r + 1);
  };

  return (
    <div>
      <BackBtn onClick={onBack} />

      <HeroCard style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ color: T.textSec, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Cazador de Problemas</div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>Observa.<br />Registra. Acumula.</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: T.gold, fontSize: 30, fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace" }}>{racha}</div>
            <div style={{ color: T.textSec, fontSize: 10, fontWeight: 600 }}>días seguidos</div>
          </div>
        </div>
        <div style={{ background: "#ffffff12", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ color: "#fff", fontSize: 12, fontWeight: 600, marginBottom: 2 }}>👂 Misión de hoy</div>
          <div style={{ color: T.textSec, fontSize: 12 }}>Registra 1 queja real que escuches en tu entorno</div>
        </div>
      </HeroCard>

      {/* Input */}
      <Card style={{ marginBottom: 14, padding: "14px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 10 }}>¿Qué queja escuchaste hoy?</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={nueva}
            onChange={e => setNueva(e.target.value)}
            onKeyDown={e => e.key === "Enter" && agregar()}
            placeholder="Escríbela tal como la escuchaste..."
            style={{
              flex: 1, border: `1px solid ${T.border}`, borderRadius: 10,
              padding: "10px 12px", fontSize: 12, outline: "none",
              fontFamily: "inherit", color: T.text, background: T.bg
            }}
          />
          <button onClick={agregar} style={{
            background: T.accent, color: "#fff", border: "none",
            borderRadius: 10, padding: "10px 16px", fontSize: 16,
            fontWeight: 700, cursor: "pointer"
          }}>+</button>
        </div>
      </Card>

      {/* Insight AI */}
      <Card style={{ borderLeft: `3px solid ${T.gold}`, background: T.gold + "08", marginBottom: 14, padding: "12px 14px" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 14 }}>✨</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.gold, marginBottom: 3 }}>Patrón detectado por AI</div>
            <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>
              2 observaciones apuntan a <strong>servicios del hogar sin confianza</strong>. Alta demanda, baja digitalización.
            </div>
            <button onClick={onBanco} style={{
              marginTop: 8, background: "none", border: `1px solid ${T.gold}`,
              color: T.gold, borderRadius: 8, padding: "4px 10px",
              fontSize: 11, fontWeight: 600, cursor: "pointer"
            }}>Ver en mis ideas →</button>
          </div>
        </div>
      </Card>

      <div style={{ fontSize: 12, fontWeight: 600, color: T.textSec, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Radar · {obs.length} observaciones
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {obs.map(o => (
          <Card key={o.id} style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.4, marginBottom: 6 }}>{o.texto}</div>
                <Badge color={tagColors[o.tag] || T.accent}>{o.tag}</Badge>
              </div>
              <div style={{ textAlign: "center", minWidth: 42 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: "50%",
                  background: `conic-gradient(${T.accent} ${o.pot}%, ${T.border} 0)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", background: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 800, color: T.accent,
                    fontFamily: "'IBM Plex Mono', monospace"
                  }}>{o.pot}</div>
                </div>
                <div style={{ fontSize: 9, color: T.textSec, marginTop: 2 }}>potencial</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PANTALLA 3 — BANCO DE IDEAS
// ════════════════════════════════════════════════════════════════════════════
function Banco({ onBack, onSprint }) {
  const [filtro, setFiltro] = useState("todas");

  const ideas = [
    { id: 1, titulo: "App de plomeros de confianza", origen: "cazador", potencial: 91, estado: "nueva", emoji: "🔧", desc: "Conectar usuarios con técnicos verificados en menos de 2 horas." },
    { id: 2, titulo: "Consultoría contable para freelancers", origen: "mapa", potencial: 82, estado: "nueva", emoji: "💼", desc: "Declaraciones fiscales simples a precio justo para independientes." },
    { id: 3, titulo: "Newsletter de finanzas personales", origen: "mapa", potencial: 74, estado: "en_sprint", emoji: "📰", desc: "Consejos prácticos para empleados que quieren invertir su sueldo." },
  ];

  const filtros = ["todas", "cazador", "mapa", "en_sprint"];
  const filtradas = filtro === "todas" ? ideas : ideas.filter(i => i.origen === filtro || i.estado === filtro);

  const estadoColor = { nueva: T.accent, en_sprint: T.gold, descartada: T.alert };
  const estadoLabel = { nueva: "Nueva", en_sprint: "En sprint", descartada: "Descartada" };

  return (
    <div>
      <BackBtn onClick={onBack} />

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.text, marginBottom: 4 }}>Mis Ideas</div>
        <div style={{ fontSize: 13, color: T.textSec }}>Elige una idea para lanzar tu sprint personalizado</div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {filtros.map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{
            background: filtro === f ? T.accent : "#fff",
            color: filtro === f ? "#fff" : T.textSec,
            border: `1px solid ${filtro === f ? T.accent : T.border}`,
            borderRadius: 99, padding: "6px 14px", fontSize: 12,
            fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            fontFamily: "inherit", transition: "all 0.2s"
          }}>
            {f === "todas" ? "Todas" : f === "cazador" ? "👂 Cazador" : f === "mapa" ? "🗺️ Mapa" : "⚡ En sprint"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtradas.map(idea => (
          <Card key={idea.id} style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ fontSize: 26, lineHeight: 1 }}>{idea.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{idea.titulo}</div>
                  <div style={{
                    background: T.accent + "18", color: T.accent, borderRadius: 99,
                    padding: "2px 8px", fontSize: 11, fontWeight: 700,
                    fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0, marginLeft: 8
                  }}>{idea.potencial}</div>
                </div>
                <div style={{ fontSize: 12, color: T.textSec, lineHeight: 1.5, marginBottom: 8 }}>{idea.desc}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Badge color={estadoColor[idea.estado]}>{estadoLabel[idea.estado]}</Badge>
                  <Badge color={T.textSec}>{idea.origen === "cazador" ? "👂 Cazador" : "🗺️ Mapa"}</Badge>
                </div>
              </div>
            </div>

            {idea.estado !== "en_sprint" ? (
              <button onClick={() => onSprint(idea)} style={{
                width: "100%", background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 700,
                color: T.accent, cursor: "pointer", fontFamily: "inherit"
              }}>
                ⚡ Lanzar sprint para esta idea
              </button>
            ) : (
              <button onClick={() => onSprint(idea)} style={{
                width: "100%", background: T.gold + "18", border: `1px solid ${T.gold}`,
                borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 700,
                color: T.gold, cursor: "pointer", fontFamily: "inherit"
              }}>
                Continuar sprint →
              </button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PANTALLA 4 — SPRINT (generado por AI para idea específica)
// ════════════════════════════════════════════════════════════════════════════
function Sprint({ idea, onBack }) {
  const [diaActivo, setDiaActivo] = useState(0);
  const [completados, setCompletados] = useState([]);
  const [generando, setGenerando] = useState(false);

  const tareasEjemplo = [
    { n: 1, emoji: "🔍", titulo: "Validar el problema", tarea: `Habla con 3 personas que hayan necesitado "${idea?.titulo}" recientemente`, duracion: "20 min", detalle: "No les preguntes si comprarían tu solución. Pregúntales cuándo fue la última vez que tuvieron este problema y qué hicieron.", meta: "Confirmar que el problema es real y frecuente" },
    { n: 2, emoji: "🎯", titulo: "Definir tu cliente", tarea: "Describe con precisión quién tiene este problema más urgente", duracion: "15 min", detalle: "¿Edad? ¿Dónde vive? ¿Por qué no lo ha resuelto antes? Cuanto más específico, más fácil llegar a ellos.", meta: "Un perfil de cliente concreto" },
    { n: 3, emoji: "💡", titulo: "Diseñar la solución mínima", tarea: "¿Cuál es la versión más simple que resolvería el 80% del problema?", duracion: "15 min", detalle: "No el producto ideal. La versión que podrías lanzar esta semana con lo que ya tienes.", meta: "Una solución que puedas probar sin construir nada" },
    { n: 4, emoji: "💬", titulo: "Conseguir tu primer interesado", tarea: "Encuentra 1 persona con el problema y preséntale tu solución", duracion: "30 min", detalle: "No necesitas un producto. Solo di: 'Estoy trabajando en algo que resuelve X. ¿Tendrías 15 minutos para contarme tu experiencia?'", meta: "1 conversación real con un potencial cliente" },
    { n: 5, emoji: "🚀", titulo: "Definir el experimento", tarea: "Diseña el experimento más pequeño posible para validar si alguien pagaría", duracion: "20 min", detalle: "¿Puedes cobrar antes de construir? ¿Puedes hacer la primera versión manualmente? El objetivo no es escalar, es aprender.", meta: "Un experimento listo para lanzar esta semana" },
  ];

  const dia = tareasEjemplo[diaActivo];
  const progreso = Math.round((completados.length / tareasEjemplo.length) * 100);

  return (
    <div>
      <BackBtn onClick={onBack} />

      <HeroCard style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: T.textSec, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Sprint · 5 días</div>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 800, lineHeight: 1.3, marginBottom: 4 }}>{idea?.titulo || "Mi idea"}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: T.gold + "25", borderRadius: 6, padding: "3px 8px" }}>
              <span style={{ fontSize: 10 }}>✨</span>
              <span style={{ color: T.gold, fontSize: 11, fontWeight: 600 }}>Sprint generado por AI</span>
            </div>
          </div>
          <div style={{ textAlign: "center", minWidth: 52 }}>
            <div style={{ color: T.gold, fontSize: 26, fontWeight: 800, fontFamily: "'IBM Plex Mono', monospace" }}>{progreso}%</div>
            <div style={{ color: T.textSec, fontSize: 10 }}>avance</div>
          </div>
        </div>
        <div style={{ height: 4, background: "#ffffff20", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progreso}%`, background: T.gold, borderRadius: 99, transition: "width 0.5s" }} />
        </div>
      </HeroCard>

      {/* Timeline */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
        {tareasEjemplo.map((d, i) => {
          const done = completados.includes(i);
          const active = i === diaActivo;
          return (
            <button key={i} onClick={() => setDiaActivo(i)} style={{
              minWidth: 56, padding: "8px 6px", borderRadius: 12,
              background: active ? T.accent : done ? T.surface : "#fff",
              border: `1.5px solid ${active ? T.accent : done ? T.accent + "50" : T.border}`,
              cursor: "pointer", transition: "all 0.2s",
              boxShadow: active ? `0 4px 12px ${T.accent}35` : "none",
              fontFamily: "inherit"
            }}>
              <div style={{ fontSize: 15, marginBottom: 2 }}>{done && !active ? "✅" : d.emoji}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: active ? "#fff" : done ? T.accent : T.textSec }}>Día {d.n}</div>
            </button>
          );
        })}
      </div>

      {/* Día activo */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 30, lineHeight: 1 }}>{dia.emoji}</div>
          <div>
            <div style={{ fontSize: 11, color: T.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Día {dia.n} · {dia.titulo}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{dia.tarea}</div>
          </div>
        </div>

        <div style={{ background: T.bg, borderRadius: 10, padding: "12px", marginBottom: 10, fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>
          {dia.detalle}
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          <Badge color={T.accent}>⏱ {dia.duracion}</Badge>
          <Badge color={T.gold}>🎯 {dia.meta}</Badge>
        </div>

        {/* Área de notas */}
        <textarea
          placeholder="Anota aquí lo que descubres en esta tarea..."
          style={{
            width: "100%", minHeight: 80, border: `1px solid ${T.border}`,
            borderRadius: 10, padding: "10px 12px", fontSize: 12,
            fontFamily: "inherit", color: T.text, background: T.bg,
            resize: "vertical", outline: "none", boxSizing: "border-box",
            lineHeight: 1.6
          }}
        />

        <div style={{ marginTop: 12 }}>
          <Btn onClick={() => {
            if (!completados.includes(diaActivo)) setCompletados(c => [...c, diaActivo]);
            if (diaActivo < tareasEjemplo.length - 1) setDiaActivo(d => d + 1);
          }}>
            {completados.includes(diaActivo) ? `Ir al Día ${diaActivo + 2} →` : "Marcar como completado ✓"}
          </Btn>
        </div>
      </Card>

      {completados.length === tareasEjemplo.length && (
        <Card style={{ borderLeft: `3px solid ${T.gold}`, background: T.gold + "08", padding: "14px 16px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.gold, marginBottom: 4 }}>🎉 Sprint completado</div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>
            Terminaste los 5 días. Tu idea ya tiene validación real. El siguiente paso es tu primer experimento.
          </div>
        </Card>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MINI CHAT FLOTANTE — AI con contexto del sprint
// ════════════════════════════════════════════════════════════════════════════
function MiniChat({ pantalla, ideaActiva, onClose }) {
  const [msgs, setMsgs] = useState([
    { role: "ai", texto: pantalla === "sprint" && ideaActiva ? `Hola 👋 Estoy aquí para ayudarte con tu sprint de "${ideaActiva.titulo}". ¿En qué te puedo orientar?` : "Hola 👋 ¿En qué te puedo ayudar con tu módulo de ideas?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const enviar = async () => {
    if (!input.trim() || loading) return;
    const texto = input.trim();
    setInput("");
    setMsgs(m => [...m, { role: "user", texto }]);
    setLoading(true);

    try {
      const contexto = pantalla === "sprint" && ideaActiva
        ? `El usuario está en el sprint de la idea: "${ideaActiva.titulo}". ${ideaActiva.desc || ""}. Responde de forma concisa y accionable, máximo 3 oraciones. Actúa como un coach de negocios empático y directo.`
        : `El usuario está explorando ideas de negocio en la app Fastlane Compass. Responde de forma concisa y accionable, máximo 3 oraciones. Actúa como un coach de negocios empático y directo.`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: contexto,
          messages: [
            ...msgs.filter(m => m.role === "user").map(m => ({ role: "user", content: m.texto })),
            { role: "user", content: texto }
          ]
        })
      });

      const data = await res.json();
      const respuesta = data.content?.[0]?.text || "No pude responder en este momento.";
      setMsgs(m => [...m, { role: "ai", texto: respuesta }]);
    } catch {
      setMsgs(m => [...m, { role: "ai", texto: "Hubo un problema al conectar con el coach. Intenta de nuevo." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", bottom: 80, right: 16, width: 300, maxHeight: 420,
      background: "#fff", borderRadius: 18, boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
      border: `1px solid ${T.border}`, display: "flex", flexDirection: "column",
      overflow: "hidden", zIndex: 1000
    }}>
      {/* Header */}
      <div style={{ background: T.dark, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.gold + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✨</div>
          <div>
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>Coach AI</div>
            <div style={{ color: T.textSec, fontSize: 10 }}>{pantalla === "sprint" ? `Sprint · ${ideaActiva?.titulo?.slice(0, 20)}...` : "Ideas · Explorando"}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.textSec, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
      </div>

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "82%", padding: "9px 12px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              background: m.role === "user" ? T.accent : T.surface,
              color: m.role === "user" ? "#fff" : T.text,
              fontSize: 12, lineHeight: 1.5
            }}>{m.texto}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ background: T.surface, borderRadius: "14px 14px 14px 4px", padding: "10px 14px", display: "flex", gap: 4, alignItems: "center" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: T.textSec,
                  animation: "bounce 1s infinite", animationDelay: `${i * 0.2}s`
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && enviar()}
          placeholder="Escribe tu duda..."
          style={{
            flex: 1, border: `1px solid ${T.border}`, borderRadius: 10,
            padding: "8px 10px", fontSize: 12, outline: "none",
            fontFamily: "inherit", color: T.text
          }}
        />
        <button onClick={enviar} disabled={loading} style={{
          background: T.accent, color: "#fff", border: "none",
          borderRadius: 10, padding: "8px 12px", fontSize: 13,
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1
        }}>→</button>
      </div>

      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// ROOT — Navegación entre pantallas
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [pantalla, setPantalla] = useState("mapa");
  const [ideaActiva, setIdeaActiva] = useState(null);
  const [chatAbierto, setChatAbierto] = useState(false);

  const navLabels = { mapa: "🗺️ Mapa", cazador: "👂 Cazador", banco: "💡 Mis Ideas", sprint: "⚡ Sprint" };

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'IBM Plex Sans', sans-serif", position: "relative" }}>

      {/* Contenido principal */}
      <div style={{ maxWidth: 390, margin: "0 auto", padding: "24px 16px 100px" }}>

        {/* Indicador de pantalla */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.textSec, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Fastlane Compass · {navLabels[pantalla]}
          </div>
          {ideaActiva && pantalla === "sprint" && (
            <Badge color={T.gold}>AI generado</Badge>
          )}
        </div>

        {pantalla === "mapa" && (
          <Mapa
            onCamino={(c) => { setIdeaActiva(null); setPantalla("banco"); }}
            onCazador={() => setPantalla("cazador")}
            onBanco={() => setPantalla("banco")}
          />
        )}
        {pantalla === "cazador" && (
          <Cazador onBack={() => setPantalla("mapa")} onBanco={() => setPantalla("banco")} />
        )}
        {pantalla === "banco" && (
          <Banco onBack={() => setPantalla("mapa")} onSprint={(idea) => { setIdeaActiva(idea); setPantalla("sprint"); }} />
        )}
        {pantalla === "sprint" && (
          <Sprint idea={ideaActiva} onBack={() => setPantalla("banco")} />
        )}
      </div>

      {/* Burbuja chat flotante */}
      {!chatAbierto && (
        <button onClick={() => setChatAbierto(true)} style={{
          position: "fixed", bottom: 76, right: 16, width: 50, height: 50,
          borderRadius: "50%", background: T.dark, border: `2px solid ${T.gold}`,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 20px rgba(0,0,0,0.2)`, fontSize: 20, zIndex: 999,
          transition: "transform 0.2s"
        }}>✨</button>
      )}

      {chatAbierto && (
        <MiniChat
          pantalla={pantalla}
          ideaActiva={ideaActiva}
          onClose={() => setChatAbierto(false)}
        />
      )}

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: 60,
        background: "#fff", borderTop: `1px solid ${T.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-around",
        maxWidth: 390, margin: "0 auto"
      }}>
        {[
          { id: "mapa", emoji: "🗺️", label: "Mapa" },
          { id: "cazador", emoji: "👂", label: "Cazador" },
          { id: "banco", emoji: "💡", label: "Ideas" },
          { id: "sprint", emoji: "⚡", label: "Sprint", disabled: !ideaActiva },
        ].map(n => (
          <button key={n.id} onClick={() => !n.disabled && setPantalla(n.id)} style={{
            background: "none", border: "none", cursor: n.disabled ? "not-allowed" : "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            opacity: n.disabled ? 0.3 : 1, fontFamily: "inherit"
          }}>
            <div style={{ fontSize: 18 }}>{n.emoji}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: pantalla === n.id ? T.accent : T.textSec }}>{n.label}</div>
            {pantalla === n.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.accent }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
