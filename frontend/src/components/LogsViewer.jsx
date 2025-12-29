import React, { useState, useEffect } from "react";
import { getLogs } from "../api"; // Використовуємо іменований імпорт

function LogsViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      // Викликаємо конкретну функцію getLogs, а не api.get
      const data = await getLogs();
      setLogs(data);
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    const icons = {
      create_object: "➕",
      upload_csv: "📄",
      load_sample: "📦",
      save_ranking: "💾",
      clear_objects: "🗑️",
    };
    return icons[action] || "📌";
  };

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `logs_${new Date().toISOString()}.json`;
    link.click();
  };

  return (
    <div
      style={{
        padding: "20px",
        color: "#fff",
        backgroundColor: "#0c0c0c",
        minHeight: "calc(100vh - 200px)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ margin: 0, color: "#e10600" }}>
          📋 Протокол дій експерта
        </h2>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={loadLogs}
            style={{
              padding: "8px 16px",
              backgroundColor: "#333",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🔄 Оновити
          </button>
          <button
            onClick={exportLogs}
            disabled={logs.length === 0}
            style={{
              padding: "8px 16px",
              backgroundColor: logs.length === 0 ? "#555" : "#e10600",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: logs.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            💾 Експорт
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          Завантаження...
        </div>
      ) : logs.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            backgroundColor: "#1a1a1a",
            borderRadius: "8px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "10px" }}>📋</div>
          <h3>Протокол порожній</h3>
          <p style={{ color: "#888" }}>
            Почніть роботу з системою, і всі дії будуть записані тут
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              marginBottom: "15px",
              padding: "10px",
              backgroundColor: "#1a1a1a",
              borderRadius: "4px",
            }}
          >
            📊 <strong>Всього записів:</strong> {logs.length}
          </div>

          <div style={{ maxHeight: "500px", overflowY: "auto" }}>
            {logs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: "15px",
                  margin: "10px 0",
                  backgroundColor: "#1a1a1a",
                  borderRadius: "8px",
                  borderLeft: "4px solid #e10600",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontSize: "20px" }}>
                      {getActionIcon(log.action)}
                    </span>
                    <strong style={{ color: "#e10600" }}>
                      {log.action.replace(/_/g, " ").toUpperCase()}
                    </strong>
                  </div>
                  <small style={{ color: "#888" }}>
                    {new Date(log.timestamp).toLocaleString("uk-UA")}
                  </small>
                </div>

                {log.payload && (
                  <pre
                    style={{
                      fontSize: "12px",
                      backgroundColor: "#0c0c0c",
                      padding: "10px",
                      borderRadius: "4px",
                      overflow: "auto",
                      margin: 0,
                      maxHeight: "150px",
                    }}
                  >
                    {JSON.stringify(JSON.parse(log.payload), null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default LogsViewer;
