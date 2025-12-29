import React, { useState, useEffect } from "react";
import { getConsensus } from "../api";

export default function ConsensusViewer() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Стан для ручних ваг {expertId: weight}
  const [customWeights, setCustomWeights] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      // Передаємо ваги на сервер
      const res = await getConsensus(customWeights);
      setData(res);

      // Ініціалізуємо ваги при першому завантаженні, якщо вони порожні
      if (Object.keys(customWeights).length === 0 && res.expert_distances) {
        const initW = {};
        res.expert_distances.forEach(
          (e) => (initW[e.expert_id] = e.input_weight)
        );
        setCustomWeights(initW);
      }
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

  const handleWeightChange = (expertId, val) => {
    setCustomWeights((prev) => ({
      ...prev,
      [expertId]: val,
    }));
  };

  // --- ЕКСПОРТ У CSV (Excel-friendly) ---
  const handleExportCSV = () => {
    if (!data) return;

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // UTF-8 BOM

    // Заголовки
    csvContent +=
      "Експерт;Початкова Вага;Відстань (d_rank);Обернена відстань (1/(d+1));Норм. Компетентність;Компетентність %\n";

    // Дані
    const separator = ";";
    data.expert_distances.forEach((exp) => {
      const dist = exp.d_rank;
      const invDist = 1 / (dist + 1);
      const comp = exp.calculated_competence;
      const compPercent = (comp * 100).toFixed(2) + "%";

      const fmt = (num) => num.toString().replace(".", ",");

      const row = [
        `"${exp.expert}"`,
        fmt(exp.input_weight),
        dist,
        fmt(invDist.toFixed(4)),
        fmt(comp.toFixed(4)),
        `"${compPercent}"`,
      ].join(separator);

      csvContent += row + "\n";
    });

    // Блок критеріїв
    csvContent += "\n";
    csvContent += "Критерії Оптимальності\n";
    // Увага: переконайтеся, що ключі відповідають тим, що приходять з бекенду (views.py)
    // У нашому бекенді це "K1_rank" і "K1_hamming". K2 розраховуємо на льоту або додаємо на бекенді.
    // Якщо на бекенді немає K2, тут він буде undefined. Перевірте views.py!
    // (У моєму попередньому коді views.py K2 не було, я додав його нижче).

    csvContent += `K1 (Адитивний);${(data.criteria["K1_rank"] || 0)
      .toString()
      .replace(".", ",")}\n`;
    // Якщо K2 немає в criteria, візьмемо max з d_rank
    const k2_calc = Math.max(...data.expert_distances.map((e) => e.d_rank));
    csvContent += `K2 (Мінімакс);${k2_calc}\n`;

    csvContent += `K1 (Хемінга);${(data.criteria["K1_hamming"] || 0)
      .toString()
      .replace(".", ",")}\n`;

    // Ранжування
    csvContent += "\n";
    csvContent += "Компромісне Ранжування (Метод Борда)\n";
    csvContent += "Ранг;Об'єкт;Сума Балів\n";
    data.consensus_order.forEach((item, index) => {
      csvContent += `${index + 1};"${item.name}";${item.score
        .toFixed(1)
        .replace(".", ",")}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `lab4_competence_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading)
    return <div style={{ color: "white", padding: 20 }}>Розрахунок...</div>;
  if (!data)
    return (
      <div style={{ color: "white", padding: 20 }}>
        Немає даних. Додайте експертів та зробіть ранжування.
      </div>
    );

  // Обчислення K2 на клієнті, якщо бекенд не надсилає
  const k2_rank = Math.max(...data.expert_distances.map((e) => e.d_rank));

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
          marginBottom: "20px",
        }}
      >
        <h2 style={{ color: "#e10600", margin: 0 }}>
          🏆 Компетентність та Консенсус (Lab 3-4)
        </h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => fetchData()}
            style={{
              padding: "10px 20px",
              backgroundColor: "#e10600",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🔄 Перерахувати з новими вагами
          </button>
          <button
            onClick={handleExportCSV}
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
            💾 Експорт у CSV
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {/* ЛІВА КОЛОНКА */}
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
            Узгоджений порядок (Зважений)
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
                  Зважена сума рангів: {item.score.toFixed(1)}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* ПРАВА КОЛОНКА */}
        <div
          style={{
            flex: 2,
            minWidth: "400px",
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
            Таблиця компетентності та відстаней
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
                <th style={{ padding: "10px", width: "140px" }}>
                  Поч. Вага (Input)
                </th>
                <th style={{ padding: "10px" }}>d_rank</th>
                <th style={{ padding: "10px" }}>d_hamming</th>
                <th style={{ padding: "10px", color: "#4CAF50" }}>
                  Компетентність (Calc)
                </th>
              </tr>
            </thead>
            <tbody>
              {data.expert_distances.map((exp) => (
                <tr
                  key={exp.expert_id}
                  style={{ borderBottom: "1px solid #333" }}
                >
                  <td style={{ padding: "10px", fontWeight: "bold" }}>
                    {exp.expert}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={customWeights[exp.expert_id] || exp.input_weight}
                      onChange={(e) =>
                        handleWeightChange(exp.expert_id, e.target.value)
                      }
                      style={{
                        width: "60px",
                        padding: "5px",
                        borderRadius: "4px",
                        border: "1px solid #555",
                        backgroundColor: "#333",
                        color: "white",
                        textAlign: "center",
                      }}
                    />
                  </td>
                  <td style={{ padding: "10px" }}>{exp.d_rank}</td>
                  <td style={{ padding: "10px" }}>{exp.d_hamming}</td>
                  <td
                    style={{
                      padding: "10px",
                      fontWeight: "bold",
                      color: "#4CAF50",
                    }}
                  >
                    {(exp.calculated_competence * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* КРИТЕРІЇ */}
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
              Глобальні критерії оптимальності:
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <div>
                <span style={{ color: "#888" }}>K1 (Адитивний):</span>
                <div style={{ fontSize: "1.2em", fontWeight: "bold" }}>
                  {data.criteria["K1_rank"]
                    ? data.criteria["K1_rank"].toFixed(2)
                    : "0.00"}
                </div>
              </div>
              <div>
                <span style={{ color: "#888" }}>K2 (Мінімакс):</span>
                <div style={{ fontSize: "1.2em", fontWeight: "bold" }}>
                  {k2_rank}
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

          <p
            style={{
              color: "#888",
              fontSize: "0.9em",
              marginTop: "15px",
              fontStyle: "italic",
            }}
          >
            * Зміна ваги впливає на "центр" (консенсус), а отже і на значення
            критеріїв K1 та K2.
          </p>
        </div>
      </div>
    </div>
  );
}
