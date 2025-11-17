import React from "react";

function Card({ name, rank, small, onClick, onRemove }) {
  return (
    <div
      className={`card ${small ? "small-card" : ""}`}
      onClick={onClick}
    >
      <span className="card-name">{name}</span>
      {!small && (
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          #{rank}
          <button
            onClick={(e) => {
              e.stopPropagation(); // щоб не спрацював onClick картки
              onRemove && onRemove();
            }}
            style={{
              background: "#e10600",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              padding: "2px 6px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </span>
      )}
    </div>
  );
}

export default Card;
