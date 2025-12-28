import React, { useState, useEffect } from "react";
import api from "../api";

function MatrixViewer() {
  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("table");

  useEffect(() => {
    loadMatrix();
  }, []);

  const loadMatrix = async () => {
    try {
      setLoading(true);
      const response = await api.get("/matrix/latest/");
      const data = JSON.parse(response.data.matrix_json);
      setMatrix(data);
    } catch (error) {
      console.error("Error loading matrix:", error);
      setMatrix(null);
    } finally {
      setLoading(false);
    }
  };

const exportMatrix = () => {
  if (!matrix) return;

  // Сортуємо id
  const sortedIds = [...matrix.order]
    .map((x) => Number(x))
    .sort((a, b) => a - b);

  // Будуємо повну матрицю n×n
  const n = sortedIds.length;
  const full = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  matrix.pairs.forEach(([i, j, value]) => {
    const idxI = sortedIds.indexOf(Number(i));
    const idxJ = sortedIds.indexOf(Number(j));
    if (idxI !== -1 && idxJ !== -1) {
      full[idxI][idxJ] = value;
      full[idxJ][idxI] = -value;
    }
  });

  // Формуємо CSV
  let csv = "ID," + sortedIds.join(",") + "\n";

  sortedIds.forEach((rowId, i) => {
    const row = [rowId, ...full[i]];
    csv += row.join(",") + "\n";
  });

  // Завантаження CSV
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `pairwise_matrix_${new Date().toISOString()}.csv`;
  link.click();
};

  if (loading) {
    return (
      <div style={{ color: "#fff", padding: "40px", textAlign: "center" }}>
        Завантаження матриці...
      </div>
    );
  }

  if (!matrix) {
    return (
      <div
        style={{
          color: "#fff",
          padding: "40px",
          textAlign: "center",
          backgroundColor: "#1a1a1a",
          margin: "20px",
          borderRadius: "8px",
        }}
      >
        <div style={{ fontSize: "64px", marginBottom: "20px" }}>🔢</div>
        <h3>Матриця ще не створена</h3>
        <p style={{ color: "#888" }}>
          Проведіть ранжування та збережіть його, щоб згенерувати матрицю
          попарних порівнянь
        </p>
      </div>
    );
  }

  // -------------------------
  // 🔥 СОРТУВАННЯ ЗА ID
  // -------------------------
  const sortedIds = [...matrix.order]
    .map((x) => Number(x))
    .sort((a, b) => a - b);

  const sortedPairs = [...matrix.pairs].sort((a, b) => {
    if (a[0] !== b[0]) return a[0] - b[0];
    return a[1] - b[1];
  });

  // -------------------------
  // 🔥 ПОВНА МАТРИЦЯ N×N (за sortedIds)
  // -------------------------
  const buildFullMatrix = () => {
    const n = sortedIds.length;
    const full = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    matrix.pairs.forEach(([i, j, value]) => {
      const idxI = sortedIds.indexOf(Number(i));
      const idxJ = sortedIds.indexOf(Number(j));

      if (idxI !== -1 && idxJ !== -1) {
        full[idxI][idxJ] = value;
        full[idxJ][idxI] = -value;
      }
    });

    return full;
  };

  const fullMatrix = buildFullMatrix();

  // -------------------------
  // 🔥 РЕНДЕР
  // -------------------------

  return (
    <div
      style={{
        padding: "20px",
        color: "#fff",
        backgroundColor: "#0c0c0c",
        minHeight: "calc(100vh - 200px)",
      }}
    >
      {/* Заголовок */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ color: "#e10600" }}>🔢 Матриця попарних порівнянь</h2>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setViewMode("table")}
            style={{
              padding: "8px 16px",
              backgroundColor: viewMode === "table" ? "#e10600" : "#333",
              color: "#fff",
              borderRadius: "4px",
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
            }}
          >
            🔲 Матриця
          </button>
          <button
            onClick={loadMatrix}
            style={{
              padding: "8px 16px",
              backgroundColor: "#333",
              color: "#fff",
              borderRadius: "4px",
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
            }}
          >
            💾 Експорт
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#1a1a1a",
          borderRadius: "8px",
        }}
      >
        <div>
          <span style={{ color: "#888" }}>Кількість об'єктів:</span>{" "}
          <strong style={{ color: "#e10600" }}>{matrix.n}</strong>
        </div>
        <div>
          <span style={{ color: "#888" }}>Кількість пар:</span>{" "}
          <strong style={{ color: "#00ff00" }}>{matrix.pairs.length}</strong>
        </div>
        <div>
          <span style={{ color: "#888" }}>Формула:</span>{" "}
          <strong>n(n−1)/2 = {(matrix.n * (matrix.n - 1)) / 2}</strong>
        </div>
      </div>

      {/* Список ID */}
      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#1a1a1a",
          borderRadius: "8px",
        }}
      >
        <h4 style={{ color: "#e10600", marginBottom: "10px" }}>
          📊 Об’єкти у порядку ID:
        </h4>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {sortedIds.map((id) => (
            <div
              key={id}
              style={{
                padding: "8px 12px",
                backgroundColor: "#0c0c0c",
                borderRadius: "4px",
                border: "1px solid #333",
              }}
            >
              ID: {id}
            </div>
          ))}
        </div>
      </div>

      {/* Список пар */}
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
        /* Матриця n×n */
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
    </div>
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

const tdValue = {
  ...tdCenter,
  color: "#00ff00",
  fontWeight: "bold",
};

export default MatrixViewer;
