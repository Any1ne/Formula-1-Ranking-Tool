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

      {/* Основний стовп води */}
      <div
        style={{
          width: "16px",
          height: "100%",
          background:
            state === "LOW"
              ? "#3B82F6"
              : state === "HIGH"
              ? "#EF4444"
              : "#10B981", // Flat colors
          margin: "0 auto",
          opacity: 0.8,
          borderRadius: "0 0 8px 8px",
        }}
      ></div>

      {/* Частинки */}
      {particles.map((_, i) => {
        const delay = Math.random() * 2;
        const left = Math.random() * 20 - 10;

        let style = {};
        let content = "";

        if (state === "LOW") {
          // Сніжинки (сині кола)
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
          // Пара (білі кола, що летять вгору)
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
        // Для 'NORM' частинок немає, тільки чистий потік

        return (
          <div key={i} style={style}>
            {content}
          </div>
        );
      })}
    </div>
  );
};

export default function ShowerExpertSystem() {
  // Логічні факти (для бекенду)
  const [facts, setFacts] = useState({
    f1: true,
    f2: true,
    f3: false,
    f4: false,
    f5: true,
    f6: false,
    f7: false,
    f8: 1,
  });

  // Візуальний стан кранів (0-100)
  const [coldLevel, setColdLevel] = useState(0);
  const [hotLevel, setHotLevel] = useState(100); // Початково High Temp -> Hot open

  const [logs, setLogs] = useState([]);
  const [lastAction, setLastAction] = useState("");
  const [explanation, setExplanation] = useState(null);

  // Визначення температури для відображення
  const getTempState = () => {
    if (!facts.f1 && !facts.f2) return "UNKNOWN";
    if (facts.f4) return "LOW";
    if (facts.f5) return "HIGH";
    if (facts.f3) return "NORM";
    // Якщо вода змішується (обидва крани > 0), вважаємо норма, якщо не вказано інше
    if (coldLevel > 0 && hotLevel > 0) return "NORM";
    return "UNKNOWN";
  };

  const toggleFact = (key) =>
    setFacts((prev) => ({ ...prev, [key]: !prev[key] }));

  // --- СИНХРОНІЗАЦІЯ СИМУЛЯЦІЇ ---
  // Ця функція встановлює і логічні факти, і положення кранів
  const setSimulationState = (type) => {
    if (type === "LOW") {
      setFacts((p) => ({ ...p, f4: true, f3: false, f5: false }));
      setColdLevel(100); // Відкриваємо холодну
      setHotLevel(0); // Закриваємо гарячу
    } else if (type === "NORM") {
      setFacts((p) => ({ ...p, f4: false, f3: true, f5: false }));
      setColdLevel(50); // Обидві наполовину
      setHotLevel(50);
    } else if (type === "HIGH") {
      setFacts((p) => ({ ...p, f4: false, f3: false, f5: true }));
      setColdLevel(0);
      setHotLevel(100);
    }
  };

  const handleStep = async () => {
    try {
      const res = await runShowerInference(facts);
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [`[${timestamp}] ${res.action}`, ...prev]);
      setFacts(res.facts);
      setLastAction(res.action);
      setExplanation(res.explanation);

      // Оновлюємо візуалізацію кранів на основі дії вирішувача
      if (res.action === "OPEN_COLD")
        setColdLevel((prev) => Math.min(prev + 50, 100));
      if (res.action === "CLOSE_COLD")
        setColdLevel((prev) => Math.max(prev - 50, 0));
      if (res.action === "OPEN_HOT")
        setHotLevel((prev) => Math.min(prev + 50, 100));
      if (res.action === "CLOSE_HOT")
        setHotLevel((prev) => Math.max(prev - 50, 0));
    } catch (e) {
      console.error(e);
      alert("Помилка API");
    }
  };

  const resetSystem = () => {
    setFacts({
      f1: true,
      f2: true,
      f3: false,
      f4: false,
      f5: true,
      f6: false,
      f7: false,
      f8: 1,
    });
    setColdLevel(0);
    setHotLevel(100); // Скидаємо в аварійний (High) стан
    setLogs([]);
    setLastAction("");
    setExplanation(null);
  };

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
        <header style={{ textAlign: "center", marginBottom: "40px" }}>
          <h2
            style={{
              fontSize: "28px",
              fontWeight: "800",
              color: "#e10600",
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            Інтелектуальна Система "Душ"
          </h2>
          <p style={{ color: "#6B7280", marginTop: "5px" }}>
            Експертна система з продукційною логікою (Lab 8)
          </p>
        </header>

        {/* --- ГОЛОВНА ВІЗУАЛІЗАЦІЯ --- */}
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
          {/* Ліва сторона: Холодна */}
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
              limit={facts.f6}
              onLimitChange={() => toggleFact("f6")}
            />

            {/* Індикатор води */}
            <div
              onClick={() => toggleFact("f1")}
              style={{
                marginTop: "20px",
                padding: "8px 16px",
                borderRadius: "8px",
                backgroundColor: facts.f1 ? "#1E3A8A" : "#222",
                border: `1px solid ${facts.f1 ? "#3B82F6" : "#444"}`,
                color: facts.f1 ? "#93C5FD" : "#666",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {facts.f1 ? "ВОДА Є" : "НЕМАЄ ВОДИ"}
            </div>
          </div>

          {/* Центр: Змішувач */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "200px",
            }}
          >
            {/* Труби */}
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
                {/* Внутрішній колір труби */}
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

            {/* Блок змішувача */}
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

            {/* Анімована вода */}
            <WaterParticles state={getTempState()} />

            {/* Панель симуляції (під водою) */}
            <div
              style={{
                marginTop: "50px",
                backgroundColor: "#222",
                padding: "15px",
                borderRadius: "12px",
                border: "1px solid #333",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  color: "#888",
                  marginBottom: "8px",
                  textAlign: "center",
                  textTransform: "uppercase",
                }}
              >
                Симуляція Датчиків
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setSimulationState("LOW")}
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background: "#3B82F6",
                    border: facts.f4 ? "2px solid white" : "none",
                    cursor: "pointer",
                  }}
                  title="Зробити Холодно"
                ></button>
                <button
                  onClick={() => setSimulationState("NORM")}
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background: "#10B981",
                    border: facts.f3 ? "2px solid white" : "none",
                    cursor: "pointer",
                  }}
                  title="Зробити Нормально"
                ></button>
                <button
                  onClick={() => setSimulationState("HIGH")}
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background: "#EF4444",
                    border: facts.f5 ? "2px solid white" : "none",
                    cursor: "pointer",
                  }}
                  title="Зробити Гаряче"
                ></button>
              </div>
            </div>
          </div>

          {/* Права сторона: Гаряча */}
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
            <Valve
              type="HOT"
              level={hotLevel}
              limit={facts.f7}
              onLimitChange={() => toggleFact("f7")}
            />

            <div
              onClick={() => toggleFact("f2")}
              style={{
                marginTop: "20px",
                padding: "8px 16px",
                borderRadius: "8px",
                backgroundColor: facts.f2 ? "#7F1D1D" : "#222",
                border: `1px solid ${facts.f2 ? "#EF4444" : "#444"}`,
                color: facts.f2 ? "#FCA5A5" : "#666",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {facts.f2 ? "ВОДА Є" : "НЕМАЄ ВОДИ"}
            </div>
          </div>

          {/* Термометр */}
          <div style={{ position: "absolute", right: "30px", top: "50px" }}>
            <Thermometer tempState={getTempState()} />
          </div>
        </div>

        {/* --- НИЖНЯ ЧАСТИНА: ПОЯСНЕННЯ --- */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "20px",
          }}
        >
          {/* Картка пояснень */}
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
              Логіка Рішень
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
                      ВИКОНАНА ДІЯ
                    </div>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "bold",
                        color: "#fff",
                      }}
                    >
                      {lastAction || "Очікування..."}
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
                Система очікує на вхідні дані для аналізу...
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
                Зробити крок аналізу
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

          {/* Логи */}
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
