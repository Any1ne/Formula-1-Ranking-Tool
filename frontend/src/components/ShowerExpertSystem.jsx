import React, { useState } from "react";
import { runShowerInference } from "../api";

export default function ShowerExpertSystem() {
  // Початковий стан фактів (Working Memory)
  const [facts, setFacts] = useState({
    f1: true, // Є холодна вода
    f2: true, // Є гаряча вода
    f3: false, // Температура норм
    f4: false, // Температура низька
    f5: true, // Температура висока (Аварійна ситуація для тесту)
    f6: false, // Вентиль Холод не на межі
    f7: false, // Вентиль Гаряч не на межі
    f8: 1, // Крок
  });

  const [logs, setLogs] = useState([]);
  const [lastAction, setLastAction] = useState("");

  const toggleFact = (key) => {
    setFacts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStep = async () => {
    try {
      const res = await runShowerInference(facts);
      setLogs((prev) => [...prev, ...res.logs, "----------------"]);
      setFacts(res.facts);
      setLastAction(res.action);
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
      <h2 style={{ color: "#e10600" }}>🚿 Експертна Система "Душ" (Lab 6)</h2>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {/* Панель фактів */}
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
            <label style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={facts.f1}
                onChange={() => toggleFact("f1")}
              />{" "}
              f1: Є холодна вода
            </label>
            <label style={{ display: "block" }}>
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
              Датчики температури (Стан):
            </h4>
            <label style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={facts.f3}
                onChange={() => toggleFact("f3")}
              />{" "}
              f3: Температура Норм
            </label>
            <label style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={facts.f4}
                onChange={() => toggleFact("f4")}
              />{" "}
              f4: Температура Низька
            </label>
            <label style={{ display: "block" }}>
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
              Стан вентилів:
            </h4>
            <label style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={facts.f6}
                onChange={() => toggleFact("f6")}
              />{" "}
              f6: Вентиль Хол. на межі
            </label>
            <label style={{ display: "block" }}>
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
              }}
            >
              ▶️ Зробити крок
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

        {/* Логи та Результат */}
        <div
          style={{
            flex: 1,
            minWidth: "300px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#1a1a1a",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #4CAF50",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0" }}>⚙️ Виконана дія:</h3>
            <div
              style={{
                fontSize: "1.5em",
                fontWeight: "bold",
                color: "#4CAF50",
              }}
            >
              {lastAction || "Очікування..."}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#000",
              padding: "15px",
              borderRadius: "8px",
              flex: 1,
              overflowY: "auto",
              maxHeight: "400px",
              fontFamily: "monospace",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0", color: "#888" }}>
              📜 Протокол вирішувача:
            </h4>
            {logs.length === 0 && (
              <span style={{ color: "#555" }}>Тут будуть логи...</span>
            )}
            {logs.map((log, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: "5px",
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
