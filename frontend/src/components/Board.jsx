import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import Card from "./Card";

function Board({ boardTeams, onSelectTeam, onRemove }) {
  return (
    <Droppable droppableId="board">
      {(provided) => (
        <ul
          className="board-list"
          {...provided.droppableProps}
          ref={provided.innerRef}
          style={{ minHeight: "400px", border: "1px solid #ccc", padding: "10px", borderRadius: "8px" }}
        >
          {boardTeams.map((team, index) => (
            <Draggable key={team.id} draggableId={team.id} index={index}>
              {(provided) => (
                <li
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  onClick={() => onSelectTeam(team)}
                >
                  <Card
                    name={team.Constructor || team.name}
                    rank={index + 1}
                    onRemove={() => onRemove(team)}
                  />
                </li>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </ul>
      )}
    </Droppable>
  );
}

export default Board;
