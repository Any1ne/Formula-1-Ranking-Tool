import React, { useState, useEffect, useRef } from "react";
import { getExperts } from "../api";

const ConsensusViewer = () => {
  const [experts, setExperts] = useState([]);
  const [weights, setWeights] = useState({});
  const [results, setResults] = useState(() => {
    try {
      const saved = localStorage.getItem("consensusResults");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [objLimit, setObjLimit] = useState(8);
  const [activeTab, setActiveTab] = useState("k1_rank");

  // State for logs (message + fixed timestamp)
  const [logs, setLogs] = useState([]);
  const [selectedSolIdx, setSelectedSolIdx] = useState(0);
  const [matrixModalData, setMatrixModalData] = useState(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    getExperts().then(setExperts);
  }, []);

  useEffect(() => {
    if (results) {
      localStorage.setItem("consensusResults", JSON.stringify(results));
    }
  }, [results]);

  useEffect(() => {
    setSelectedSolIdx(0);
  }, [activeTab]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const handleWeightChange = (id, val) => {
    setWeights((prev) => ({ ...prev, [id]: val }));
  };

  const openMatrixModal = (expertInput) => {
    setMatrixModalData({
      name: expertInput.expert_name,
      matrix: expertInput.matrix,
      headers: results.objects_header || [],
    });
  };

  const closeMatrixModal = () => {
    setMatrixModalData(null);
  };

  const handleExportResultsCSV = () => {
    if (!results) return;
    let csvContent = "\uFEFF";
    const sep = ";";

    const solutions = results.rankings ? results.rankings[activeTab] : [];
    if (!solutions || solutions.length === 0) return;

    const currentSol = solutions[selectedSolIdx];
    const currentStats = currentSol?.expert_stats || [];

    const methodMap = {
      k1_rank: "Медіана Кука",
      k2_rank: "ГВ-Медіана",
      k1_hamming: "Медіана Кемені",
      k2_hamming: "Мінімакс Хемінга",
    };

    csvContent += `МЕТОД: ${methodMap[activeTab] || activeTab}\n`;
    csvContent += `Обраний варіант розв'язку: ${selectedSolIdx + 1}\n`;
    if (results.execution_time) {
      csvContent += `Час обчислення: ${results.execution_time.toFixed(4)} s\n`;
    }
    csvContent += "\n";

    csvContent += `Експерт${sep}Початкова Вага${sep}Відстань до центру${sep}Компетентність\n`;
    currentStats.forEach((exp) => {
      const comp = (exp.calculated_competence * 100)
        .toFixed(2)
        .replace(".", ",");
      const weight = exp.input_weight || 1.0;
      csvContent += `"${exp.expert_name}"${sep}${weight}${sep}${exp.d_rank}${sep}${comp}%\n`;
    });

    csvContent += "\n--- ДЕТАЛІ РОЗВ'ЯЗКУ ---\n";
    csvContent += `Ранг${sep}Об'єкт\n`;
    if (currentSol && currentSol.order) {
      currentSol.order.forEach((item, itemIdx) => {
        csvContent += `${itemIdx + 1}${sep}"${item.name}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `consensus_${activeTab}_var${selectedSolIdx + 1}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startCalculation = async () => {
    setLoading(true);
    setResults(null);
    setProgress(0);
    setLogs([]); // Reset logs
    setStatusText("Ініціалізація...");
    setActiveTab("k1_rank");
    setSelectedSolIdx(0);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/calculate-consensus/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weights,
            limit_objects: objLimit,
          }),
        }
      );

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.replace("data: ", "");
            try {
              const data = JSON.parse(jsonStr);
              if (data.type === "start") {
                setStatusText(
                  `Перебір ${data.total.toLocaleString()} варіантів...`
                );
              } else if (data.type === "progress") {
                setProgress(data.percent);
              } else if (data.type === "log") {
                // FIXED: Capture time here, once
                const timeStr = new Date().toLocaleTimeString();
                setLogs((prev) => [
                  ...prev,
                  { message: data.message, time: timeStr },
                ]);
              } else if (data.type === "result") {
                setResults(data);
                setLoading(false);
                setProgress(100);
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setStatusText("Помилка з'єднання");
    }
  };

  const SolutionBlock = ({
    solution,
    index,
    expertNames,
    isSelected,
    onClick,
  }) => {
    const dists = solution?.distances || [];
    const order = solution?.order || [];

    return (
      <div
        onClick={onClick}
        className="solution-block"
        style={{
          border: isSelected ? "2px solid #e10600" : "1px solid #444",
          borderRadius: "8px",
          padding: "15px",
          marginBottom: "15px",
          backgroundColor: isSelected ? "#251010" : "#151515",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h4 style={{ color: isSelected ? "#fff" : "#aaa", marginTop: 0 }}>
            Розв'язок №{index + 1}
          </h4>
          {isSelected && (
            <span style={{ color: "#e10600", fontSize: "0.8em" }}>
              ● Обрано
            </span>
          )}
        </div>

        <div style={{ marginBottom: "10px", fontSize: "0.9em", color: "#ccc" }}>
          <strong>Характеристики (відстані):</strong>
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "5px",
            }}
          >
            {dists.map((dist, i) => (
              <span
                key={i}
                style={{
                  background: "#333",
                  padding: "2px 6px",
                  borderRadius: "4px",
                }}
              >
                {expertNames && expertNames[i]
                  ? expertNames[i]
                  : `Exp ${i + 1}`}
                : {dist}
              </span>
            ))}
          </div>
        </div>

        <ol className="ranking-ol" style={{ paddingLeft: "20px", margin: 0 }}>
          {order.map((item, i) => (
            <li key={item.id || i}>{item.name}</li>
          ))}
        </ol>
      </div>
    );
  };

  const getScoreLabel = () => {
    if (activeTab === "k1_rank" || activeTab === "k1_hamming")
      return "Сума (Sum)";
    return "Максимум (MinMax)";
  };

  const currentSolutions = results?.rankings?.[activeTab] || [];
  const currentSelectedSolution = currentSolutions[selectedSolIdx];
  const currentStats = currentSelectedSolution?.expert_stats || [];

  return (
    <div className="consensus-container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ color: "#e10600" }}>Лаб 3 & 4: Пошук компромісу</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          {results && (
            <button
              onClick={() => {
                setResults(null);
                setLogs([]);
                localStorage.removeItem("consensusResults");
              }}
              style={{
                padding: "10px",
                background: "#333",
                color: "#aaa",
                border: "1px solid #555",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              🗑 Скинути
            </button>
          )}
          <button
            onClick={handleExportResultsCSV}
            disabled={!results}
            className="export-btn"
          >
            💾 CSV
          </button>
        </div>
      </div>

      <div className="controls-section">
        <div className="settings-box">
          <h3>Налаштування</h3>
          <div style={{ marginBottom: "15px" }}>
            <label>
              Об'єктів: <strong>{objLimit}</strong>
            </label>
            <input
              type="range"
              min="3"
              max="12"
              value={objLimit}
              onChange={(e) => setObjLimit(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
          <button
            className="calculate-btn"
            onClick={startCalculation}
            disabled={loading}
          >
            {loading
              ? "Calculating..."
              : results
              ? "🔄 Перерахувати"
              : "🚀 Запустити"}
          </button>
        </div>
        {/* Deleted Expert Input Section here */}
      </div>

      <div className="protocol-box">
        <h4>📋 Протокол Роботи (Log)</h4>
        <div className="logs-container">
          {logs.length === 0 ? (
            <span style={{ color: "#555" }}>Очікування запуску...</span>
          ) : (
            logs.map((logItem, i) => (
              <div key={i} className="log-line">
                <span style={{ color: "#28a745", marginRight: "5px" }}>
                  [{logItem.time}]
                </span>
                {logItem.message}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
        {results?.execution_time && (
          <div
            style={{
              marginTop: "5px",
              borderTop: "1px solid #333",
              paddingTop: "5px",
              color: "#e10600",
              fontWeight: "bold",
              textAlign: "right",
            }}
          >
            Час виконання: {results.execution_time.toFixed(4)} с.
          </div>
        )}
      </div>

      {(loading || (progress > 0 && progress < 100)) && (
        <div className="progress-container">
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-stats">
            {statusText} ({progress}%)
          </div>
        </div>
      )}

      {results && (
        <div className="results-area">
          <div className="inputs-section">
            <h3 className="section-title">📥 Вхідні Ранжування</h3>
            <div className="inputs-grid">
              {results.inputs &&
                results.inputs.map((exp, idx) => (
                  <div key={idx} className="input-card">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <strong>{exp.expert_name}</strong>
                      <button
                        className="matrix-btn"
                        onClick={() => openMatrixModal(exp)}
                      >
                        Matrix
                      </button>
                    </div>
                    <ol className="mini-ol">
                      {exp.order.map((o, i) => (
                        <li key={o.id || i}>{o.name}</li>
                      ))}
                    </ol>
                  </div>
                ))}
            </div>
          </div>

          <hr style={{ borderColor: "#333", margin: "30px 0" }} />

          <div
            className="tabs-header"
            style={{ justifyContent: "center", marginBottom: "30px" }}
          >
            {["k1_rank", "k2_rank", "k1_hamming", "k2_hamming"].map((key) => {
              const names = {
                k1_rank: "Медіана Кука",
                k2_rank: "ГВ-Медіана",
                k1_hamming: "Медіана Кемені",
                k2_hamming: "Мінімакс Хемінга",
              };
              return (
                <button
                  key={key}
                  className={`tab-btn ${activeTab === key ? "active" : ""}`}
                  onClick={() => setActiveTab(key)}
                  style={{ fontSize: "1.1em" }}
                >
                  {names[key]}
                </button>
              );
            })}
          </div>
          <h3 className="section-title">🏆 Лаб 3: Компромісні Ранжування</h3>

          <div className="tab-content ranking-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
              }}
            >
              <h3 style={{ margin: 0, color: "#e10600" }}>
                {activeTab === "k1_rank" && "Медіана Кука"}
                {activeTab === "k2_rank" && "ГВ-Медіана"}
                {activeTab === "k1_hamming" && "Медіана Кемені"}
                {activeTab === "k2_hamming" && "Мінімакс Хемінга"}
              </h3>
              <span className="badge">
                {getScoreLabel()}:{" "}
                {results.criteria && results.criteria[activeTab]}
              </span>
            </div>

            <div
              style={{
                marginBottom: "15px",
                color: "#888",
                fontStyle: "italic",
              }}
            >
              Знайдено {currentSolutions.length} оптимальних розв'язків.
              <span style={{ color: "#fff", marginLeft: "5px" }}>
                Клікніть на картку, щоб перерахувати компетентність.
              </span>
            </div>

            <div className="solutions-grid">
              {currentSolutions.map((solution, idx) => (
                <SolutionBlock
                  key={idx}
                  solution={solution}
                  index={idx}
                  expertNames={results.expert_names}
                  isSelected={selectedSolIdx === idx}
                  onClick={() => setSelectedSolIdx(idx)}
                />
              ))}
            </div>
          </div>
          <hr style={{ borderColor: "#333", margin: "30px 0" }} />
          <div className="competence-section">
            <h3 className="section-title">
              📊 Лаб 4: Компетентність
              <span
                style={{
                  fontSize: "0.6em",
                  color: "#888",
                  marginLeft: "10px",
                }}
              >
                (для Розв'язку №{selectedSolIdx + 1})
              </span>
            </h3>
            <table className="competence-table">
              <thead>
                <tr>
                  <th>Експерт</th>
                  <th>Вага (Вхід)</th>
                  <th>Відстань (d)</th>
                  <th>Компетентність (Calc)</th>
                </tr>
              </thead>
              <tbody>
                {currentStats.length > 0 ? (
                  currentStats.map((st, i) => (
                    <tr key={i}>
                      <td>{st.expert_name}</td>
                      <td style={{ color: "#aaa" }}>
                        {st.input_weight || 1.0}
                      </td>
                      <td>{st.d_rank}</td>
                      <td style={{ fontWeight: "bold", color: "#4CAF50" }}>
                        {(st.calculated_competence * 100).toFixed(2)}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">Дані відсутні</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MATRIX MODAL */}
      {matrixModalData && (
        <div className="modal-overlay" onClick={closeMatrixModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Матриця Порівнянь: {matrixModalData.name}</h3>
            <div className="matrix-scroll">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {matrixModalData.headers.map((h, i) => (
                      <th key={i} title={h}>
                        {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixModalData.matrix.map((row, r) => (
                    <tr key={r}>
                      <td
                        className="row-header"
                        title={matrixModalData.headers[r]}
                      >
                        {r + 1}
                      </td>
                      {row.map((val, c) => (
                        <td
                          key={c}
                          style={{
                            color:
                              val === 1
                                ? "#4CAF50"
                                : val === -1
                                ? "#e10600"
                                : "#555",
                            fontWeight: val !== 0 ? "bold" : "normal",
                          }}
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="close-btn" onClick={closeMatrixModal}>
              Закрити
            </button>
          </div>
        </div>
      )}

      <style>{`
        .consensus-container { padding: 20px; background-color: #0c0c0c; min-height: 80vh; color: white; font-family: sans-serif; }
        .controls-section { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
        .settings-box { border: 1px solid #333; padding: 15px; border-radius: 8px; background: #1a1a1a; flex: 1; }
        .protocol-box { border: 1px solid #333; padding: 15px; border-radius: 8px; background: #111; margin-bottom: 20px; }
        .logs-container { max-height: 150px; overflow-y: auto; font-family: monospace; font-size: 0.9em; color: #ccc; }
        .log-line { margin-bottom: 4px; border-bottom: 1px dashed #222; }

        .calculate-btn { width: 100%; padding: 15px; background: #e10600; color: white; border: none; cursor: pointer; border-radius: 4px; font-weight: bold; margin-top: 10px; }
        .calculate-btn:disabled, .export-btn:disabled { background: #555; opacity: 0.5; cursor: not-allowed; }
        .export-btn { padding: 10px 15px; background: #28a745; color: white; border: none; borderRadius: 4px; cursor: pointer; font-weight: bold; }
        .matrix-btn { background: #444; color: #fff; border: none; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8em; }
        .matrix-btn:hover { background: #666; }

        .progress-container { margin: 20px 0; padding: 15px; background: #1a1a1a; border: 1px solid #333; border-radius: 5px; }
        .progress-bar-bg { height: 10px; background: #333; border-radius: 5px; overflow: hidden; margin-top: 5px; }
        .progress-bar-fill { height: 100%; background: #28a745; transition: width 0.3s ease; }

        .section-title { color: #fff; border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 15px; }
        
        .inputs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .input-card { background: #1a1a1a; padding: 10px; border-radius: 6px; border: 1px solid #444; font-size: 0.9em; }
        .mini-ol { padding-left: 20px; margin: 5px 0 0 0; color: #aaa; }

        .competence-table { width: 100%; border-collapse: collapse; background: #1a1a1a; border-radius: 8px; overflow: hidden; }
        .competence-table th, .competence-table td { padding: 12px; text-align: left; border-bottom: 1px solid #333; }
        .competence-table th { background: #222; color: #e10600; }

        .tabs-header { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px; overflow-x: auto; }
        .tab-btn { background: #1a1a1a; border: 1px solid #333; color: #aaa; padding: 10px 20px; cursor: pointer; border-radius: 6px; transition: all 0.2s; white-space: nowrap; }
        .tab-btn:hover { background: #252525; }
        .tab-btn.active { background: #e10600; color: white; border-color: #e10600; }
        
        .ranking-card { background: #1a1a1a; padding: 20px; border: 1px solid #444; border-radius: 8px; margin: 0 auto; }
        .badge { background: #333; padding: 5px 10px; border-radius: 12px; font-weight: bold; color: #4CAF50; border: 1px solid #4CAF50; }
        .ranking-ol { font-size: 1.1em; line-height: 1.6; padding-left: 25px; }
        .ranking-ol li { margin-bottom: 5px; border-bottom: 1px dashed #333; }
        
        .solutions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .solution-block:hover { transform: translateY(-2px); border-color: #666; }

        /* Modal Styles */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; justify-content: center; alignItems: center; z-index: 1000; }
        .modal-content { background: #1a1a1a; padding: 20px; border-radius: 8px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; border: 1px solid #555; }
        .matrix-scroll { overflow-x: auto; margin-bottom: 15px; }
        .matrix-table { border-collapse: collapse; width: 100%; text-align: center; }
        .matrix-table th, .matrix-table td { border: 1px solid #444; padding: 8px; min-width: 30px; }
        .matrix-table th { background: #333; color: #e10600; }
        .row-header { background: #333; color: #e10600; font-weight: bold; }
        .close-btn { background: #e10600; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; float: right; }
      `}</style>
    </div>
  );
};

export default ConsensusViewer;
