import React, { useState } from "react";
import Board from "./components/Board";
import Card from "./components/Card";
import UploadCSV from "./components/UploadCSV";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { v4 as uuidv4 } from "uuid";

const initialTeams = [];

function App() {
  const [teams, setTeams] = useState(initialTeams);
  const [boardTeams, setBoardTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [addingTeam, setAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;

    // Ліва → Дошка
    if (source.droppableId === "teams" && destination.droppableId === "board") {
      const item = teams[source.index];
      setTeams(prev => prev.filter((_, i) => i !== source.index));
      setBoardTeams(prev => {
        const newBoard = Array.from(prev);
        newBoard.splice(destination.index, 0, item);
        return newBoard;
      });
    }

    // Дошка → Дошка
    if (source.droppableId === "board" && destination.droppableId === "board") {
      const items = Array.from(boardTeams);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setBoardTeams(items);
    }
  };

  const handleAddTeam = () => {
    if (!newTeamName.trim()) return;
    const newTeam = { id: uuidv4(), name: newTeamName.trim() };
    setTeams(prev => [...prev, newTeam]);
    setNewTeamName("");
    setAddingTeam(false);
  };

  const handleRemoveFromBoard = (team) => {
    setBoardTeams(prev => prev.filter(t => t.id !== team.id));
    setTeams(prev => [...prev, team]);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Formula 1 Ranking Tool</h1>
      </header>
      <main>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="app-container">
            {/* Ліва колонка */}
            <Droppable droppableId="teams" isDropDisabled={true}>
              {(provided) => (
                <div
                  className="teams-list"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {teams.map((team, index) => (
                    <Draggable key={team.id} draggableId={team.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => setSelectedTeam(team)}
                        >
                          <Card name={team.Constructor || team.name} small />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {/* Додати команду */}
                  {addingTeam ? (
                    <div style={{ marginTop: "10px" }}>
                      <input
                        type="text"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Team Name"
                        style={{ width: "100%", padding: "4px", borderRadius: "4px" }}
                      />
                      <button onClick={handleAddTeam} style={{ marginTop: "5px", width: "100%" }}>
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingTeam(true)}
                      style={{ marginTop: "10px", width: "100%", cursor: "pointer" }}
                    >
                      Add Team
                    </button>
                  )}

                  {/* Upload CSV */}
                  <UploadCSV setTeams={setTeams} />
                </div>
              )}
            </Droppable>

            {/* Центр: дошка ранжування */}
            <Board
              boardTeams={boardTeams}
              onSelectTeam={setSelectedTeam}
              onRemove={handleRemoveFromBoard}
            />

            {/* Права колонка: деталі вибраної команди */}
            <div className="team-details">
              <h3>Team Details</h3>
              {selectedTeam ? (
                <ul>
                  <li><b>Constructor:</b> {selectedTeam.Constructor}</li>
                  <li><b>Total Starts:</b> {selectedTeam.Total_Starts}</li>
                  <li><b>GP Wins:</b> {selectedTeam.GP_Wins}</li>
                  <li><b>Win %:</b> {selectedTeam.Win_Percentage}</li>
                  <li><b>Pole Positions:</b> {selectedTeam.Pole_Positions}</li>
                  <li><b>GP Podiums:</b> {selectedTeam.GP_Podiums}</li>
                </ul>
              ) : <p>Select a team to see details</p>}
            </div>
          </div>
        </DragDropContext>
      </main>
      <footer className="app-footer">
        <p>© 2025 F1 Ranking Lab | Inspired by F1TV</p>
      </footer>
    </div>
  );
}

export default App;
