import React, { useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";

import Tabs from "./components/Tabs";
import TeamsColumn from "./components/TeamsColumn";
import BoardWrapper from "./components/BoardWrapper";
import TeamDetails from "./components/TeamDetails";

import LogsViewer from "./components/LogsViewer";
import MatrixViewer from "./components/MatrixViewer";
import api from "./api";

function App() {
  const nextIdRef = React.useRef(1);
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

    // Ліва -> Дошка
    if (source.droppableId === "teams" && destination.droppableId === "board") {
      const item = teams[source.index];

      setTeams((prev) => prev.filter((_, i) => i !== source.index));
      setBoardTeams((prev) => {
        const arr = [...prev];
        arr.splice(destination.index, 0, item);
        return arr;
      });
    }

    // Дошка -> Дошка
    if (source.droppableId === "board" && destination.droppableId === "board") {
      const arr = [...boardTeams];
      const [moved] = arr.splice(source.index, 1);
      arr.splice(destination.index, 0, moved);
      setBoardTeams(arr);
    }
  };

  const handleAddTeam = (name) => {
  if (!name.trim()) return;

  const newTeam = { id: getNextId(), name: name.trim() };

  setTeams((prev) => [...prev, newTeam]);
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

    try {
      await api.post("/ranking/save/", {
        order: boardTeams.map((t) => t.id),
      });
      alert("✅ Збережено!");
    } catch (err) {
      alert("❌ Помилка!");
    }
  };

  const handleLoadSample = async () => {
  try {
    const response = await api.post("/objects/sample/");

    const sample = response.data.map((o) => ({
      id: getNextId(),
      name: o.name,
    }));

    setTeams((prev) => [...prev, ...sample]);
    alert(`Завантажено ${sample.length} об'єктів`);
  } catch (err) {
    alert("Помилка");
  }
};

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Formula 1 Ranking Tool</h1>
      </header>
      <Tabs currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {currentTab === "logs" && <LogsViewer />}
      {currentTab === "matrix" && <MatrixViewer />}

      {currentTab === "ranking" && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <main
            className="app-grid"
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "20px",
              alignItems: "flex-start",
              width: "100%",
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
      )}
      <footer className="app-footer">
        <p>© 2025 F1 Ranking Lab | КНУ ФІТ</p>
      </footer>
    </div>
  );
}

export default App;
