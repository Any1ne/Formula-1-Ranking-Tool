import React from "react";
import Board from "./Board";

export default function BoardWrapper({
  boardTeams,
  setSelectedTeam,
  onRemove,
  onSave,
}) {
  return (
    <div className="board-wrapper">
      <h3
        style={{ color: "#e10600", textAlign: "center", marginBottom: "10px" }}
      >
        Дошка ранжування ({boardTeams.length})
      </h3>

      <Board
        boardTeams={boardTeams}
        onSelectTeam={setSelectedTeam}
        onRemove={onRemove}
      />

      <button
        onClick={onSave}
        style={{
          marginTop: "20px",
          width: "100%",
          padding: "15px",
          backgroundColor: "#e10600",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: "16px",
        }}
      >
        💾 Зберегти ранжування
      </button>
    </div>
  );
}
