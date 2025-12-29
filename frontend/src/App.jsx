import React, { useState, useRef } from "react";
import { DragDropContext } from "@hello-pangea/dnd";

import Tabs from "./components/Tabs";
import TeamsColumn from "./components/TeamsColumn";
import BoardWrapper from "./components/BoardWrapper";
import TeamDetails from "./components/TeamDetails";
import LogsViewer from "./components/LogsViewer";
import MatrixViewer from "./components/MatrixViewer";

import { saveRanking, loadSampleObjects, createObject } from "./api";

function App() {
  const nextIdRef = useRef(1000);
  const getNextId = () => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    return id;
  };

  const [teams, setTeams] = useState([]);
  const [boardTeams, setBoardTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [currentTab, setCurrentTab] = useState("ranking");

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

  // ⚠️ ОНОВЛЕНО: Отримуємо expertId з BoardWrapper
  const handleSaveRanking = async (expertId) => {
    if (boardTeams.length === 0) {
      alert("⚠️ Дошка порожня!");
      return;
    }

    try {
      const order = boardTeams.map((t) => t.id);
      // Передаємо ID обраного експерта
      await saveRanking(order, expertId);
      alert(`✅ Збережено!`);
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
        <h1>Formula 1 Ranking Tool (Lab 2)</h1>
      </header>

      <Tabs currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {currentTab === "logs" && <LogsViewer />}
      {currentTab === "matrix" && <MatrixViewer />}

      {currentTab === "ranking" && (
        <div
          style={{ display: "flex", flexDirection: "column", width: "100%" }}
        >
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
                onSave={handleSaveRanking} // Передаємо функцію
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
