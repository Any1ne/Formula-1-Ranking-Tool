import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import Card from "./Card";

function Board({ boardTeams, onSelectTeam, onRemove }) {
  return (
    <Droppable droppableId="board">
      {(provided, snapshot) => (
        <div
          className="board-list"
          {...provided.droppableProps}
          ref={provided.innerRef}
          style={{
            minHeight: "400px",
            padding: "10px",
            borderRadius: "8px",
            backgroundColor: snapshot.isDraggingOver ? "#222" : "#111",
            border: snapshot.isDraggingOver ? "2px dashed #e10600" : "1px solid #333",
            transition: "all 0.3s ease",
          }}
        >
          {boardTeams.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "#888",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "10px" }}>📋</div>
              <p>Перетягніть об'єкти сюди</p>
              <p style={{ fontSize: "12px" }}>Верхній = найвищий ранг (1)</p>
            </div>
          )}

          {boardTeams.map((team, index) => (
            <Draggable
              key={team.id}
              draggableId={team.id.toString()}
              index={index}
            >
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  onClick={() => onSelectTeam(team)}
                  style={{
                    ...provided.draggableProps.style,
                    opacity: snapshot.isDragging ? 0.8 : 1,
                  }}
                >
                  <Card
                    id={team.id}
                    name={team.Constructor || team.name}
                    rank={index + 1}
                    onRemove={() => onRemove(team)}
                  />
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

export default Board;