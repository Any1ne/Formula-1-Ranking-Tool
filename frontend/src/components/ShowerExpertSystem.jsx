import React, { useState, useEffect } from "react";
import { runShowerInference } from "../api";
import Valve from "./Valve";
import Thermometer from "./Thermometer";

// --- Стилі анімації частинок ---
const particleStyles = `
  @keyframes fall {
    0% { transform: translateY(0) translateX(0); opacity: 0; }
    10% { opacity: 1; }
    100% { transform: translateY(80px) translateX(-5px); opacity: 0; }
  }
  @keyframes rise {
    0% { transform: translateY(0) scale(0.5); opacity: 0; }
    50% { opacity: 0.6; }
    100% { transform: translateY(-50px) scale(1.5); opacity: 0; }
  }
`;

const WaterParticles = ({ state }) => {
  if (state === "UNKNOWN") return null;
  const particles = Array.from({ length: 6 });

  return (
    <div
      style={{
        position: "relative",
        width: "40px",
        height: "80px",
        overflow: "visible",
        zIndex: 0,
      }}
    >
      <style>{particleStyles}</style>
      <div
        style={{
          width: "16px",
          height: "100%",
          margin: "0 auto",
          opacity: 0.8,
          borderRadius: "0 0 8px 8px",
          background:
            state === "LOW"
              ? "#3B82F6"
              : state === "HIGH"
              ? "#EF4444"
              : "#10B981",
        }}
      ></div>
      {particles.map((_, i) => {
        const delay = Math.random() * 2;
        const left = Math.random() * 20 - 10;
        let style = {};
        let content = "";

        if (state === "LOW") {
          content = "❄";
          style = {
            position: "absolute",
            top: "10px",
            left: `calc(50% + ${left}px)`,
            color: "#93C5FD",
            fontSize: "14px",
            animation: `fall 2s infinite linear`,
            animationDelay: `${delay}s`,
          };
        } else if (state === "HIGH") {
          style = {
            position: "absolute",
            bottom: "0",
            left: `calc(50% + ${left}px)`,
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.5)",
            animation: `rise 2s infinite ease-out`,
            animationDelay: `${delay}s`,
          };
        }
        return (
          <div key={i} style={style}>
            {content}
          </div>
        );
      })}
    </div>
  );
};

// --- КОМПОНЕНТ ДАШБОРДУ СТАНУ (8 Фактів) ---
const FactsDashboard = ({ facts }) => {
  const descriptions = {
    f1: "Гаряча відкр (>0)",
    f2: "Холодна відкр (>0)",
    f3: "Гаряча МАКС (100)",
    f4: "Холодна МАКС (100)",
    f5: "Вода ГАРЯЧА",
    f6: "Вода ХОЛОДНА",
    f7: "Вода ТЕПЛА (Норм)",
    f8: "Крок регулювання",
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "10px",
        marginBottom: "20px",
        backgroundColor: "#111",
        padding: "15px",
        borderRadius: "12px",
        border: "1px solid #333",
      }}
    >
      <div
        style={{
          gridColumn: "1 / -1",
          fontSize: "11px",
          color: "#666",
          textTransform: "uppercase",
          marginBottom: "5px",
        }}
      >
        Live Facts Monitor (Knowledge Base State)
      </div>
      {Object.entries(facts).map(([key, value]) => (
        <div
          key={key}
          style={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: value
              ? "rgba(16, 185, 129, 0.1)"
              : "rgba(255, 255, 255, 0.05)",
            border: `1px solid ${value ? "#10B981" : "#333"}`,
            borderRadius: "6px",
            padding: "8px",
            alignItems: "center",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              fontSize: "14px",
              color: value ? "#10B981" : "#555",
            }}
          >
            {key}
          </div>
          <div
            style={{
              fontSize: "9px",
              color: value ? "#D1FAE5" : "#777",
              textAlign: "center",
              marginTop: "2px",
            }}
          >
            {descriptions[key] || key}
          </div>
          <div
            style={{
              marginTop: "4px",
              fontSize: "10px",
              fontWeight: "bold",
              color: value ? "#10B981" : "#444",
            }}
          >
            {value.toString().toUpperCase()}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function ShowerExpertSystem() {
  // --- FACTS (Classic Lab 5 Logic) ---
  const [facts, setFacts] = useState({
    f1: false, // Hot Open (>0)
    f2: false, // Cold Open (>0)
    f3: false, // Hot Max (100)
    f4: false, // Cold Max (100)
    f5: false, // High Temp
    f6: false, // Low Temp
    f7: false, // Norm Temp
    f8: 10, // Step Size
  });

  // --- PHYSICAL STATE ---
  const [coldLevel, setColdLevel] = useState(0);
  const [hotLevel, setHotLevel] = useState(0);

  // --- LOGIC STATE ---
  const [userOverride, setUserOverride] = useState(false);
  const [logs, setLogs] = useState([]);
  const [lastAction, setLastAction] = useState("");
  const [explanation, setExplanation] = useState(null);

  // --- PHYSICS CALCULATION ---
  const getPhysicalTempState = () => {
    if (coldLevel === 0 && hotLevel === 0) return "UNKNOWN";
    const diff = hotLevel - coldLevel;
    if (diff > 15) return "HIGH";
    if (diff < -15) return "LOW";
    return "NORM";
  };

  // --- SYNC EFFECT (Logic from New Version) ---
  useEffect(() => {
    setFacts((prev) => {
      const newState = { ...prev };

      // Physical limits mapping
      newState.f1 = hotLevel > 0;
      newState.f2 = coldLevel > 0;
      newState.f3 = hotLevel >= 100;
      newState.f4 = coldLevel >= 100;

      // Auto-Feelings mapping
      if (!userOverride) {
        const physState = getPhysicalTempState();
        newState.f5 = physState === "HIGH";
        newState.f6 = physState === "LOW";
        newState.f7 = physState === "NORM";
      }
      return newState;
    });
  }, [coldLevel, hotLevel, userOverride]);

  const handleUserFeeling = (type) => {
    setUserOverride(true);
    setFacts((p) => ({
      ...p,
      f5: type === "HIGH",
      f6: type === "LOW",
      f7: type === "NORM",
    }));
  };

  const handleStep = async () => {
    try {
      const res = await runShowerInference(facts);
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [`[${timestamp}] ${res.action}`, ...prev]);

      // Update UI with decision
      setLastAction(res.action);
      setExplanation(res.explanation);

      // Execute Action
      const step = facts.f8;
      if (res.action === "OPEN_COLD")
        setColdLevel((prev) => Math.min(prev + step, 100));
      if (res.action === "CLOSE_COLD")
        setColdLevel((prev) => Math.max(prev - step, 0));
      if (res.action === "OPEN_HOT")
        setHotLevel((prev) => Math.min(prev + step, 100));
      if (res.action === "CLOSE_HOT")
        setHotLevel((prev) => Math.max(prev - step, 0));
    } catch (e) {
      console.error(e);
      alert("Помилка API");
    }
  };

  const resetSystem = () => {
    setUserOverride(false);
    setColdLevel(0);
    setHotLevel(0);
    setFacts((prev) => ({ ...prev, f8: 10 })); // Reset step but keep structure
    setLogs([]);
    setLastAction("");
    setExplanation(null);
  };

  const systemPerception = getPhysicalTempState();

  return (
    <div
      style={{
        padding: "40px",
        backgroundColor: "#0c0c0c",
        minHeight: "90vh",
        fontFamily: "'Inter', sans-serif",
        color: "#E5E7EB",
      }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <header style={{ textAlign: "center", marginBottom: "30px" }}>
          <h2
            style={{
              fontSize: "28px",
              fontWeight: "800",
              color: "#e10600",
              margin: 0,
            }}
          >
            Інтелектуальна Система "Душ" 3.5
          </h2>
          <p style={{ color: "#6B7280", marginTop: "5px" }}>
            Класична логіка (8 фактів) + Розширений інтерфейс
          </p>
        </header>

        {/* --- DASHBOARD --- */}
        <FactsDashboard facts={facts} />

        {/* --- MAIN VISUALIZATION --- */}
        <div
          style={{
            backgroundColor: "#151515",
            borderRadius: "24px",
            padding: "50px",
            border: "1px solid #333",
            marginBottom: "30px",
            position: "relative",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "flex-start",
          }}
        >
          {/* LEFT: COLD */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "150px",
            }}
          >
            <div
              style={{
                marginBottom: "15px",
                color: "#3B82F6",
                fontWeight: "bold",
                letterSpacing: "1px",
              }}
            >
              INPUT A
            </div>
            <Valve
              type="COLD"
              level={coldLevel}
              onManualChange={setColdLevel}
            />

            <div
              style={{
                marginTop: "5px",
                fontSize: "10px",
                fontWeight: "bold",
                color: facts.f4 ? "#EF4444" : "#666",
              }}
            >
              {facts.f4
                ? "🛑 MAX LIMIT (f4)"
                : facts.f2
                ? "✅ OPEN (f2)"
                : "⭕ CLOSED"}
            </div>
          </div>

          {/* CENTER: MIXER */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "200px",
            }}
          >
            {/* PIPES */}
            <div
              style={{
                display: "flex",
                width: "100%",
                height: "20px",
                marginBottom: "-2px",
              }}
            >
              <div
                style={{
                  flex: 1,
                  borderBottom: "6px solid #333",
                  borderRight: "6px solid #333",
                  borderRadius: "0 0 15px 0",
                }}
              >
                {facts.f2 && (
                  <div
                    style={{
                      width: "100%",
                      height: "4px",
                      background: "#3B82F6",
                      marginTop: "16px",
                      opacity: coldLevel / 100,
                    }}
                  ></div>
                )}
              </div>
              <div
                style={{
                  flex: 1,
                  borderBottom: "6px solid #333",
                  borderLeft: "6px solid #333",
                  borderRadius: "0 0 0 15px",
                }}
              >
                {facts.f1 && (
                  <div
                    style={{
                      width: "100%",
                      height: "4px",
                      background: "#EF4444",
                      marginTop: "16px",
                      opacity: hotLevel / 100,
                    }}
                  ></div>
                )}
              </div>
            </div>

            {/* MIXER BOX */}
            <div
              style={{
                width: "80px",
                height: "50px",
                backgroundColor: "#222",
                borderRadius: "12px",
                border: "2px solid #444",
                zIndex: 1,
                display: "grid",
                placeItems: "center",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "6px",
                  background: "#555",
                  borderRadius: "3px",
                }}
              ></div>
            </div>

            {/* WATER */}
            <WaterParticles state={systemPerception} />

            {/* CONTROLS */}
            <div
              style={{
                marginTop: "50px",
                backgroundColor: "#222",
                padding: "15px",
                borderRadius: "12px",
                border: userOverride ? "1px solid #e10600" : "1px solid #333",
                width: "100%",
                transition: "0.3s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    color: "#888",
                    textTransform: "uppercase",
                  }}
                >
                  Відчуття
                </span>
                <span
                  style={{
                    fontSize: "9px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: userOverride ? "#e10600" : "#333",
                    color: "#fff",
                  }}
                >
                  {userOverride ? "MANUAL" : "AUTO-SYNC"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "5px",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={() => handleUserFeeling("LOW")}
                  style={{
                    flex: 1,
                    height: "30px",
                    borderRadius: "6px",
                    background: "#1a1a1a",
                    color: "#3B82F6",
                    border: facts.f6 ? "1px solid #3B82F6" : "1px solid #333",
                    cursor: "pointer",
                    fontSize: "10px",
                  }}
                >
                  ❄️
                </button>
                <button
                  onClick={() => handleUserFeeling("NORM")}
                  style={{
                    flex: 1,
                    height: "30px",
                    borderRadius: "6px",
                    background: "#1a1a1a",
                    color: "#10B981",
                    border: facts.f7 ? "1px solid #10B981" : "1px solid #333",
                    cursor: "pointer",
                    fontSize: "10px",
                  }}
                >
                  👌
                </button>
                <button
                  onClick={() => handleUserFeeling("HIGH")}
                  style={{
                    flex: 1,
                    height: "30px",
                    borderRadius: "6px",
                    background: "#1a1a1a",
                    color: "#EF4444",
                    border: facts.f5 ? "1px solid #EF4444" : "1px solid #333",
                    cursor: "pointer",
                    fontSize: "10px",
                  }}
                >
                  🔥
                </button>
              </div>
              {userOverride && (
                <button
                  onClick={() => setUserOverride(false)}
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: "4px",
                    background: "transparent",
                    border: "1px dashed #555",
                    color: "#888",
                    fontSize: "9px",
                    cursor: "pointer",
                  }}
                >
                  🔄 Auto-sync
                </button>
              )}
            </div>
          </div>

          {/* RIGHT: HOT */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "150px",
            }}
          >
            <div
              style={{
                marginBottom: "15px",
                color: "#EF4444",
                fontWeight: "bold",
                letterSpacing: "1px",
              }}
            >
              INPUT B
            </div>
            <Valve type="HOT" level={hotLevel} onManualChange={setHotLevel} />

            <div
              style={{
                marginTop: "5px",
                fontSize: "10px",
                fontWeight: "bold",
                color: facts.f3 ? "#EF4444" : "#666",
              }}
            >
              {facts.f3
                ? "🛑 MAX LIMIT (f3)"
                : facts.f1
                ? "✅ OPEN (f1)"
                : "⭕ CLOSED"}
            </div>
          </div>

          <div style={{ position: "absolute", right: "30px", top: "50px" }}>
            <Thermometer tempState={systemPerception} />
          </div>
        </div>

        {/* --- BOTTOM: LOGIC & LOGS --- */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "20px",
          }}
        >
          {/* Logic Panel */}
          <div
            style={{
              backgroundColor: "#151515",
              borderRadius: "16px",
              padding: "25px",
              border: "1px solid #333",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "#888",
                  textTransform: "uppercase",
                }}
              >
                Центр прийняття рішень
              </h3>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span style={{ fontSize: "11px", color: "#666" }}>
                  Крок (f8):
                </span>
                <input
                  type="number"
                  value={facts.f8}
                  onChange={(e) =>
                    setFacts((p) => ({ ...p, f8: Number(e.target.value) }))
                  }
                  style={{
                    width: "40px",
                    background: "#333",
                    color: "#fff",
                    border: "1px solid #555",
                    borderRadius: "4px",
                    padding: "2px",
                  }}
                />
              </div>
            </div>

            {explanation ? (
              <div style={{ animation: "fadeIn 0.5s" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "15px",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "8px",
                      background: "#222",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      marginRight: "15px",
                      border: "1px solid #444",
                    }}
                  >
                    {lastAction.includes("OPEN")
                      ? "🔓"
                      : lastAction.includes("CLOSE")
                      ? "🔒"
                      : "⚖️"}
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      РЕАКЦІЯ СИСТЕМИ
                    </div>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: "#fff",
                      }}
                    >
                      {lastAction}
                    </div>
                  </div>
                </div>
                {explanation.active && (
                  <div
                    style={{
                      backgroundColor: "#222",
                      padding: "20px",
                      borderRadius: "12px",
                      borderLeft: "4px solid #e10600",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#ccc",
                        fontStyle: "italic",
                        lineHeight: "1.6",
                      }}
                    >
                      "{explanation.reasoning}"
                    </div>
                    <div
                      style={{
                        marginTop: "15px",
                        paddingTop: "10px",
                        borderTop: "1px solid #333",
                        fontSize: "11px",
                        color: "#666",
                        fontWeight: "bold",
                        fontFamily: "monospace",
                      }}
                    >
                      RULE_ID: {explanation.rule_name} <br />
                      COND: {explanation.condition_text}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  color: "#444",
                  textAlign: "center",
                  padding: "30px",
                  border: "2px dashed #222",
                  borderRadius: "12px",
                }}
              >
                Очікування вхідних даних...
              </div>
            )}
            <div style={{ marginTop: "25px", display: "flex", gap: "10px" }}>
              <button
                onClick={handleStep}
                style={{
                  flex: 1,
                  padding: "14px",
                  backgroundColor: "#e10600",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "0.2s",
                }}
              >
                Виконати крок регулювання (AI)
              </button>
              <button
                onClick={resetSystem}
                style={{
                  padding: "14px 20px",
                  backgroundColor: "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
                title="Скинути"
              >
                ⟲
              </button>
            </div>
          </div>

          {/* Logs */}
          <div
            style={{
              backgroundColor: "#151515",
              borderRadius: "16px",
              padding: "20px",
              border: "1px solid #333",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h4
              style={{
                margin: "0 0 15px 0",
                fontSize: "12px",
                color: "#888",
                textTransform: "uppercase",
              }}
            >
              Історія подій
            </h4>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                minHeight: "150px",
                fontSize: "12px",
                fontFamily: "monospace",
                color: "#aaa",
              }}
            >
              {logs.map((log, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: "8px",
                    borderBottom: "1px solid #222",
                    paddingBottom: "4px",
                  }}
                >
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <span style={{ color: "#444" }}>Історія порожня</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
