export default function TeamDetails({ selectedTeam }) {
  return (
    <div className="team-details">
      <h3 style={{ color: "#e10600" }}>Деталі об'єкта</h3>

      {!selectedTeam ? (
        <p style={{ color: "#888", padding: "20px", textAlign: "center" }}>
          Оберіть об'єкт
        </p>
      ) : (
        <div style={{ padding: "10px" }}>
          <p><strong>ID:</strong> {selectedTeam.id}</p>
          <p><strong>Назва:</strong> {selectedTeam.name}</p>

          {selectedTeam.Total_Starts && (
            <>
              <p><strong>Старти:</strong> {selectedTeam.Total_Starts}</p>
              <p><strong>Перемоги:</strong> {selectedTeam.GP_Wins}</p>
              <p><strong>Win %:</strong> {selectedTeam.Win_Percentage}</p>
              <p><strong>Поули:</strong> {selectedTeam.Pole_Positions}</p>
              <p><strong>Подіуми:</strong> {selectedTeam.GP_Podiums}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
