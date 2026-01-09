import React, { useState, useEffect } from "react";
// ВИПРАВЛЕННЯ 1: Використовуємо правильну назву функції з api.js
import { getExperts } from "../api";

const ConsensusViewer = () => {
  const [experts, setExperts] = useState([]);
  const [weights, setWeights] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // Progress State
  const [progress, setProgress] = useState(0);
  const [totalPermutations, setTotalPermutations] = useState(0);
  const [currentIter, setCurrentIter] = useState(0);
  const [statusText, setStatusText] = useState("");

  // Limit objects slider (Critical for demo performance)
  const [objLimit, setObjLimit] = useState(8);

  useEffect(() => {
    // ВИПРАВЛЕННЯ: Виклик правильної функції
    getExperts().then(setExperts);
  }, []);

  const handleWeightChange = (id, val) => {
    setWeights((prev) => ({ ...prev, [id]: val }));
  };

  const startCalculation = async () => {
    setLoading(true);
    setResults(null);
    setProgress(0);
    setStatusText("Initializing Brute Force...");

    try {
      // ВИПРАВЛЕННЯ 2: URL має відповідати urls.py (calculate-consensus)
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

        // Split by double newline which is standard for SSE or our custom stream
        const lines = buffer.split("\n\n");
        buffer = lines.pop(); // Keep the last incomplete chunk

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.replace("data: ", "");
            try {
              const data = JSON.parse(jsonStr);

              if (data.type === "start") {
                setTotalPermutations(data.total);
                setStatusText(
                  `Running ${data.total.toLocaleString()} permutations...`
                );
              } else if (data.type === "progress") {
                setCurrentIter(data.current);
                setProgress(data.percent);
              } else if (data.type === "result") {
                setResults(data);
                setLoading(false);
                setProgress(100);
              }
            } catch (e) {
              console.error("Parse error", e);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setStatusText("Error in calculation stream.");
      setLoading(false);
    }
  };

  // --- ЕКСПОРТ У CSV (Excel-friendly) ---
  const handleExportCSV = () => {
    if (!results) return;

    // BOM для коректного відображення кирилиці в Excel
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    const separator = ";";
    const fmt = (num) =>
      num !== undefined && num !== null ? num.toString().replace(".", ",") : "";

    // 1. Дані експертів
    csvContent += "Експерт;Вага;d_rank;Компетентність\n";
    results.expert_stats.forEach((exp) => {
      const row = [
        `"${exp.expert_name}"`,
        fmt(exp.input_weight),
        exp.d_rank,
        fmt(exp.calculated_competence),
      ].join(separator);
      csvContent += row + "\n";
    });

    // 2. Блок критеріїв
    csvContent += "\nКритерії Оптимальності\n";
    csvContent += `K1 Rank (Cook);${fmt(results.criteria.K1_rank)}\n`;
    csvContent += `K2 Rank (GV);${fmt(results.criteria.K2_rank)}\n`;
    csvContent += `K1 Hamming (Kemeny);${fmt(results.criteria.K1_hamming)}\n`;
    csvContent += `K2 Hamming;${fmt(results.criteria.K2_hamming)}\n`;

    // 3. Результати (беремо K1 Rank як основний компроміс)
    csvContent += "\nОсновне Компромісне Ранжування (K1 Rank)\n";
    csvContent += "Ранг;Об'єкт\n";
    results.rankings.k1_rank.forEach((item, index) => {
      csvContent += `${index + 1};"${item.name}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `consensus_full_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to render a ranking list
  const renderList = (list, title, score) => (
    <div className="ranking-card">
      <h4
        style={{
          borderBottom: "1px solid #444",
          paddingBottom: "5px",
          marginBottom: "10px",
        }}
      >
        {title}
      </h4>
      <div className="criteria-score">Score: {score.toFixed(1)}</div>
      <ol style={{ paddingLeft: "20px", margin: 0 }}>
        {list.map((item, idx) => (
          <li key={item.id} style={{ marginBottom: "5px" }}>
            {item.name}
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <div className="consensus-container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ color: "#e10600" }}>
          Лаб 3 & 4: Пошук компромісу (Brute Force)
        </h2>
        <button
          onClick={handleExportCSV}
          disabled={!results}
          style={{
            padding: "10px",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            opacity: results ? 1 : 0.5,
          }}
        >
          💾 CSV Export
        </button>
      </div>

      <div className="controls-section">
        <div className="settings-box">
          <h3>1. Налаштування об'єктів</h3>
          <p className="warning-text">
            Увага: Повний перебір 12 об'єктів = 479 млн операцій. Рекомендується
            &lt; 9.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label>
              Об'єктів: <strong>{objLimit}</strong>
            </label>
            <input
              type="range"
              min="3"
              max="12"
              value={objLimit}
              onChange={(e) => setObjLimit(Number(e.target.value))}
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <div className="settings-box">
          <h3>2. Ваги експертів</h3>
          <div style={{ maxHeight: "150px", overflowY: "auto" }}>
            {experts.map((exp) => (
              <div key={exp.id} className="expert-weight-row">
                <span>{exp.name}:</span>
                <input
                  type="number"
                  step="0.1"
                  placeholder="1.0"
                  onChange={(e) => handleWeightChange(exp.id, e.target.value)}
                  style={{
                    width: "60px",
                    background: "#333",
                    color: "white",
                    border: "1px solid #555",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        className="calculate-btn"
        onClick={startCalculation}
        disabled={loading}
      >
        {loading ? "Calculating..." : "🚀 Запустити розрахунок (Stream)"}
      </button>

      {/* PROGRESS BAR */}
      {(loading || progress > 0) && (
        <div className="progress-container">
          <div className="progress-info">
            <span>{statusText}</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-stats">
            Iter: {currentIter.toLocaleString()} /{" "}
            {totalPermutations.toLocaleString()}
          </div>
        </div>
      )}

      {results && (
        <div className="results-area">
          <h3 style={{ color: "#e10600", marginTop: "30px" }}>
            Результати ранжування (4 Критерії)
          </h3>

          <div className="rankings-grid">
            {renderList(
              results.rankings.k1_rank,
              "K1 Rank (Медіана Кука)",
              results.criteria.K1_rank
            )}
            {renderList(
              results.rankings.k2_rank,
              "K2 Rank (ГВ-Медіана)",
              results.criteria.K2_rank
            )}
            {renderList(
              results.rankings.k1_hamming,
              "K1 Hamming (Кемені)",
              results.criteria.K1_hamming
            )}
            {renderList(
              results.rankings.k2_hamming,
              "K2 Hamming (Мінімакс)",
              results.criteria.K2_hamming
            )}
          </div>

          <div className="competence-table">
            <h3 style={{ color: "#4CAF50" }}>Компетентність Експертів</h3>
            <table>
              <thead>
                <tr>
                  <th>Експерт</th>
                  <th>Відстань (Rank)</th>
                  <th>Компетентність</th>
                </tr>
              </thead>
              <tbody>
                {results.expert_stats.map((st, i) => (
                  <tr key={i}>
                    <td>{st.expert_name}</td>
                    <td>{st.d_rank}</td>
                    <td>{(st.calculated_competence * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        .consensus-container { padding: 20px; background-color: #0c0c0c; min-height: 80vh; color: white; }
        .controls-section { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
        .settings-box { border: 1px solid #333; padding: 15px; flex: 1; min-width: 300px; border-radius: 8px; background: #1a1a1a; }
        .warning-text { color: #d9534f; font-size: 0.9em; margin-bottom: 10px; }
        .expert-weight-row { display: flex; justify-content: space-between; margin-bottom: 5px; padding: 5px; border-bottom: 1px solid #333; }
        .calculate-btn { width: 100%; padding: 15px; font-size: 1.2em; background: #e10600; color: white; border: none; cursor: pointer; border-radius: 4px; font-weight: bold; }
        .calculate-btn:disabled { background: #6c757d; }
        
        .progress-container { margin: 20px 0; padding: 15px; background: #1a1a1a; border: 1px solid #333; border-radius: 5px; }
        .progress-info { display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold; }
        .progress-bar-bg { height: 20px; background: #333; border-radius: 10px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: #28a745; transition: width 0.3s ease; }
        .progress-stats { text-align: right; font-size: 0.8em; color: #888; margin-top: 5px; }

        .rankings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
        .ranking-card { background: #1a1a1a; padding: 15px; border: 1px solid #333; box-shadow: 0 2px 4px rgba(0,0,0,0.5); border-radius: 8px; }
        .criteria-score { font-weight: bold; color: #28a745; margin-bottom: 10px; font-size: 1.1em; }
        
        .competence-table { margin-top: 30px; background: #1a1a1a; padding: 15px; border-radius: 8px; }
        .competence-table table { width: 100%; border-collapse: collapse; margin-top: 10px; color: #ddd; }
        .competence-table th, .competence-table td { border: 1px solid #333; padding: 10px; text-align: left; }
        .competence-table th { background-color: #000; color: #e10600; }
      `}</style>
    </div>
  );
};

export default ConsensusViewer;
