import React, { useState } from "react";
import { runShowerInference } from "../api";

export default function ShowerExpertSystem() {
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

  const [logs, setLogs] = useState([]);
  const [lastAction, setLastAction] = useState("");

  // State для підсистеми довіри
  const [explanation, setExplanation] = useState(null);

  const toggleFact = (key) => {
    setFacts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStep = async () => {
    try {
      const res = await runShowerInference(facts);
      // Додаємо нові логи до старих
      setLogs((prev) => [...res.logs, "----------------", ...prev]);
      setFacts(res.facts);
      setLastAction(res.action);
      setExplanation(res.explanation);
    } catch (e) {
      console.error(e);
      alert("Помилка з'єднання з сервером");
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
    setLogs([]);
    setLastAction("");
    setExplanation(null);
  };

  return (
    <div
      style={{
        padding: "20px",
        color: "#fff",
        backgroundColor: "#0c0c0c",
        minHeight: "80vh",
      }}
    >
      <h2 style={{ color: "#e10600" }}>
        🚿 Експертна Система + Підсистема довіри (Lab 7)
      </h2>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {/* 1. ПАНЕЛЬ ВХІДНИХ ДАНИХ */}
        <div
          style={{
            flex: 1,
            minWidth: "300px",
            backgroundColor: "#1a1a1a",
            padding: "20px",
            borderRadius: "8px",
          }}
        >
          <h3 style={{ borderBottom: "1px solid #333", paddingBottom: "10px" }}>
            📥 Вхідні факти (Робоча пам'ять)
          </h3>

          <div style={{ marginBottom: "15px" }}>
            <h4 style={{ margin: "5px 0", color: "#4CAF50" }}>
              Датчики наявності води:
            </h4>
            <label style={{ display: "block", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={facts.f1}
                onChange={() => toggleFact("f1")}
              />{" "}
              f1: Є холодна вода
            </label>
            <label style={{ display: "block", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={facts.f2}
                onChange={() => toggleFact("f2")}
              />{" "}
              f2: Є гаряча вода
            </label>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <h4 style={{ margin: "5px 0", color: "#e10600" }}>
              Датчики температури:
            </h4>
            <label style={{ display: "block", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={facts.f3}
                onChange={() => toggleFact("f3")}
              />{" "}
              f3: Температура Норм
            </label>
            <label style={{ display: "block", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={facts.f4}
                onChange={() => toggleFact("f4")}
              />{" "}
              f4: Температура Низька
            </label>
            <label style={{ display: "block", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={facts.f5}
                onChange={() => toggleFact("f5")}
              />{" "}
              f5: Температура Висока
            </label>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <h4 style={{ margin: "5px 0", color: "#2196F3" }}>
              Стан вентилів (Limits):
            </h4>
            <label style={{ display: "block", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={facts.f6}
                onChange={() => toggleFact("f6")}
              />{" "}
              f6: Вентиль Хол. на межі
            </label>
            <label style={{ display: "block", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={facts.f7}
                onChange={() => toggleFact("f7")}
              />{" "}
              f7: Вентиль Гар. на межі
            </label>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button
              onClick={handleStep}
              style={{
                padding: "10px 20px",
                backgroundColor: "#e10600",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                flex: 1,
                fontWeight: "bold",
                fontSize: "16px",
              }}
            >
              ▶️ Вирішити (Крок)
            </button>
            <button
              onClick={resetSystem}
              style={{
                padding: "10px",
                backgroundColor: "#333",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              🔄 Скидання
            </button>
          </div>
        </div>

        {/* ПРАВА КОЛОНКА */}
        <div
          style={{
            flex: 1,
            minWidth: "300px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* 2. ПІДСИСТЕМА ДОВІРИ (НОВЕ ДЛЯ ЛАБ 7) */}
          <div
            style={{
              backgroundColor: "#111",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #e10600",
              boxShadow: "0 0 10px rgba(225, 6, 0, 0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 15px 0", color: "#e10600" }}>
              🤝 Підсистема довіри (Пояснення)
            </h3>

            {explanation ? (
              <div>
                <div style={{ marginBottom: "10px" }}>
                  <strong style={{ color: "#888" }}>Дія:</strong> <br />
                  <span
                    style={{
                      fontSize: "1.2em",
                      fontWeight: "bold",
                      color: "#fff",
                    }}
                  >
                    {lastAction === "NONE" ? "Дія не потрібна" : lastAction}
                  </span>
                </div>

                {explanation.active && (
                  <>
                    <div style={{ marginBottom: "10px" }}>
                      <strong style={{ color: "#888" }}>
                        Спрацювало правило:
                      </strong>{" "}
                      <br />
                      <span style={{ color: "#4CAF50", fontWeight: "bold" }}>
                        {explanation.rule_name}
                      </span>
                    </div>
                    <div style={{ marginBottom: "10px" }}>
                      <strong style={{ color: "#888" }}>
                        Умова активації:
                      </strong>{" "}
                      <br />
                      <code
                        style={{
                          backgroundColor: "#222",
                          padding: "2px 5px",
                          borderRadius: "4px",
                        }}
                      >
                        {explanation.condition_text}
                      </code>
                    </div>
                    <div
                      style={{
                        marginTop: "15px",
                        padding: "10px",
                        backgroundColor: "#222",
                        borderRadius: "4px",
                        borderLeft: "4px solid #e10600",
                      }}
                    >
                      <strong style={{ color: "#fff" }}>
                        💬 Пояснення системи:
                      </strong>
                      <p
                        style={{
                          margin: "5px 0 0 0",
                          color: "#ddd",
                          fontStyle: "italic",
                        }}
                      >
                        "{explanation.reasoning}"
                      </p>
                    </div>
                  </>
                )}
                {!explanation.active && (
                  <p style={{ color: "#888" }}>{explanation.reasoning}</p>
                )}
              </div>
            ) : (
              <p style={{ color: "#555", fontStyle: "italic" }}>
                Натисніть "Вирішити", щоб отримати пояснення дій системи...
              </p>
            )}
          </div>

          {/* 3. ПРОТОКОЛ (LOGS) */}
          <div
            style={{
              backgroundColor: "#000",
              padding: "15px",
              borderRadius: "8px",
              flex: 1,
              overflowY: "auto",
              maxHeight: "300px",
              fontFamily: "monospace",
              border: "1px solid #333",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0", color: "#888" }}>
              📜 Технічний протокол:
            </h4>
            {logs.length === 0 && (
              <span style={{ color: "#555" }}>Тут будуть логи...</span>
            )}
            {logs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: "5px",
                  fontSize: "0.9em",
                  color: log.includes("АКТИВОВАНО") ? "#4CAF50" : "#ccc",
                }}
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
