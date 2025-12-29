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

  if (loading)
    return <div style={{ color: "white", padding: 20 }}>Розрахунок...</div>;
  if (!data)
    return <div style={{ color: "white", padding: 20 }}>Немає даних</div>;

  return (
    <div
      style={{
        padding: "20px",
        color: "#fff",
        backgroundColor: "#0c0c0c",
        minHeight: "80vh",
      }}
    >
      <h2 style={{ color: "#e10600" }}>🏆 Компромісне ранжування (Lab 3)</h2>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
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
          <h3 style={{ borderBottom: "1px solid #333", paddingBottom: "10px" }}>
            Узгоджений порядок (Метод Борда)
          </h3>
          <ol style={{ paddingLeft: "20px" }}>
            {data.consensus_order.map((item) => (
              <li key={item.id} style={{ marginBottom: "5px" }}>
                <strong>{item.name}</strong>{" "}
                <span style={{ color: "#888" }}>
                  (Сума рангів: {item.score})
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
          <h3 style={{ borderBottom: "1px solid #333", paddingBottom: "10px" }}>
            Відстані до думок експертів
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#e10600" }}>
                <th style={{ padding: "10px" }}>Експерт</th>
                <th style={{ padding: "10px" }}>d_rank (Рангова)</th>
                <th style={{ padding: "10px" }}>d_hamming (Хемінга)</th>
              </tr>
            </thead>
            <tbody>
              {data.expert_distances.map((exp, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #333" }}>
                  <td style={{ padding: "10px" }}>{exp.expert}</td>
                  <td style={{ padding: "10px" }}>{exp.d_rank}</td>
                  <td style={{ padding: "10px" }}>{exp.d_hamming}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              marginTop: "20px",
              padding: "10px",
              backgroundColor: "#000",
              borderRadius: "4px",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0", color: "#4CAF50" }}>
              Критерії оптимальності:
            </h4>
            <p>
              <strong>K1 (Адитивний / Медіана):</strong>{" "}
              {data.criteria["K1_rank (Additive)"]}
            </p>
            <p>
              <strong>K2 (Мінімаксний / Центр):</strong>{" "}
              {data.criteria["K2_rank (Minimax)"]}
            </p>
            <p>
              <strong>Сумарна відстань Хемінга:</strong>{" "}
              {data.criteria["K1_hamming"]}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={fetchData}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          backgroundColor: "#e10600",
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
