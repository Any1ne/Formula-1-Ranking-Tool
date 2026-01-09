import React from "react";

const Valve = ({ type, level, onManualChange }) => {
  // level: 0 to 100
  const color = type === "COLD" ? "#3B82F6" : "#EF4444";

  // Розрахунок кута: 0% = -135deg, 100% = +135deg
  const angle = -135 + (level / 100) * 270;
  const stepSize = 10; // Крок для ручної зміни

  const handleChange = (delta) => {
    const newVal = Math.min(Math.max(level + delta, 0), 100);
    if (onManualChange) onManualChange(newVal);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        margin: "0 20px",
      }}
    >
      {/* SVG Регулятор (Knob) */}
      <div style={{ position: "relative", width: "120px", height: "120px" }}>
        <svg width="120" height="120" viewBox="0 0 100 100">
          <path
            d="M 20 80 A 40 40 0 1 1 80 80"
            fill="none"
            stroke="#333"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M 20 80 A 40 40 0 1 1 80 80"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="251"
            strokeDashoffset={251 - (251 * level) / 100}
            style={{ transition: "stroke-dashoffset 0.3s ease" }}
          />
        </svg>

        {/* Ручка */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "80px",
            height: "80px",
            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
            borderRadius: "50%",
            backgroundColor: "#1a1a1a",
            border: `2px solid ${color}`,
            transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            display: "flex",
            justifyContent: "center",
            boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: "4px",
              height: "12px",
              backgroundColor: "#fff",
              marginTop: "5px",
              borderRadius: "2px",
            }}
          ></div>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(" + -angle + "deg)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            {Math.round(level)}%
          </div>
        </div>
      </div>

      {/* Панель ручного керування */}
      <div
        style={{
          marginTop: "15px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: "5px",
          alignItems: "center",
        }}
      >
        <div
          style={{
            color: "#aaa",
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "5px",
          }}
        >
          {type === "COLD" ? "Холодна" : "Гаряча"}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => handleChange(-stepSize)}
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              border: "1px solid #444",
              background: "#222",
              color: "#fff",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            -
          </button>
          <button
            onClick={() => handleChange(stepSize)}
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              border: "1px solid #444",
              background: "#222",
              color: "#fff",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default Valve;
