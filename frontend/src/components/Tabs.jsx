import React from "react";

export default function Tabs({ currentTab, setCurrentTab }) {
  const tab = (id, label) => (
    <button
      onClick={() => setCurrentTab(id)}
      style={{
        padding: "12px 24px",
        backgroundColor: currentTab === id ? "#e10600" : "#333",
        color: "#fff",
        border: "none",
        borderRadius: "6px 6px 0 0",
        cursor: "pointer",
        fontSize: "16px",
        fontWeight: currentTab === id ? "bold" : "normal",
        transition: "0.2s",
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        display: "flex",
        gap: "5px",
        padding: "10px 20px",
        backgroundColor: "#1a1a1a",
        justifyContent: "center",
        borderBottom: "2px solid #e10600",
      }}
    >
      {tab("ranking", "🏎️ Ранжування")}
      {tab("matrix", "🔢 Матриці")}
      {tab("logs", "📋 Протокол")}
      {tab("consensus", "🏆 Компроміс")}
    </div>
  );
}
