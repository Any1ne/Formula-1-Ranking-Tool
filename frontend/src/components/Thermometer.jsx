import React from "react";

const Thermometer = ({ tempState }) => {
  // tempState: 'LOW', 'NORM', 'HIGH', 'UNKNOWN'

  const config = {
    LOW: { height: "20%", color: "#3B82F6", label: "❄️ Низька" },
    NORM: { height: "50%", color: "#10B981", label: "✅ Норма" },
    HIGH: { height: "90%", color: "#EF4444", label: "🔥 Висока" },
    UNKNOWN: { height: "0%", color: "#333", label: "--" },
  };

  const { height, color, label } = config[tempState] || config.UNKNOWN;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "60px",
      }}
    >
      {/* Корпус */}
      <div
        style={{
          width: "16px",
          height: "120px",
          backgroundColor: "#222",
          borderRadius: "8px",
          position: "relative",
          border: "2px solid #444",
          padding: "2px",
        }}
      >
        {/* Рідна */}
        <div
          style={{
            position: "absolute",
            bottom: "2px",
            left: "2px",
            right: "2px",
            height: height,
            backgroundColor: color,
            borderRadius: "6px",
            transition: "height 0.8s ease, background-color 0.8s ease",
          }}
        ></div>

        {/* Риски (шкала) */}
        {[20, 40, 60, 80].map((top) => (
          <div
            key={top}
            style={{
              position: "absolute",
              top: `${top}%`,
              right: "-6px",
              width: "8px",
              height: "2px",
              backgroundColor: "#555",
            }}
          ></div>
        ))}
      </div>

      {/* Резервуар */}
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          backgroundColor: color,
          marginTop: "-10px",
          zIndex: 2,
          border: "2px solid #444",
          transition: "background-color 0.8s ease",
        }}
      ></div>

      <span
        style={{
          marginTop: "12px",
          fontSize: "12px",
          fontWeight: "bold",
          color: color,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
};

export default Thermometer;
