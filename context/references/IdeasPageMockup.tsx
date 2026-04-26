// @ts-nocheck
import { useState } from "react";

const ideas = [
  {
    id: 1,
    title: "App de turnos para barberías",
    concept: "Plataforma simple de reservas para barberías independientes sin sistema digital",
    status: "construyendo",
    cents_score: 34,
    lastActivity: 2,
    nextStep: "Hablar con 3 dueños de barbería esta semana",
    businessModel: "saas",
    committed_at: "2026-03-10",
  },
  {
    id: 2,
    title: "Curso de finanzas para freelancers",
    concept: "Contenido educativo sobre cómo manejar impuestos y flujo de caja siendo independiente",
    status: "validando",
    cents_score: 28,
    lastActivity: 5,
    nextStep: "Publicar post de LinkedIn para medir interés",
    businessModel: "contenido",
    committed_at: "2026-04-01",
  },
  {
    id: 3,
    title: "Servicio de limpieza de autos a domicilio",
    concept: "Lavado premium en el lugar donde estés, sin ir a un local",
    status: "committed",
    cents_score: 22,
    lastActivity: 12,
    nextStep: "Completar evaluación CENTS",
    businessModel: "servicio",
    committed_at: "2026-04-14",
  },
  {
    id: 4,
    title: "Newsletter de oportunidades de inversión local",
    concept: "Resumen semanal de propiedades, negocios y activos en tu ciudad",
    status: "generated",
    cents_score: null,
    lastActivity: 1,
    nextStep: "Evaluar con CENTS",
    businessModel: "contenido",
    committed_at: null,
  },
  {
    id: 5,
    title: "Herramienta de presupuestos para contratistas",
    concept: "Calculadora rápida para hacer cotizaciones de obra en el celular",
    status: "generated",
    cents_score: null,
    lastActivity: 18,
    nextStep: "Evaluar con CENTS",
    businessModel: "saas",
    committed_at: null,
  },
  {
    id: 6,
    title: "Renta de espacios para fotógrafos",
    concept: "Studios modulares por hora para sesiones fotográficas profesionales",
    status: "discarded",
    cents_score: 15,
    lastActivity: 30,
    nextStep: null,
    businessModel: "renta",
    committed_at: null,
  },
];

const STATUS_META = {
  generated:    { label: "Nueva",        color: "#7A9A8A", bg: "rgba(122,154,138,0.12)", dot: "#7A9A8A" },
  committed:    { label: "Comprometida", color: "#C69B30", bg: "rgba(198,155,48,0.12)",  dot: "#C69B30" },
  validando:    { label: "Validando",    color: "#3A9E6A", bg: "rgba(58,158,106,0.12)",  dot: "#3A9E6A" },
  construyendo: { label: "Construyendo", color: "#2E7D52", bg: "rgba(46,125,82,0.18)",   dot: "#2E7D52" },
  operando:     { label: "Operando",     color: "#1a6e3c", bg: "rgba(26,110,60,0.2)",    dot: "#1a6e3c" },
  discarded:    { label: "Descartada",   color: "#7A9A8A", bg: "rgba(122,154,138,0.08)", dot: "#ccc"    },
};

const MODEL_LABEL = {
  saas: "SaaS", producto_fisico: "Producto", servicio: "Servicio",
  contenido: "Contenido", renta: "Renta", custom: "Otro",
};

function ScoreBadge({ score }) {
  if (score === null) return (
    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#7A9A8A", letterSpacing: -0.5 }}>
      —/50
    </span>
  );
  const pct = score / 50;
  const color = pct >= 0.7 ? "#2E7D52" : pct >= 0.5 ? "#C69B30" : "#E84434";
  return (
    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color, fontWeight: 700, letterSpacing: -0.5 }}>
      {score}/50
    </span>
  );
}

function ActivityDot({ days }) {
  if (days <= 3) return null;
  const urgent = days > 14;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, color: urgent ? "#E84434" : "#C69B30",
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: urgent ? "#E84434" : "#C69B30",
        display: "inline-block",
        boxShadow: urgent ? "0 0 6px #E84434" : "0 0 6px #C69B30",
      }} />
      {days}d sin actividad
    </span>
  );
}

function IdeaCard({ idea, onClick, compact }) {
  const meta = STATUS_META[idea.status];
  const stale = idea.lastActivity > 7 && idea.status !== "discarded";

  return (
    <div
      onClick={() => onClick(idea)}
      style={{
        background: idea.status === "discarded" ? "rgba(234,240,236,0.4)" : "white",
        border: `1.5px solid ${stale && idea.status !== "discarded" ? "rgba(198,155,48,0.3)" : "#e0ebe4"}`,
        borderRadius: 14,
        padding: compact ? "12px 14px" : "16px 18px",
        cursor: "pointer",
        transition: "all 0.18s ease",
        opacity: idea.status === "discarded" ? 0.55 : 1,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        if (idea.status !== "discarded") {
          e.currentTarget.style.borderColor = "#2E7D52";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(46,125,82,0.1)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = stale && idea.status !== "discarded" ? "rgba(198,155,48,0.3)" : "#e0ebe4";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Status bar top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: meta.dot, opacity: idea.status === "discarded" ? 0.3 : 0.7,
        borderRadius: "14px 14px 0 0",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: compact ? 13 : 14,
              fontWeight: 600,
              color: "#141F19",
              lineHeight: 1.3,
            }}>
              {idea.title}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
              color: meta.color, background: meta.bg,
              padding: "2px 7px", borderRadius: 20,
              fontFamily: "'IBM Plex Sans', sans-serif",
              textTransform: "uppercase",
            }}>
              {meta.label}
            </span>
          </div>

          {!compact && (
            <p style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 12, color: "#7A9A8A", lineHeight: 1.5,
              margin: "0 0 10px 0",
            }}>
              {idea.concept}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <ScoreBadge score={idea.cents_score} />
            <span style={{
              fontSize: 11, color: "#7A9A8A",
              fontFamily: "'IBM Plex Sans', sans-serif",
              background: "#EAF0EC", padding: "2px 7px", borderRadius: 8,
            }}>
              {MODEL_LABEL[idea.businessModel]}
            </span>
            <ActivityDot days={idea.lastActivity} />
          </div>
        </div>

        {/* Next step arrow */}
        {idea.nextStep && idea.status !== "discarded" && (
          <div style={{
            flexShrink: 0, width: 28, height: 28,
            background: "#EAF0EC", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#2E7D52", fontSize: 14, fontWeight: 700,
          }}>
            →
          </div>
        )}
      </div>

      {/* Next step hint */}
      {idea.nextStep && idea.status !== "discarded" && !compact && (
        <div style={{
          marginTop: 10, padding: "8px 12px",
          background: "#F2F7F4", borderRadius: 8,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 12, color: "#2E7D52", fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Próximo paso:
          </span>
          <span style={{ fontSize: 12, color: "#141F19", fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {idea.nextStep}
          </span>
        </div>
      )}
    </div>
  );
}

function IdeaDetail({ idea, onClose }) {
  const meta = STATUS_META[idea.status];
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(20,31,25,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "white", borderRadius: "24px 24px 0 0",
          width: "100%", maxWidth: 480,
          padding: "28px 24px 40px",
          animation: "slideUp 0.25s ease",
        }}
      >
        <div style={{ width: 36, height: 4, background: "#e0ebe4", borderRadius: 99, margin: "0 auto 24px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <h2 style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 20, fontWeight: 700, color: "#141F19",
            margin: 0, lineHeight: 1.3, flex: 1,
          }}>
            {idea.title}
          </h2>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
            color: meta.color, background: meta.bg,
            padding: "4px 10px", borderRadius: 20,
            fontFamily: "'IBM Plex Sans', sans-serif",
            textTransform: "uppercase", marginLeft: 12, flexShrink: 0,
          }}>
            {meta.label}
          </span>
        </div>

        <p style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 14, color: "#7A9A8A", lineHeight: 1.6, marginBottom: 20,
        }}>
          {idea.concept}
        </p>

        {/* Score visual */}
        <div style={{
          background: "#F2F7F4", borderRadius: 14,
          padding: "14px 16px", marginBottom: 16,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 11, color: "#7A9A8A", fontFamily: "'IBM Plex Sans', sans-serif", marginBottom: 2 }}>
              Score CENTS
            </div>
            <ScoreBadge score={idea.cents_score} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#7A9A8A", fontFamily: "'IBM Plex Sans', sans-serif", marginBottom: 2 }}>
              Modelo
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#141F19", fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {MODEL_LABEL[idea.businessModel]}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#7A9A8A", fontFamily: "'IBM Plex Sans', sans-serif", marginBottom: 2 }}>
              Actividad
            </div>
            <span style={{
              fontSize: 13, fontWeight: 600,
              color: idea.lastActivity > 14 ? "#E84434" : idea.lastActivity > 7 ? "#C69B30" : "#2E7D52",
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {idea.lastActivity}d atrás
            </span>
          </div>
        </div>

        {idea.nextStep && (
          <div style={{
            background: "#1A2520", borderRadius: 14,
            padding: "14px 16px", marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, color: "#7A9A8A", fontFamily: "'IBM Plex Sans', sans-serif", marginBottom: 6 }}>
              PRÓXIMO PASO
            </div>
            <div style={{ fontSize: 14, color: "white", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}>
              {idea.nextStep}
            </div>
          </div>
        )}

        {/* Actions */}
        {idea.status !== "discarded" && (
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{
              flex: 1, padding: "13px 0",
              background: "#2E7D52", color: "white",
              border: "none", borderRadius: 12, cursor: "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 14, fontWeight: 600,
            }}>
              Continuar →
            </button>
            <button style={{
              padding: "13px 16px",
              background: "#F2F7F4", color: "#7A9A8A",
              border: "none", borderRadius: 12, cursor: "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 14,
            }}>
              ⋯
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NewIdeaSheet({ onClose }) {
  const [selected, setSelected] = useState(null);
  const options = [
    { key: "sin_idea", icon: "🧭", label: "No sé por dónde empezar", sub: "La AI te ayuda a encontrar ideas basadas en tus habilidades" },
    { key: "idea_vaga", icon: "💡", label: "Tengo algo en mente pero vago", sub: "Refinamos juntos hasta que tenga forma" },
    { key: "idea_clara", icon: "🎯", label: "Tengo una idea clara", sub: "Evaluamos directamente con el método CENTS" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(20,31,25,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "white", borderRadius: "24px 24px 0 0",
          width: "100%", maxWidth: 480,
          padding: "28px 24px 40px",
          animation: "slideUp 0.25s ease",
        }}
      >
        <div style={{ width: 36, height: 4, background: "#e0ebe4", borderRadius: 99, margin: "0 auto 24px" }} />
        <h2 style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 20, fontWeight: 700, color: "#141F19",
          margin: "0 0 6px",
        }}>
          Nueva idea
        </h2>
        <p style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 13, color: "#7A9A8A", marginBottom: 20,
        }}>
          ¿En qué punto estás?
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {options.map(o => (
            <div
              key={o.key}
              onClick={() => setSelected(o.key)}
              style={{
                padding: "14px 16px",
                border: `2px solid ${selected === o.key ? "#2E7D52" : "#e0ebe4"}`,
                borderRadius: 14, cursor: "pointer",
                background: selected === o.key ? "#F2F7F4" : "white",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>{o.icon}</span>
                <div>
                  <div style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 14, fontWeight: 600, color: "#141F19", marginBottom: 2,
                  }}>
                    {o.label}
                  </div>
                  <div style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 12, color: "#7A9A8A",
                  }}>
                    {o.sub}
                  </div>
                </div>
                {selected === o.key && (
                  <span style={{ marginLeft: "auto", color: "#2E7D52", fontSize: 18 }}>✓</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          style={{
            width: "100%", padding: "14px 0",
            background: selected ? "#2E7D52" : "#e0ebe4",
            color: selected ? "white" : "#7A9A8A",
            border: "none", borderRadius: 12, cursor: selected ? "pointer" : "default",
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 15, fontWeight: 600,
            transition: "all 0.2s ease",
          }}
        >
          Empezar →
        </button>
      </div>
    </div>
  );
}

export default function IdeasPage() {
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState("activas");

  const activas = ideas.filter(i => ["committed", "validando", "construyendo", "operando"].includes(i.status));
  const nuevas = ideas.filter(i => i.status === "generated");
  const descartadas = ideas.filter(i => i.status === "discarded");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .idea-enter { animation: fadeIn 0.3s ease forwards; }
      `}</style>

      <div style={{
        background: "#F2F7F4", minHeight: "100vh",
        fontFamily: "'IBM Plex Sans', sans-serif",
        maxWidth: 480, margin: "0 auto",
        paddingBottom: 100,
      }}>

        {/* Header */}
        <div style={{ padding: "24px 20px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div>
              <h1 style={{
                fontSize: 22, fontWeight: 700, color: "#141F19",
                fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.2,
              }}>
                Ideas
              </h1>
              <p style={{ fontSize: 12, color: "#7A9A8A", marginTop: 2 }}>
                {activas.length} en marcha · {nuevas.length} por evaluar
              </p>
            </div>
            <button
              onClick={() => setShowNew(true)}
              style={{
                background: "#2E7D52", color: "white",
                border: "none", borderRadius: 20, cursor: "pointer",
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 13, fontWeight: 600,
                padding: "8px 16px",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              + Nueva
            </button>
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 8, marginTop: 16, overflowX: "auto", paddingBottom: 4 }}>
            {[
              { key: "activas", label: "En marcha" },
              { key: "nuevas", label: "Por evaluar" },
              { key: "todas", label: "Todas" },
              { key: "descartadas", label: "Descartadas" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                  background: filter === tab.key ? "#141F19" : "#EAF0EC",
                  color: filter === tab.key ? "white" : "#7A9A8A",
                  fontSize: 12, fontWeight: 600,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "20px 20px 0" }}>

          {/* === EN MARCHA === */}
          {(filter === "activas" || filter === "todas") && activas.length > 0 && (
            <section style={{ marginBottom: 28 }} className="idea-enter">
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 12,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#141F19", letterSpacing: 0.2 }}>
                  EN MARCHA
                </span>
                <span style={{
                  fontSize: 11, color: "#2E7D52", fontWeight: 600,
                  background: "rgba(46,125,82,0.1)", padding: "2px 8px", borderRadius: 10,
                }}>
                  {activas.length} ideas
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {activas.map(idea => (
                  <IdeaCard key={idea.id} idea={idea} onClick={setSelected} compact={false} />
                ))}
              </div>
            </section>
          )}

          {/* === POR EVALUAR === */}
          {(filter === "nuevas" || filter === "todas") && nuevas.length > 0 && (
            <section style={{ marginBottom: 28 }} className="idea-enter">
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 12,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#141F19", letterSpacing: 0.2 }}>
                  POR EVALUAR
                </span>
                <span style={{
                  fontSize: 11, color: "#C69B30", fontWeight: 600,
                  background: "rgba(198,155,48,0.1)", padding: "2px 8px", borderRadius: 10,
                }}>
                  {nuevas.length} ideas
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {nuevas.map(idea => (
                  <IdeaCard key={idea.id} idea={idea} onClick={setSelected} compact={true} />
                ))}
              </div>
            </section>
          )}

          {/* === DESCARTADAS === */}
          {(filter === "descartadas" || filter === "todas") && descartadas.length > 0 && (
            <section style={{ marginBottom: 28 }} className="idea-enter">
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 12,
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#7A9A8A", letterSpacing: 0.2 }}>
                  DESCARTADAS
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {descartadas.map(idea => (
                  <IdeaCard key={idea.id} idea={idea} onClick={setSelected} compact={true} />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {filter === "activas" && activas.length === 0 && (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              color: "#7A9A8A", fontFamily: "'IBM Plex Sans', sans-serif",
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🧭</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#141F19", marginBottom: 6 }}>
                Sin ideas en marcha
              </div>
              <div style={{ fontSize: 13, marginBottom: 20 }}>
                Comprometete con una idea para empezar a validarla
              </div>
              <button
                onClick={() => setShowNew(true)}
                style={{
                  background: "#2E7D52", color: "white",
                  border: "none", borderRadius: 12, cursor: "pointer",
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 14, fontWeight: 600,
                  padding: "12px 24px",
                }}
              >
                + Agregar idea
              </button>
            </div>
          )}
        </div>

        {/* FAB mobile */}
        <button
          onClick={() => setShowNew(true)}
          style={{
            position: "fixed", bottom: 24, right: 24,
            width: 52, height: 52, borderRadius: "50%",
            background: "#2E7D52", color: "white",
            border: "none", cursor: "pointer",
            fontSize: 24, fontWeight: 300,
            boxShadow: "0 4px 20px rgba(46,125,82,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.15s ease",
            zIndex: 40,
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          +
        </button>
      </div>

      {/* Modals */}
      {selected && <IdeaDetail idea={selected} onClose={() => setSelected(null)} />}
      {showNew && <NewIdeaSheet onClose={() => setShowNew(false)} />}
    </>
  );
}
