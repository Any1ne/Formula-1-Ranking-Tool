import React, { useState, useEffect } from "react";
import Board from "./Board";
import { getExperts, createExpert } from "../api";

export default function BoardWrapper({
  boardTeams,
  setSelectedTeam,
  onRemove,
  onSave,
}) {
  const [experts, setExperts] = useState([]);
  const [selectedExpertId, setSelectedExpertId] = useState("");
  const [newExpertName, setNewExpertName] = useState("");

  // Завантажуємо список експертів при старті
  useEffect(() => {
    loadExperts();
  }, []);

  const loadExperts = async () => {
    try {
      const data = await getExperts();
      setExperts(data);
      if (data.length > 0 && !selectedExpertId) {
        setSelectedExpertId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateExpert = async () => {
    if (!newExpertName.trim()) return;
    try {
      const newExp = await createExpert(newExpertName.trim());
      setExperts([...experts, newExp]);
      setSelectedExpertId(newExp.id); // Автоматично обираємо нового
      setNewExpertName("");
      alert(`Експерт ${newExp.name} створений!`);
    } catch (e) {
      alert("Помилка створення експерта (можливо, ім'я зайняте)");
    }
  };

  const handleSaveClick = () => {
    if (!selectedExpertId) {
      alert("Оберіть експерта зі списку!");
      return;
    }
    // Передаємо ID обраного експерта наверх
    onSave(selectedExpertId);
  };

  return (
    <div className="board-wrapper">
      <h3
        style={{ color: "#e10600", textAlign: "center", marginBottom: "10px" }}
      >
        Дошка ранжування ({boardTeams.length})
      </h3>

      {/* Блок вибору експерта */}
      <div
        style={{
          backgroundColor: "#1a1a1a",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <h4 style={{ color: "#fff", margin: "0 0 10px 0" }}>
          👤 Оберіть експерта:
        </h4>

        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <select
            value={selectedExpertId}
            onChange={(e) => setSelectedExpertId(e.target.value)}
            style={{ flex: 1, padding: "8px", borderRadius: "4px" }}
          >
            {experts.length === 0 && (
              <option value="">Створіть експерта...</option>
            )}
            {experts.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Нове ім'я..."
            value={newExpertName}
            onChange={(e) => setNewExpertName(e.target.value)}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #333",
            }}
          />
          <button
            onClick={handleCreateExpert}
            style={{
              padding: "8px 15px",
              backgroundColor: "#333",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            ➕ Створити
          </button>
        </div>
      </div>

      <Board
        boardTeams={boardTeams}
        onSelectTeam={setSelectedTeam}
        onRemove={onRemove}
      />

      <button
        onClick={handleSaveClick}
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
