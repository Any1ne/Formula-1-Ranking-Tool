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

// --- КОМПОНЕНТ ДАШБОРДУ СТАНУ ---
const FactsDashboard = ({ facts }) => {
  const descriptions = {
    f1: "Холодний потік є",
    f2: "Гарячий потік є",
    f3: "Температура НОРМА",
    f4: "Температура НИЗЬКА",
    f5: "Температура ВИСОКА",
    f6: "Холодна MIN (0%)",
    f7: "Гаряча MIN (0%)",
    f8: "Крок регулювання",
    f9: "Холодна MAX (100%)",
    f10: "Гаряча MAX (100%)",
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "8px",
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
              fontSize: "9px",
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
  // --- FACTS ---
  const [facts, setFacts] = useState({
    f1: true, // Cold flow exists
    f2: true, // Hot flow exists
    f3: false, // Normal
    f4: false, // Cold
    f5: true, // Hot
    f6: false, // Cold Min Limit
    f7: false, // Hot Min Limit
    f8: 0.1, // Step size (Крок регулювання)
    f9: false, // Cold Max Limit
    f10: false, // Hot Max Limit
  });

  // --- PHYSICAL STATE ---
  const [coldLevel, setColdLevel] = useState(0);
  const [hotLevel, setHotLevel] = useState(100);

  // --- LOGIC STATE ---
  const [userOverride, setUserOverride] = useState(false);
  const [logs, setLogs] = useState([]);
  const [lastAction, setLastAction] = useState("");
  const [explanation, setExplanation] = useState(null);

  // --- PHYSICS CALCULATION ---
  const getPhysicalTempState = () => {
    if (!facts.f1 && !facts.f2) return "UNKNOWN";
    const diff = hotLevel - coldLevel;
    if (diff > 15) return "HIGH";
    if (diff < -15) return "LOW";
    if (coldLevel === 0 && hotLevel === 0) return "UNKNOWN";
    return "NORM";
  };

  // --- SYNC EFFECT ---
  useEffect(() => {
    setFacts((prev) => {
      let newState = { ...prev };
      let changed = false;

      // 1. LIMITS SYNC
      const coldMin = coldLevel <= 0;
      const coldMax = coldLevel >= 100;
      if (prev.f6 !== coldMin) {
        newState.f6 = coldMin;
        changed = true;
      }
      if (prev.f9 !== coldMax) {
        newState.f9 = coldMax;
        changed = true;
      }

      const hotMin = hotLevel <= 0;
      const hotMax = hotLevel >= 100;
      if (prev.f7 !== hotMin) {
        newState.f7 = hotMin;
        changed = true;
      }
      if (prev.f10 !== hotMax) {
        newState.f10 = hotMax;
        changed = true;
      }

      // 2. FEELINGS SYNC
      if (!userOverride) {
        const physState = getPhysicalTempState();
        if (physState === "LOW") {
          if (!prev.f4 || prev.f3 || prev.f5) {
            newState = { ...newState, f4: true, f3: false, f5: false };
            changed = true;
          }
        } else if (physState === "HIGH") {
          if (!prev.f5 || prev.f3 || prev.f4) {
            newState = { ...newState, f4: false, f3: false, f5: true };
            changed = true;
          }
        } else if (physState === "NORM") {
          if (!prev.f3 || prev.f4 || prev.f5) {
            newState = { ...newState, f4: false, f3: true, f5: false };
            changed = true;
          }
        }
      }
      return changed ? newState : prev;
    });
  }, [coldLevel, hotLevel, facts.f1, facts.f2, userOverride]);

  const toggleFact = (key) =>
    setFacts((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleUserFeeling = (type) => {
    setUserOverride(true);
    if (type === "LOW")
      setFacts((p) => ({ ...p, f4: true, f3: false, f5: false }));
    else if (type === "NORM")
      setFacts((p) => ({ ...p, f4: false, f3: true, f5: false }));
    else if (type === "HIGH")
      setFacts((p) => ({ ...p, f4: false, f3: false, f5: true }));
    else if (type === "AUTO") setUserOverride(false);
  };

  const handleStep = async () => {
    try {
      const res = await runShowerInference(facts);
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [`[${timestamp}] ${res.action}`, ...prev]);

      setFacts(res.facts);
      setLastAction(res.action);
      setExplanation(res.explanation);

      const step = 10;
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
    setFacts({
      f1: true,
      f2: true,
      f3: false,
      f4: false,
      f5: true,
      f6: false,
      f7: false,
      f8: 1,
      f9: false,
      f10: false,
    });
    setColdLevel(0);
    setHotLevel(100);
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
            Інтелектуальна Система "Душ" 2.0
          </h2>
          <p style={{ color: "#6B7280", marginTop: "5px" }}>
            Версія з розширеною обробкою лімітів (Min/Max)
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
                height: "15px",
                fontSize: "10px",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              {facts.f6 && (
                <span style={{ color: "#EF4444" }}>🛑 MIN LIMIT</span>
              )}
              {facts.f9 && (
                <span style={{ color: "#EF4444" }}>🛑 MAX LIMIT</span>
              )}
              {!facts.f6 && !facts.f9 && (
                <span style={{ color: "#333" }}>OK</span>
              )}
            </div>

            <div
              onClick={() => toggleFact("f1")}
              style={{
                marginTop: "15px",
                padding: "6px 12px",
                borderRadius: "6px",
                backgroundColor: facts.f1 ? "#1E3A8A" : "#222",
                border: `1px solid ${facts.f1 ? "#3B82F6" : "#444"}`,
                color: facts.f1 ? "#93C5FD" : "#666",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              {facts.f1 ? "ПОТІК Є" : "НЕМАЄ ВОДИ"}
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
                {facts.f1 && (
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
                {facts.f2 && (
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
            <WaterParticles state={systemPerception} />

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
                    border: facts.f4 ? "1px solid #3B82F6" : "1px solid #333",
                    cursor: "pointer",
                    fontSize: "10px",
                  }}
                >
                  Холодно!
                </button>
                <button
                  onClick={() => handleUserFeeling("NORM")}
                  style={{
                    flex: 1,
                    height: "30px",
                    borderRadius: "6px",
                    background: "#1a1a1a",
                    color: "#10B981",
                    border: facts.f3 ? "1px solid #10B981" : "1px solid #333",
                    cursor: "pointer",
                    fontSize: "10px",
                  }}
                >
                  Ок
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
                  Гаряче!
                </button>
              </div>
              {userOverride && (
                <button
                  onClick={() => handleUserFeeling("AUTO")}
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
                  🔄 Авто
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
                height: "15px",
                fontSize: "10px",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              {facts.f7 && (
                <span style={{ color: "#EF4444" }}>🛑 MIN LIMIT</span>
              )}
              {facts.f10 && (
                <span style={{ color: "#EF4444" }}>🛑 MAX LIMIT</span>
              )}
              {!facts.f7 && !facts.f10 && (
                <span style={{ color: "#333" }}>OK</span>
              )}
            </div>

            <div
              onClick={() => toggleFact("f2")}
              style={{
                marginTop: "15px",
                padding: "6px 12px",
                borderRadius: "6px",
                backgroundColor: facts.f2 ? "#7F1D1D" : "#222",
                border: `1px solid ${facts.f2 ? "#EF4444" : "#444"}`,
                color: facts.f2 ? "#FCA5A5" : "#666",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              {facts.f2 ? "ПОТІК Є" : "НЕМАЄ ВОДИ"}
            </div>
          </div>

          <div style={{ position: "absolute", right: "30px", top: "50px" }}>
            <Thermometer tempState={systemPerception} />
          </div>
        </div>

        {/* --- BOTTOM: EXPLANATION --- */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#151515",
              borderRadius: "16px",
              padding: "25px",
              border: "1px solid #333",
            }}
          >
            <h3
              style={{
                margin: "0 0 20px 0",
                fontSize: "14px",
                color: "#888",
                textTransform: "uppercase",
              }}
            >
              Центр прийняття рішень
            </h3>
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
                      RULE_ID: {explanation.rule_name}
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
