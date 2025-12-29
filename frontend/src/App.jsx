import React, { useState, useRef, useEffect } from "react";
import { DragDropContext } from "@hello-pangea/dnd";

import Tabs from "./components/Tabs";
import TeamsColumn from "./components/TeamsColumn";
import BoardWrapper from "./components/BoardWrapper";
import TeamDetails from "./components/TeamDetails";
import LogsViewer from "./components/LogsViewer";
import MatrixViewer from "./components/MatrixViewer";
import ConsensusViewer from "./components/ConsensusViewer";
import ShowerExpertSystem from "./components/ShowerExpertSystem";

import {
  saveRanking,
  loadSampleObjects,
  createObject,
  getExperts,
  createExpert,
  getObjects,
  getExpertRanking,
} from "./api";

function App() {
  const nextIdRef = useRef(1000);
  const getNextId = () => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    return id;
  };

  // --- СТАНИ ---
  const [teams, setTeams] = useState([]);
  const [boardTeams, setBoardTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [currentTab, setCurrentTab] = useState("ranking");

  // Стани для експертів
  const [experts, setExperts] = useState([]);
  const [selectedExpertId, setSelectedExpertId] = useState("");
  const [newExpertName, setNewExpertName] = useState("");

  // --- EFEECTS ---

  // 1. Завантажуємо список експертів при запуску
  useEffect(() => {
    loadExperts();
  }, []);

  // 2. Коли змінюється експерт, оновлюємо дошку
  useEffect(() => {
    if (selectedExpertId) {
      refreshBoardForExpert(selectedExpertId);
    } else {
      // Якщо експерт не вибраний, очищаємо дошку
      setBoardTeams([]);
    }
  }, [selectedExpertId]);

  // --- ЛОГІКА ---

  const loadExperts = async () => {
    try {
      const data = await getExperts();
      setExperts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateExpert = async () => {
    if (!newExpertName.trim()) return;
    try {
      const newExp = await createExpert(newExpertName);
      await loadExperts(); // оновлюємо список
      setSelectedExpertId(newExp.id); // вибираємо нового
      setNewExpertName("");
      alert(`Експерт ${newExp.name} створений!`);
    } catch (e) {
      alert("Помилка створення експерта");
    }
  };

  const refreshBoardForExpert = async (expertId) => {
    try {
      // 1. Отримуємо всі доступні об'єкти з бази
      const allObjects = await getObjects();

      // 2. Отримуємо актуальний порядок для цього експерта
      const { order } = await getExpertRanking(expertId);

      if (order && order.length > 0) {
        // 3. Розділяємо об'єкти на "на дошці" та "в колонці"
        const ranked = [];
        const available = [];

        // Створюємо карту для швидкого пошуку
        const objMap = new Map(allObjects.map((obj) => [obj.id, obj]));

        // Додаємо на дошку в правильному порядку
        order.forEach((id) => {
          if (objMap.has(id)) {
            ranked.push(objMap.get(id));
            objMap.delete(id);
          }
        });

        // Решта об'єктів йдуть у вільну колонку
        objMap.forEach((obj) => available.push(obj));

        setBoardTeams(ranked);
        setTeams(available);
      } else {
        // Якщо у експерта ще немає збереженого ранжування
        setBoardTeams([]);
        setTeams(allObjects); // Всі об'єкти доступні зліва
      }
    } catch (err) {
      console.error("Помилка оновлення дошки:", err);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;

    if (source.droppableId === "teams" && destination.droppableId === "board") {
      const item = teams[source.index];
      setTeams((prev) => prev.filter((_, i) => i !== source.index));
      setBoardTeams((prev) => {
        const arr = [...prev];
        arr.splice(destination.index, 0, item);
        return arr;
      });
    }

    if (source.droppableId === "board" && destination.droppableId === "board") {
      const arr = [...boardTeams];
      const [moved] = arr.splice(source.index, 1);
      arr.splice(destination.index, 0, moved);
      setBoardTeams(arr);
    }
  };

  const handleAddTeam = async (name) => {
    if (!name.trim()) return;
    try {
      const newObj = await createObject({ name: name.trim() });
      setTeams((prev) => [...prev, newObj]);
    } catch (e) {
      const newTeam = { id: getNextId(), name: name.trim() };
      setTeams((prev) => [...prev, newTeam]);
    }
  };

  const handleRemoveFromBoard = (team) => {
    setBoardTeams((prev) => prev.filter((t) => t.id !== team.id));
    setTeams((prev) => [...prev, team]);
  };

  const handleSaveRanking = async () => {
    if (boardTeams.length === 0) {
      alert("⚠️ Дошка порожня!");
      return;
    }
    if (!selectedExpertId) {
      alert("⚠️ Будь ласка, оберіть експерта!");
      return;
    }

    try {
      const order = boardTeams.map((t) => t.id);
      // Передаємо ID обраного експерта зі стану
      await saveRanking(order, selectedExpertId);

      const expertName = experts.find((e) => e.id == selectedExpertId)?.name;
      alert(`✅ Збережено для: ${expertName}!`);
    } catch (err) {
      console.error(err);
      alert("❌ Помилка збереження!");
    }
  };

  const handleLoadSample = async () => {
    try {
      const data = await loadSampleObjects();
      const boardIds = new Set(boardTeams.map((t) => t.id));
      const existingIds = new Set(teams.map((t) => t.id));
      const toAdd = data.filter(
        (t) => !boardIds.has(t.id) && !existingIds.has(t.id)
      );

      setTeams((prev) => [...prev, ...toAdd]);
      if (toAdd.length > 0) alert(`Завантажено ${toAdd.length} об'єктів`);
    } catch (err) {
      console.error(err);
      alert("Помилка завантаження");
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Formula 1 Ranking Tool (Lab 4)</h1>
      </header>

      <Tabs currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {currentTab === "logs" && <LogsViewer />}
      {currentTab === "matrix" && <MatrixViewer experts={experts} />}
      {currentTab === "consensus" && <ConsensusViewer />}
      {currentTab === "shower" && <ShowerExpertSystem />}

      {currentTab === "ranking" && (
        <div
          style={{ display: "flex", flexDirection: "column", width: "100%" }}
        >
          {/* --- ПАНЕЛЬ ВИБОРУ ЕКСПЕРТА --- */}
          <div
            style={{
              padding: "15px",
              backgroundColor: "#1a1a1a",
              borderBottom: "1px solid #333",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label style={{ color: "#fff", fontWeight: "bold" }}>
                👤 Поточний експерт:
              </label>
              <select
                value={selectedExpertId}
                onChange={(e) => setSelectedExpertId(e.target.value)}
                style={{
                  padding: "8px",
                  borderRadius: "4px",
                  minWidth: "150px",
                }}
              >
                <option value="" disabled>
                  Оберіть експерта
                </option>
                {experts.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{ width: "1px", height: "30px", backgroundColor: "#555" }}
            ></div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input
                type="text"
                placeholder="Новий експерт..."
                value={newExpertName}
                onChange={(e) => setNewExpertName(e.target.value)}
                style={{ padding: "8px", borderRadius: "4px", border: "none" }}
              />
              <button
                onClick={handleCreateExpert}
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                + Створити
              </button>
            </div>
          </div>
          {/* --- КІНЕЦЬ ПАНЕЛІ --- */}

          <DragDropContext onDragEnd={handleDragEnd}>
            <main
              className="app-grid"
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "20px",
                alignItems: "flex-start",
                width: "100%",
                padding: "20px",
              }}
            >
              <TeamsColumn
                teams={teams}
                addTeam={handleAddTeam}
                loadSample={handleLoadSample}
                setSelectedTeam={setSelectedTeam}
                setTeams={setTeams}
                getNextId={getNextId}
              />

              <BoardWrapper
                boardTeams={boardTeams}
                setSelectedTeam={setSelectedTeam}
                onRemove={handleRemoveFromBoard}
                onSave={handleSaveRanking}
              />

              <TeamDetails selectedTeam={selectedTeam} />
            </main>
          </DragDropContext>
        </div>
      )}
      <footer className="app-footer">
        <p>© 2025 F1 Ranking Lab | КНУ ФІТ</p>
      </footer>
    </div>
  );
}

export default App;
