import { useState, useRef, useEffect } from "react";

const PHASES = [
  { key: "observar", label: "Observar", short: "O", color: "#7A9A8A", description: "Exploramos tu entorno y habilidades" },
  { key: "definir",  label: "Definir",  short: "D", color: "#C69B30", description: "Delimitamos el problema concreto" },
  { key: "idear",    label: "Idear",    short: "I", color: "#3A9E6A", description: "Generamos soluciones de negocio" },
  { key: "evaluar",  label: "Evaluar",  short: "E", color: "#2E7D52", description: "Puntuamos con el método CENTS" },
];

const COACH_THINKING = [
  "Analizando tu contexto...",
  "Procesando lo que dijiste...",
  "Construyendo la siguiente pregunta...",
  "Conectando puntos...",
];

// Preguntas de coaching orientadas a acción por fase (método GROW + socrático)
const COACHING_QUESTIONS = {
  observar: [
    "¿Cuándo fue la última vez que alguien te pagó — o te hubiera pagado — por resolver exactamente ese problema?",
    "Si ese caos que describís desapareciera mañana, ¿quién sería el primero en notarlo?",
    "¿Conocés a alguien que ya haya intentado resolver esto? ¿Qué pasó?",
    "¿Cuántas veces por semana te topás con este problema — o alguien cercano te lo menciona?",
    "Si tuvieras que cobrarle a alguien por solucionar esto hoy mismo, ¿cómo lo harías?",
  ],
  definir: [
    "Si tuvieras que describir este problema en una sola oración — sin mencionar tu solución — ¿cómo lo dirías?",
    "¿Quién sufre más este problema: el dueño del negocio, el empleado, o el cliente?",
    "¿El problema es urgente o solo incómodo? ¿La gente lo tolera o activamente busca solución?",
    "¿Qué pasaría si este problema no se resuelve en los próximos 12 meses?",
    "¿Hay algún momento del día o de la semana donde este problema duele especialmente?",
  ],
  idear: [
    "De estas ideas, ¿cuál arrancarías si tuvieras 6 meses sin preocuparte por el dinero?",
    "¿Cuál de estas podés probar esta semana con menos de $100?",
    "Si solo pudieras elegir una — y tu reputación dependiera de que funcione — ¿cuál sería?",
    "¿Hay alguna versión de esto que no requiera que estés presente para que funcione?",
    "¿Cuál de estas podría generar tu primer $1.000 en menos de 90 días?",
  ],
  evaluar: [
    "¿Qué podés hacer esta semana que te dé evidencia real de si esto funciona o no?",
    "Si alguien copiara tu idea mañana exactamente, ¿qué tendrías que hacer para que igual ganes?",
    "¿Cuántos clientes necesitás para que esto reemplace tu ingreso actual?",
    "¿Qué es lo peor que puede pasar si apostás 3 meses a esta idea?",
    "¿En qué se parece esto a algo que ya hiciste bien antes?",
  ],
};

const SUGGESTIONS = {
  observar: ["Contame más sobre ese sector", "¿Qué habilidades tengo?", "No sé por dónde empezar"],
  definir:  ["El problema principal es...", "Los más afectados son...", "Todavía no lo tengo claro"],
  idear:    ["Me resuena la primera", "¿Podés darme más opciones?", "Quiero combinar ideas"],
  evaluar:  ["¿Cómo arranco esta semana?", "Necesito más tiempo para pensarlo", "Estoy listo para puntuar"],
};

const MOCK_HISTORY = [
  { role: "assistant", content: "Hola. Vamos a explorar esta idea juntos desde cero. Antes de cualquier análisis, quiero entender de dónde viene. ¿Qué fue lo que te hizo pensar en esto — una experiencia propia, algo que viste, o algo que alguien te contó?", phase: "observar" },
  { role: "user",      content: "Tengo contactos en el sector de barberías y siempre me comentan que manejar los turnos es un caos total.", phase: "observar" },
  { role: "assistant", content: "Eso es una señal. Ahora, una pregunta que quiero que pienses un momento antes de responder: ¿cuándo fue la última vez que alguien te pagó — o te hubiera pagado — por resolver exactamente ese problema?", phase: "observar" },
  { role: "user",      content: "Nunca directamente, pero sé que hay apps que cobran por esto.", phase: "observar" },
  { role: "assistant", content: "Bien. Eso me dice que el mercado existe. ¿Y cuántas barberías de las que conocés hoy mismo pagarían por dejar de manejar turnos por WhatsApp — esta semana, no \"algún día\"?", phase: "observar" },
];

const IDEA = {
  title: "App de turnos para barberías",
  status: "validando",
  centsProgress: 35,
};

// ─── Components ──────────────────────────────────────────────────────────────

function PhaseBar({ currentPhase, completedPhases }) {
  const currentIdx = PHASES.findIndex(p => p.key === currentPhase);
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "0 20px" }}>
      {PHASES.map((phase, i) => {
        const isCompleted = completedPhases.includes(phase.key);
        const isCurrent   = phase.key === currentPhase;
        const isLocked    = i > currentIdx && !isCompleted;
        return (
          <div key={phase.key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700,
                fontFamily: "'IBM Plex Sans', sans-serif",
                background: isCompleted ? phase.color : isCurrent ? "#fff" : "rgba(255,255,255,0.08)",
                color: isCompleted ? "#fff" : isCurrent ? "#1A2520" : "rgba(255,255,255,0.3)",
                border: isCurrent ? `2px solid ${phase.color}` : "2px solid transparent",
                transition: "all 0.4s ease",
                position: "relative",
                boxShadow: isCurrent ? `0 0 12px ${phase.color}55` : "none",
              }}>
                {isCompleted ? "✓" : phase.short}
              </div>
              <span style={{
                fontSize: 9, fontWeight: isCurrent ? 700 : 400,
                color: isCompleted ? phase.color : isCurrent ? "white" : "rgba(255,255,255,0.3)",
                fontFamily: "'IBM Plex Sans', sans-serif",
                letterSpacing: 0.5, textTransform: "uppercase",
              }}>
                {phase.label}
              </span>
            </div>
            {i < PHASES.length - 1 && (
              <div style={{
                height: 1.5, flex: 1, marginBottom: 16,
                background: isCompleted
                  ? `linear-gradient(90deg, ${phase.color}, ${PHASES[i+1].color})`
                  : "rgba(255,255,255,0.1)",
                transition: "background 0.6s ease",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChatBubble({ message, animate, isNew }) {
  const isUser = message.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 14,
      animation: animate ? "bubbleIn 0.35s cubic-bezier(0.34,1.56,0.64,1)" : "none",
    }}>
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "linear-gradient(135deg, #2E7D52, #1A2520)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, marginRight: 8, flexShrink: 0, alignSelf: "flex-end",
          border: "1.5px solid rgba(58,158,106,0.3)",
        }}>
          🧭
        </div>
      )}
      <div style={{ maxWidth: "78%" }}>
        <div style={{
          padding: isUser ? "10px 14px" : "12px 16px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
          background: isUser
            ? "linear-gradient(135deg, #2E7D52, #1A5C3A)"
            : "white",
          color: isUser ? "white" : "#141F19",
          fontSize: 14, lineHeight: 1.6,
          fontFamily: "'IBM Plex Sans', sans-serif",
          boxShadow: isUser
            ? "0 2px 12px rgba(46,125,82,0.25)"
            : "0 1px 8px rgba(0,0,0,0.06)",
          border: isUser ? "none" : "1px solid #EAF0EC",
        }}>
          {message.content}
        </div>
      </div>
      {isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "#EAF0EC",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, marginLeft: 8, flexShrink: 0, alignSelf: "flex-end",
        }}>
          👤
        </div>
      )}
    </div>
  );
}

function TypingIndicator({ thinkingText }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 14 }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%",
        background: "linear-gradient(135deg, #2E7D52, #1A2520)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, flexShrink: 0,
        border: "1.5px solid rgba(58,158,106,0.3)",
      }}>
        🧭
      </div>
      <div style={{
        padding: "10px 16px",
        background: "white", borderRadius: "4px 18px 18px 18px",
        border: "1px solid #EAF0EC",
        display: "flex", gap: 8, alignItems: "center",
        boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#2E7D52",
              animation: `bounce 1.2s ease infinite`,
              animationDelay: `${i * 0.18}s`,
            }} />
          ))}
        </div>
        <span style={{
          fontSize: 11, color: "#7A9A8A",
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontStyle: "italic",
        }}>
          {thinkingText}
        </span>
      </div>
    </div>
  );
}

function SuggestionChips({ phase, onSelect }) {
  const chips = SUGGESTIONS[phase] ?? [];
  return (
    <div style={{
      display: "flex", gap: 8, flexWrap: "wrap",
      padding: "8px 16px 4px",
    }}>
      {chips.map((chip, i) => (
        <button
          key={i}
          onClick={() => onSelect(chip)}
          style={{
            padding: "6px 12px",
            border: "1.5px solid #EAF0EC",
            borderRadius: 20, cursor: "pointer",
            background: "white", color: "#141F19",
            fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: 500,
            transition: "all 0.15s ease",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "#2E7D52";
            e.currentTarget.style.color = "#2E7D52";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "#EAF0EC";
            e.currentTarget.style.color = "#141F19";
          }}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}

function PhaseTransition({ from, to, summary, centsProgress, onContinue }) {
  const fromPhase = PHASES.find(p => p.label === from);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: "#0D1A14",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 24px",
      animation: "fadeInFull 0.5s ease",
      maxWidth: 480, margin: "0 auto",
    }}>
      {/* Particles */}
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 4, height: 4, borderRadius: "50%",
          background: fromPhase?.color ?? "#3A9E6A",
          top: `${15 + i * 12}%`,
          left: `${10 + i * 15}%`,
          animation: `float ${2 + i * 0.3}s ease-in-out infinite alternate`,
          opacity: 0.4,
        }} />
      ))}

      {/* Check circle */}
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: `radial-gradient(circle, ${fromPhase?.color}22, transparent)`,
        border: `2px solid ${fromPhase?.color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36, marginBottom: 20,
        animation: "scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both",
        boxShadow: `0 0 40px ${fromPhase?.color}44`,
      }}>
        ✓
      </div>

      <div style={{
        fontSize: 11, color: fromPhase?.color, fontWeight: 700,
        letterSpacing: 2, textTransform: "uppercase",
        fontFamily: "'IBM Plex Sans', sans-serif", marginBottom: 6,
        animation: "slideUp 0.4s ease 0.4s both",
      }}>
        Fase completada
      </div>

      <div style={{
        fontSize: 26, color: "white", fontWeight: 700,
        fontFamily: "'IBM Plex Sans', sans-serif",
        marginBottom: 28, textAlign: "center", lineHeight: 1.3,
        animation: "slideUp 0.4s ease 0.5s both",
      }}>
        {from} completado
      </div>

      {/* Summary */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 18, padding: "20px 22px",
        width: "100%", marginBottom: 16,
        animation: "slideUp 0.4s ease 0.6s both",
      }}>
        <div style={{
          fontSize: 11, color: "#7A9A8A", fontWeight: 600,
          letterSpacing: 1.2, textTransform: "uppercase",
          fontFamily: "'IBM Plex Sans', sans-serif", marginBottom: 10,
        }}>
          Lo que descubrimos
        </div>
        <div style={{
          fontSize: 14, color: "rgba(255,255,255,0.85)",
          fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.7,
          marginBottom: 16,
        }}>
          {summary.insight}
        </div>

        {/* CENTS mini progress */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          borderRadius: 10, padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 10, color: "#7A9A8A",
              fontFamily: "'IBM Plex Sans', sans-serif", marginBottom: 6,
            }}>
              Progreso CENTS estimado
            </div>
            <div style={{
              height: 4, background: "rgba(255,255,255,0.08)",
              borderRadius: 99, overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${centsProgress}%`,
                background: `linear-gradient(90deg, #C69B30, #2E7D52)`,
                borderRadius: 99,
                transition: "width 1s ease 0.8s",
                animation: "growBar 1s ease 0.8s both",
              }} />
            </div>
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 16, fontWeight: 700,
            color: centsProgress >= 60 ? "#3A9E6A" : "#C69B30",
          }}>
            {Math.round(centsProgress * 50 / 100)}/50
          </div>
        </div>
      </div>

      {/* Next objective */}
      <div style={{
        background: `${fromPhase?.color}15`,
        border: `1px solid ${fromPhase?.color}33`,
        borderRadius: 14, padding: "14px 18px",
        width: "100%", marginBottom: 28,
        animation: "slideUp 0.4s ease 0.7s both",
      }}>
        <div style={{
          fontSize: 10, color: fromPhase?.color, fontWeight: 700,
          letterSpacing: 1.2, textTransform: "uppercase",
          fontFamily: "'IBM Plex Sans', sans-serif", marginBottom: 6,
        }}>
          Próximo objetivo
        </div>
        <div style={{
          fontSize: 14, color: "rgba(255,255,255,0.9)",
          fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500,
        }}>
          {summary.next}
        </div>
      </div>

      <button
        onClick={onContinue}
        style={{
          background: `linear-gradient(135deg, #2E7D52, #1A5C3A)`,
          color: "white", border: "none", borderRadius: 14,
          cursor: "pointer", fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 15, fontWeight: 600, padding: "15px 0",
          width: "100%",
          boxShadow: "0 4px 20px rgba(46,125,82,0.4)",
          animation: "slideUp 0.4s ease 0.8s both",
        }}
      >
        Continuar a {to} →
      </button>
    </div>
  );
}

function IdeaSummaryEntry({ idea, onStart }) {
  const completedPhases = ["observar"];
  const currentPhaseIdx = 1;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      background: "#F2F7F4",
      display: "flex", flexDirection: "column",
      maxWidth: 480, margin: "0 auto",
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      {/* Dark header */}
      <div style={{
        background: "#1A2520",
        padding: "24px 20px 20px",
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 10, color: "#7A9A8A", fontWeight: 700,
          letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8,
        }}>
          Tu idea
        </div>
        <div style={{
          fontSize: 22, color: "white", fontWeight: 700, lineHeight: 1.3, marginBottom: 16,
        }}>
          {idea.title}
        </div>

        {/* Mini phase bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {PHASES.map((p, i) => {
            const done = completedPhases.includes(p.key);
            const current = i === currentPhaseIdx;
            return (
              <div key={p.key} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: done ? p.color : current ? "white" : "rgba(255,255,255,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    color: done ? "white" : current ? "#1A2520" : "rgba(255,255,255,0.3)",
                    border: current ? `2px solid ${p.color}` : "2px solid transparent",
                  }}>
                    {done ? "✓" : p.short}
                  </div>
                  <span style={{
                    fontSize: 8, color: done ? p.color : current ? "white" : "rgba(255,255,255,0.25)",
                    textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5,
                  }}>
                    {p.label}
                  </span>
                </div>
                {i < PHASES.length - 1 && (
                  <div style={{
                    height: 1, flex: 0.5, marginBottom: 14,
                    background: done ? p.color : "rgba(255,255,255,0.1)",
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
        {/* Last AI message visible */}
        <div style={{
          background: "white", borderRadius: 16, padding: "16px 18px",
          border: "1px solid #EAF0EC", marginBottom: 14,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: "linear-gradient(135deg, #2E7D52, #1A2520)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11,
            }}>
              🧭
            </div>
            <span style={{ fontSize: 11, color: "#7A9A8A", fontWeight: 600 }}>
              Última pregunta del coach
            </span>
          </div>
          <div style={{ fontSize: 14, color: "#141F19", lineHeight: 1.6, fontStyle: "italic" }}>
            "¿Y cuántas barberías de las que conocés hoy mismo pagarían por dejar de manejar turnos por WhatsApp — esta semana, no 'algún día'?"
          </div>
        </div>

        {/* Progress card */}
        <div style={{
          background: "white", borderRadius: 16, padding: "18px",
          border: "1px solid #EAF0EC", marginBottom: 14,
        }}>
          <div style={{
            fontSize: 10, color: "#7A9A8A", fontWeight: 700,
            letterSpacing: 1, textTransform: "uppercase", marginBottom: 14,
          }}>
            Estado de evaluación
          </div>
          {PHASES.map((phase, i) => {
            const done = completedPhases.includes(phase.key);
            const current = i === currentPhaseIdx;
            return (
              <div key={phase.key} style={{
                display: "flex", alignItems: "center", gap: 12,
                marginBottom: i < PHASES.length - 1 ? 14 : 0,
                opacity: i > currentPhaseIdx ? 0.4 : 1,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: done ? phase.color : current ? "#1A2520" : "#EAF0EC",
                  color: done || current ? "white" : "#7A9A8A",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                }}>
                  {done ? "✓" : phase.short}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontWeight: current ? 700 : 500,
                    color: done ? "#7A9A8A" : current ? "#141F19" : "#B0C4BA",
                    textDecoration: done ? "line-through" : "none",
                  }}>
                    {phase.label}
                  </div>
                  {current && (
                    <div style={{ fontSize: 11, color: "#7A9A8A", marginTop: 1 }}>
                      {phase.description}
                    </div>
                  )}
                </div>
                {done && <span style={{ fontSize: 10, color: phase.color, fontWeight: 700 }}>✓</span>}
                {current && (
                  <span style={{
                    fontSize: 10, color: "#C69B30",
                    background: "rgba(198,155,48,0.1)", padding: "2px 8px",
                    borderRadius: 10, fontWeight: 700,
                  }}>
                    SIGUIENTE
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Session note */}
        <div style={{
          background: "white", borderRadius: 16, padding: "14px 16px",
          border: "1px solid #EAF0EC",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ fontSize: 20 }}>🕐</div>
          <div>
            <div style={{ fontSize: 12, color: "#7A9A8A", marginBottom: 2 }}>
              Última sesión hace 2 días
            </div>
            <div style={{ fontSize: 13, color: "#141F19", fontWeight: 500 }}>
              Identificaste la oportunidad en barberías sin sistema digital
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 20px 40px", flexShrink: 0 }}>
        <button
          onClick={onStart}
          style={{
            width: "100%", padding: "15px 0",
            background: "linear-gradient(135deg, #2E7D52, #1A5C3A)",
            color: "white", border: "none", borderRadius: 14,
            cursor: "pointer", fontSize: 15, fontWeight: 600,
            fontFamily: "'IBM Plex Sans', sans-serif",
            boxShadow: "0 4px 20px rgba(46,125,82,0.3)",
          }}
        >
          Continuar → Definir
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function IdeaChatPage() {
  const [view, setView]                   = useState("summary");
  const [currentPhase, setCurrentPhase]   = useState("definir");
  const [completedPhases, setCompleted]   = useState(["observar"]);
  const [messages, setMessages]           = useState(MOCK_HISTORY);
  const [input, setInput]                 = useState("");
  const [isTyping, setIsTyping]           = useState(false);
  const [thinkingText, setThinkingText]   = useState("");
  const [showTransition, setTransition]   = useState(false);
  const [msgCount, setMsgCount]           = useState(2);
  const [animateIdx, setAnimateIdx]       = useState(null);
  const [showSuggestions, setShowSugg]    = useState(true);
  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);

  const phaseLimit  = 6;
  const remaining   = phaseLimit - msgCount;
  const currentPhaseData = PHASES.find(p => p.key === currentPhase);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text) => {
    if (!text.trim()) return;
    const userMsg = { role: "user", content: text, phase: currentPhase };
    const next    = [...messages, userMsg];
    setMessages(next);
    setAnimateIdx(next.length - 1);
    setInput("");
    setMsgCount(c => c + 1);
    setShowSugg(false);

    const newCount = msgCount + 1;
    const thinking = COACH_THINKING[Math.floor(Math.random() * COACH_THINKING.length)];
    setThinkingText(thinking);
    setIsTyping(true);

    setTimeout(() => {
      if (newCount >= phaseLimit) {
        const closing = {
          role: "assistant",
          content: "Hemos explorado bien esta fase. Ya tengo una imagen clara del problema. ¿Pasamos a definir exactamente qué resolvés y para quién?",
          phase: currentPhase,
        };
        setMessages(m => [...m, closing]);
        setAnimateIdx(m => m.length);
        setIsTyping(false);
        setTimeout(() => setTransition(true), 1600);
      } else {
        const pool = COACHING_QUESTIONS[currentPhase] ?? COACHING_QUESTIONS.observar;
        const question = pool[Math.floor(Math.random() * pool.length)];
        const aiMsg = { role: "assistant", content: question, phase: currentPhase };
        setMessages(m => {
          const updated = [...m, aiMsg];
          setAnimateIdx(updated.length - 1);
          return updated;
        });
        setIsTyping(false);
        setShowSugg(true);
      }
    }, 1800);
  };

  const handleTransitionContinue = () => {
    setTransition(false);
    setCompleted(p => [...new Set([...p, currentPhase])]);
    setCurrentPhase("idear");
    setMessages([{
      role: "assistant",
      content: "El problema ya está bien definido. Voy a proponerte 3 ideas de negocio concretas basadas en lo que encontramos. Una pregunta antes: si pudieras elegir solo una y tu reputación dependiera de que funcione, ¿en qué dirección irías?",
      phase: "idear",
    }]);
    setMsgCount(0);
    setShowSugg(true);
  };

  if (view === "summary") {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @keyframes scaleIn { from { opacity:0; transform:scale(0.5) } to { opacity:1; transform:scale(1) } }
          @keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
          @keyframes fadeInFull { from { opacity:0 } to { opacity:1 } }
        `}</style>
        <IdeaSummaryEntry idea={IDEA} onStart={() => setView("chat")} />
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes bubbleIn {
          from { opacity:0; transform:translateY(10px) scale(0.95) }
          to   { opacity:1; transform:translateY(0) scale(1) }
        }
        @keyframes bounce {
          0%,80%,100% { transform:translateY(0) }
          40%         { transform:translateY(-6px) }
        }
        @keyframes fadeInFull { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(20px) }
          to   { opacity:1; transform:translateY(0) }
        }
        @keyframes scaleIn {
          from { opacity:0; transform:scale(0.4) }
          to   { opacity:1; transform:scale(1) }
        }
        @keyframes float {
          from { transform:translateY(0) }
          to   { transform:translateY(-12px) }
        }
        @keyframes growBar {
          from { width:0 }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(46,125,82,0) }
          50%      { box-shadow: 0 0 0 6px rgba(46,125,82,0.15) }
        }

        textarea:focus { outline:none; }
        textarea { resize:none; }
        ::-webkit-scrollbar { width:0; }
      `}</style>

      <div style={{
        background: "#F2F7F4", height: "100vh",
        display: "flex", flexDirection: "column",
        maxWidth: 480, margin: "0 auto",
        fontFamily: "'IBM Plex Sans', sans-serif",
        position: "relative", overflow: "hidden",
      }}>

        {/* ── Header ── */}
        <div style={{ background: "#1A2520", flexShrink: 0 }}>
          {/* Top bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "16px 16px 12px",
          }}>
            <button
              onClick={() => setView("summary")}
              style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "rgba(255,255,255,0.07)", border: "none",
                color: "rgba(255,255,255,0.7)", fontSize: 16, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
            >
              ←
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: "white",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {IDEA.title}
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginTop: 2,
              }}>
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: currentPhaseData?.color,
                  boxShadow: `0 0 6px ${currentPhaseData?.color}`,
                }} />
                <span style={{
                  fontSize: 11, color: currentPhaseData?.color, fontWeight: 600,
                }}>
                  {currentPhaseData?.label} — {currentPhaseData?.description}
                </span>
              </div>
            </div>

            {/* Remaining counter */}
            <div style={{
              background: remaining <= 2
                ? "rgba(232,68,52,0.15)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${remaining <= 2
                ? "rgba(232,68,52,0.3)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 20, padding: "4px 10px",
              display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <span style={{
                fontSize: 13, fontFamily: "'IBM Plex Mono', monospace",
                color: remaining <= 2 ? "#E84434" : "rgba(255,255,255,0.5)",
                fontWeight: 700, lineHeight: 1,
              }}>
                {remaining}
              </span>
              <span style={{
                fontSize: 8, color: remaining <= 2 ? "#E84434" : "rgba(255,255,255,0.3)",
                letterSpacing: 0.5, textTransform: "uppercase",
              }}>
                msj
              </span>
            </div>
          </div>

          {/* Phase bar */}
          <div style={{
            background: "rgba(0,0,0,0.25)",
            padding: "10px 0 12px",
          }}>
            <PhaseBar currentPhase={currentPhase} completedPhases={completedPhases} />
          </div>
        </div>

        {/* ── Chat ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 0" }}>
          {/* Phase label */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
              color: currentPhaseData?.color, textTransform: "uppercase",
              fontFamily: "'IBM Plex Sans', sans-serif",
              background: `${currentPhaseData?.color}18`,
              padding: "4px 14px", borderRadius: 20,
              border: `1px solid ${currentPhaseData?.color}33`,
            }}>
              {currentPhaseData?.label} · {currentPhaseData?.description}
            </span>
          </div>

          {messages.map((msg, i) => (
            <ChatBubble
              key={i}
              message={msg}
              animate={i === animateIdx}
            />
          ))}

          {isTyping && <TypingIndicator thinkingText={thinkingText} />}
          <div ref={chatEndRef} style={{ height: 8 }} />
        </div>

        {/* ── Warning ── */}
        {remaining <= 2 && remaining > 0 && (
          <div style={{
            background: "rgba(198,155,48,0.08)",
            borderTop: "1px solid rgba(198,155,48,0.2)",
            padding: "8px 16px",
            fontSize: 11, color: "#C69B30",
            textAlign: "center", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <span>⚡</span>
            Quedan {remaining} mensaje{remaining !== 1 ? "s" : ""} — el coach va a cerrar esta fase con una conclusión
          </div>
        )}

        {/* ── Suggestions ── */}
        {showSuggestions && !isTyping && (
          <div style={{ flexShrink: 0, background: "#F2F7F4" }}>
            <SuggestionChips
              phase={currentPhase}
              onSelect={text => { setInput(text); inputRef.current?.focus(); }}
            />
          </div>
        )}

        {/* ── Input ── */}
        <div style={{
          padding: "10px 14px 32px",
          background: "white",
          borderTop: "1px solid #EAF0EC",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Escribí tu respuesta..."
              rows={1}
              style={{
                flex: 1,
                border: `1.5px solid ${input.trim() ? "#2E7D52" : "#EAF0EC"}`,
                borderRadius: 22, padding: "10px 16px",
                fontSize: 14, fontFamily: "'IBM Plex Sans', sans-serif",
                color: "#141F19", background: "#F2F7F4",
                lineHeight: 1.5, maxHeight: 100,
                transition: "border-color 0.2s",
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              style={{
                width: 42, height: 42, borderRadius: "50%",
                background: input.trim() && !isTyping
                  ? "linear-gradient(135deg, #2E7D52, #1A5C3A)"
                  : "#EAF0EC",
                border: "none",
                cursor: input.trim() && !isTyping ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s ease",
                boxShadow: input.trim() && !isTyping
                  ? "0 2px 12px rgba(46,125,82,0.35)" : "none",
                animation: input.trim() && !isTyping ? "pulseGlow 2s infinite" : "none",
              }}
            >
              <span style={{
                color: input.trim() && !isTyping ? "white" : "#7A9A8A",
                fontSize: 18, lineHeight: 1,
              }}>
                ↑
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Phase transition ── */}
      {showTransition && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, maxWidth: 480, margin: "0 auto" }}>
          <PhaseTransition
            from="Observar"
            to="Definir"
            summary={{
              insight: "Identificaste una oportunidad real: barberías pequeñas sin sistema digital de turnos, con propietarios que pierden clientes y tiempo manejando todo por WhatsApp.",
              next: "Definir exactamente qué problema resolvés, para quién, y qué tan urgente es para que alguien pague hoy.",
            }}
            centsProgress={35}
            onContinue={handleTransitionContinue}
          />
        </div>
      )}
    </>
  );
}
