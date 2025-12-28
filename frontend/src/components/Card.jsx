import React from "react";

function Card({ id, name, rank, small, onClick, onRemove }) {
  return (
    <div
      className={`card ${small ? "small-card" : ""}`}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#1a1a1a",
        padding: small ? "8px 12px" : "12px 16px",
        marginBottom: "6px",
        borderRadius: "6px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
        cursor: "pointer",
        transition: "transform 0.2s, background 0.2s",
        color: "#fff",
        border: rank ? "2px solid #e10600" : "1px solid #333",
      }}
    >
      {/* Ліва частина: ID та назва */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
        {/* ID об'єкта */}
        <span
          style={{
            fontSize: small ? "10px" : "12px",
            color: "#888",
            backgroundColor: "#0c0c0c",
            padding: small ? "2px 6px" : "4px 8px",
            borderRadius: "4px",
            fontFamily: "monospace",
          }}
        >
          #{id}
        </span>
        
        {/* Назва */}
        <span style={{ fontSize: small ? "14px" : "16px" }}>
          {name}
        </span>
      </div>

      {/* Права частина: ранг та кнопка видалення */}
      {!small && rank && (
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontWeight: "bold",
              color: "#e10600",
              fontSize: "18px",
              backgroundColor: "#0c0c0c",
              padding: "4px 10px",
              borderRadius: "4px",
            }}
          >
            Ранг {rank}
          </span>
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              style={{
                background: "#ff0000",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              ×
            </button>
          )}
        </span>
      )}
    </div>
  );
}

export default Card;
