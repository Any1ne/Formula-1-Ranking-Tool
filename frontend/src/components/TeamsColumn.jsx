import { Droppable, Draggable } from "@hello-pangea/dnd";
import Card from "./Card";
import UploadCSV from "./UploadCSV";
import { useState } from "react";

export default function TeamsColumn({
  teams,
  addTeam,
  loadSample,
  setSelectedTeam,
  setTeams,
  getNextId
}) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");

  const submit = () => {
    addTeam(input);
    setInput("");
    setAdding(false);
  };

  return (
    <Droppable droppableId="teams" isDropDisabled>
      {(provided) => (
        <div className="teams-list" ref={provided.innerRef} {...provided.droppableProps}>
          <h3 style={{ color: "#e10600", marginBottom: "10px" }}>
            Об'єкти ({teams.length})
          </h3>

          {teams.map((team, index) => (
            <Draggable key={team.id} draggableId={String(team.id)} index={index}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  onClick={() => setSelectedTeam(team)}
                >
                  <Card id={team.id} name={team.name} small />
                </div>
              )}
            </Draggable>
          ))}

          {provided.placeholder}

          {adding ? (
            <div style={{ marginTop: "10px" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Назва об'єкта"
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              <button onClick={submit}>✓</button>
              <button onClick={() => setAdding(false)}>✗</button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)}>➕ Додати об'єкт</button>
          )}

          <button onClick={loadSample}>📦 Завантажити приклад</button>

          <UploadCSV setTeams={setTeams} getNextId={getNextId} />
        </div>
      )}
    </Droppable>
  );
}
