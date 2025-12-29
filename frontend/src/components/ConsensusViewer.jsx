import React, { useState, useEffect } from "react";
import { getConsensus } from "../api";

export default function ConsensusViewer() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getConsensus();
      setData(res);
    } catch (e) {
      console.error(e);
      alert("Помилка розрахунку. Переконайтеся, що є дані від експертів.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- НОВА ФУНКЦІЯ ДЛЯ ПУНКТУ 5 (Експорт у файл) ---
  const handleExport = () => {
    if (!data) return;

    // Формуємо текстовий звіт або JSON
    const fileData = JSON.stringify(data, null, 2);
    const blob = new Blob([fileData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `consensus_report_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    link.click();
  };

  if (loading)
    return <div style={{ color: "white", padding: 20 }}>Розрахунок...</div>;
  if (!data)
    return (
      <div style={{ color: "white", padding: 20 }}>
        Немає даних. Додайте експертів та зробіть ранжування.
      </div>
    );

  return (
    <div
      style={{
        padding: "20px",
        color: "#fff",
        backgroundColor: "#0c0c0c",
        minHeight: "80vh",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ color: "#e10600" }}>🏆 Компромісне ранжування (Lab 3)</h2>
        {/* Кнопка експорту */}
        <button
          onClick={handleExport}
          style={{
            padding: "10px 20px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          💾 Зберегти звіт у файл
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "20px",
          flexWrap: "wrap",
          marginTop: "20px",
        }}
      >
        {/* Consensus List */}
        <div
          style={{
            flex: 1,
            minWidth: "300px",
            backgroundColor: "#1a1a1a",
            padding: "15px",
            borderRadius: "8px",
          }}
        >
          <h3
            style={{
              borderBottom: "1px solid #333",
              paddingBottom: "10px",
              color: "#e10600",
            }}
          >
            Узгоджений порядок
            <span
              style={{ fontSize: "0.8em", color: "#888", marginLeft: "10px" }}
            >
              (Метод Борда)
            </span>
          </h3>
          <ol style={{ paddingLeft: "20px" }}>
            {data.consensus_order.map((item) => (
              <li
                key={item.id}
                style={{
                  marginBottom: "8px",
                  borderBottom: "1px solid #333",
                  paddingBottom: "4px",
                }}
              >
                <strong style={{ fontSize: "1.1em" }}>{item.name}</strong>
                <br />
                <span style={{ color: "#888", fontSize: "0.9em" }}>
                  Сума рангів: {item.score}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Distances Table */}
        <div
          style={{
            flex: 2,
            minWidth: "300px",
            backgroundColor: "#1a1a1a",
            padding: "15px",
            borderRadius: "8px",
          }}
        >
          <h3
            style={{
              borderBottom: "1px solid #333",
              paddingBottom: "10px",
              color: "#e10600",
            }}
          >
            Аналіз узгодженості (Відстані)
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  color: "#888",
                  borderBottom: "1px solid #555",
                }}
              >
                <th style={{ padding: "10px" }}>Експерт</th>
                <th style={{ padding: "10px" }}>d_rank (Рангова)</th>
                <th style={{ padding: "10px" }}>d_hamming (Хемінга)</th>
              </tr>
            </thead>
            <tbody>
              {data.expert_distances.map((exp, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #333" }}>
                  <td style={{ padding: "10px", fontWeight: "bold" }}>
                    {exp.expert}
                  </td>
                  <td style={{ padding: "10px" }}>{exp.d_rank}</td>
                  <td style={{ padding: "10px" }}>{exp.d_hamming}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              marginTop: "25px",
              padding: "15px",
              backgroundColor: "#000",
              borderRadius: "8px",
              border: "1px solid #333",
            }}
          >
            <h4 style={{ margin: "0 0 15px 0", color: "#4CAF50" }}>
              Критерії оптимальності (Functionals):
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <div>
                <span style={{ color: "#888" }}>K1 (Адитивний / Медіана):</span>
                <div style={{ fontSize: "1.2em", fontWeight: "bold" }}>
                  {data.criteria["K1_rank (Additive)"]}
                </div>
              </div>
              <div>
                <span style={{ color: "#888" }}>K2 (Мінімаксний / Центр):</span>
                <div style={{ fontSize: "1.2em", fontWeight: "bold" }}>
                  {data.criteria["K2_rank (Minimax)"]}
                </div>
              </div>
              <div
                style={{
                  gridColumn: "span 2",
                  marginTop: "10px",
                  borderTop: "1px dashed #333",
                  paddingTop: "10px",
                }}
              >
                <span style={{ color: "#888" }}>Сумарна відстань Хемінга:</span>
                <div style={{ fontSize: "1.2em", fontWeight: "bold" }}>
                  {data.criteria["K1_hamming"]}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={fetchData}
        style={{
          marginTop: "30px",
          padding: "10px 20px",
          backgroundColor: "#333",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        🔄 Перерахувати
      </button>
    </div>
  );
}
