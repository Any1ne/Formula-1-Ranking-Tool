import React, { useState, useEffect } from "react";
import { getMatrices, getExperts, getCollectiveCSVUrl } from "../api";

function MatrixViewer() {
  const [allMatrices, setAllMatrices] = useState([]); // Всі завантажені
  const [filteredMatrix, setFilteredMatrix] = useState(null); // Обрана для показу
  const [experts, setExperts] = useState([]);
  const [selectedExpertId, setSelectedExpertId] = useState("all");

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table");

  const loadData = async () => {
    try {
      setLoading(true);
      const [matricesData, expertsData] = await Promise.all([
        getMatrices(),
        getExperts(),
      ]);

      setAllMatrices(matricesData);
      setExperts(expertsData);

      // За замовчуванням показуємо найсвіжішу
      if (matricesData.length > 0) {
        setFilteredMatrix(matricesData[0]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Фільтрація при зміні селекту
  useEffect(() => {
    if (allMatrices.length === 0) return;

    if (selectedExpertId === "all") {
      // Якщо "Всі" -> показуємо найсвіжішу з усіх
      setFilteredMatrix(allMatrices[0]);
    } else {
      // Шукаємо найсвіжішу матрицю ЦЬОГО експерта
      const expertMatrix = allMatrices.find(
        (m) => m.expert === parseInt(selectedExpertId)
      );
      setFilteredMatrix(expertMatrix || null);
    }
  }, [selectedExpertId, allMatrices]);

  const exportMatrix = () => {
    if (!filteredMatrix) return;
    const data = JSON.parse(filteredMatrix.matrix_json);
    const sortedIds = [...data.order]
      .map((x) => Number(x))
      .sort((a, b) => a - b);
    const n = sortedIds.length;
    const full = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    data.pairs.forEach(([i, j, value]) => {
      const idxI = sortedIds.indexOf(Number(i));
      const idxJ = sortedIds.indexOf(Number(j));
      if (idxI !== -1 && idxJ !== -1) {
        full[idxI][idxJ] = value;
        full[idxJ][idxI] = -value;
      }
    });

    let csv = "ID," + sortedIds.join(",") + "\n";
    sortedIds.forEach((rowId, i) => {
      const row = [rowId, ...full[i]];
      csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `matrix_${filteredMatrix.expert_name}.csv`;
    link.click();
  };

  if (loading)
    return (
      <div style={{ color: "#fff", padding: "40px", textAlign: "center" }}>
        Завантаження...
      </div>
    );

  return (
    <div
      style={{
        padding: "20px",
        color: "#fff",
        backgroundColor: "#0c0c0c",
        minHeight: "calc(100vh - 200px)",
      }}
    >
      {/* Верхня панель: Скачати колективний + Фільтр */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#1a1a1a",
          borderRadius: "8px",
        }}
      >
        <div>
          <label style={{ marginRight: "10px", fontWeight: "bold" }}>
            🔍 Показати результати експерта:
          </label>
          <select
            value={selectedExpertId}
            onChange={(e) => setSelectedExpertId(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px" }}
          >
            <option value="all">-- Останній запис (Всі) --</option>
            {experts.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <a href={getCollectiveCSVUrl()} target="_blank" rel="noreferrer">
          <button
            style={{
              padding: "10px 20px",
              backgroundColor: "#4CAF50",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            📥 Завантажити колективний звіт (CSV)
          </button>
        </a>
      </div>

      {!filteredMatrix ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <h3>Для обраного експерта немає збережених матриць.</h3>
        </div>
      ) : (
        <MatrixContent
          matrixObj={filteredMatrix}
          viewMode={viewMode}
          setViewMode={setViewMode}
          loadData={loadData}
          exportMatrix={exportMatrix}
        />
      )}
    </div>
  );
}

// Виніс відображення в окремий компонент для чистоти
function MatrixContent({
  matrixObj,
  viewMode,
  setViewMode,
  loadData,
  exportMatrix,
}) {
  const matrixData = JSON.parse(matrixObj.matrix_json);
  const sortedIds = [...matrixData.order]
    .map((x) => Number(x))
    .sort((a, b) => a - b);
  const sortedPairs = [...matrixData.pairs].sort((a, b) =>
    a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]
  );

  const fullMatrix = Array(sortedIds.length)
    .fill(null)
    .map(() => Array(sortedIds.length).fill(0));
  matrixData.pairs.forEach(([i, j, value]) => {
    const idxI = sortedIds.indexOf(Number(i));
    const idxJ = sortedIds.indexOf(Number(j));
    if (idxI !== -1 && idxJ !== -1) {
      fullMatrix[idxI][idxJ] = value;
      fullMatrix[idxJ][idxI] = -value;
    }
  });

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ color: "#e10600", margin: 0 }}>🔢 Матриця порівнянь</h2>
          <div style={{ color: "#888", marginTop: "5px" }}>
            Експерт:{" "}
            <strong style={{ color: "#fff" }}>{matrixObj.expert_name}</strong>{" "}
            <br />
            Час: {new Date(matrixObj.created_at).toLocaleString()}
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setViewMode("table")}
            style={{
              padding: "8px 16px",
              backgroundColor: viewMode === "table" ? "#e10600" : "#333",
              color: "#fff",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            📋 Список
          </button>
          <button
            onClick={() => setViewMode("matrix")}
            style={{
              padding: "8px 16px",
              backgroundColor: viewMode === "matrix" ? "#e10600" : "#333",
              color: "#fff",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🔲 Матриця
          </button>
          <button
            onClick={loadData}
            style={{
              padding: "8px 16px",
              backgroundColor: "#333",
              color: "#fff",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🔄 Оновити
          </button>
          <button
            onClick={exportMatrix}
            style={{
              padding: "8px 16px",
              backgroundColor: "#e10600",
              color: "#fff",
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            💾 Експорт
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              backgroundColor: "#1a1a1a",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#0c0c0c" }}>
                <th style={th}>№</th>
                <th style={th}>Об’єкт i</th>
                <th style={th}>Об’єкт j</th>
                <th style={th}>Порівняння</th>
                <th style={th}>Значення</th>
              </tr>
            </thead>
            <tbody>
              {sortedPairs.map((pair, idx) => (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: idx % 2 === 0 ? "#1a1a1a" : "#0c0c0c",
                  }}
                >
                  <td style={tdCenter}>{idx + 1}</td>
                  <td style={tdCenter}>ID: {pair[0]}</td>
                  <td style={tdCenter}>ID: {pair[1]}</td>
                  <td style={tdCenter}>
                    {pair[0]} {">"} {pair[1]}
                  </td>
                  <td style={tdValue}>{pair[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>i \ j</th>
                {sortedIds.map((id) => (
                  <th key={id} style={th}>
                    {id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedIds.map((rowId, i) => (
                <tr key={rowId}>
                  <td style={th}>{rowId}</td>
                  {sortedIds.map((colId, j) => {
                    const value = fullMatrix[i][j];
                    return (
                      <td
                        key={colId}
                        style={{
                          ...tdCenter,
                          backgroundColor:
                            i === j
                              ? "#333"
                              : value === 1
                              ? "#003300"
                              : value === -1
                              ? "#330000"
                              : "#1a1a1a",
                          color:
                            value === 1
                              ? "#00ff00"
                              : value === -1
                              ? "#ff0000"
                              : "#888",
                          fontWeight: "bold",
                        }}
                      >
                        {i === j ? "-" : value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const th = {
  border: "1px solid #333",
  padding: "10px",
  backgroundColor: "#0c0c0c",
  color: "#e10600",
  fontWeight: "bold",
  minWidth: "50px",
};
const tdCenter = {
  border: "1px solid #333",
  padding: "10px",
  textAlign: "center",
};
const tdValue = { ...tdCenter, color: "#00ff00", fontWeight: "bold" };

export default MatrixViewer;
