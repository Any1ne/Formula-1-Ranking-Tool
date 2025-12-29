import React from "react";

const Valve = ({ type, level, limit, step, onLimitChange }) => {
  // level: 0 to 100 (ступінь відкриття)
  const color = type === "COLD" ? "#3B82F6" : "#EF4444"; // Brilliant Blue / Red

  // Розрахунок кута: 0% = -135deg, 100% = +135deg
  const angle = -135 + (level / 100) * 270;

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
          {/* Шкала (фонова дуга) */}
          <path
            d="M 20 80 A 40 40 0 1 1 80 80"
            fill="none"
            stroke="#333"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Активна дуга (рівень відкриття) */}
          <path
            d="M 20 80 A 40 40 0 1 1 80 80"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="251"
            strokeDashoffset={251 - (251 * level) / 100}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
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
            transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
            display: "flex",
            justifyContent: "center",
            boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
            zIndex: 10,
          }}
        >
          {/* Вказівник */}
          <div
            style={{
              width: "4px",
              height: "12px",
              backgroundColor: "#fff",
              marginTop: "5px",
              borderRadius: "2px",
            }}
          ></div>

          {/* Індикатор відсотка всередині ручки */}
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
            {level}%
          </div>
        </div>
      </div>

      {/* Підписи */}
      <div style={{ marginTop: "5px", textAlign: "center" }}>
        <div
          style={{
            color: "#aaa",
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Вентиль {type === "COLD" ? "Холодної" : "Гарячої"}
        </div>
        <div style={{ color: "#666", fontSize: "11px", marginTop: "2px" }}>
          Крок регулювання: <span style={{ color: "#fff" }}>{step}%</span>
        </div>
      </div>

      {/* Перемикач ліміту (імітація датчика кінцевого положення) */}
      <div
        onClick={onLimitChange}
        title="Натисніть, щоб імітувати досягнення межі"
        style={{
          marginTop: "12px",
          padding: "4px 10px",
          borderRadius: "12px",
          backgroundColor: limit ? "rgba(239, 68, 68, 0.15)" : "transparent",
          border: `1px solid ${limit ? "#EF4444" : "#444"}`,
          color: limit ? "#EF4444" : "#555",
          fontSize: "10px",
          fontWeight: "bold",
          cursor: "pointer",
          transition: "0.2s",
          display: "flex",
          alignItems: "center",
          gap: "5px",
        }}
      >
        <div
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: limit ? "#EF4444" : "#555",
          }}
        ></div>
        {limit ? "LIMIT REACHED" : "NO LIMIT"}
      </div>
    </div>
  );
};

export default Valve;
