import React from "react";

function UploadCSV({ setTeams, getNextId }) {
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split("\n").filter(Boolean);

      if (lines.length < 2) {
        alert("❌ Файл порожній або має неправильний формат");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim());

      const objects = lines.slice(1).map((line) => {
        const values = line
          .split(",")
          .map((v) => v.trim().replace(/"/g, ""));

        const obj = { id: getNextId() };

        headers.forEach((header, i) => {
          const value = values[i];

          if (
            ["Total_Starts", "GP_Wins", "Pole_Positions", "GP_Podiums"].includes(
              header
            )
          ) {
            obj[header] = Number(value) || 0;
          } else if (header === "Win_Percentage") {
            obj[header] =
              Number(value?.replace(",", ".").replace("%", "")) || 0;
          } else {
            obj[header] = value || "";
          }
        });

        if (!obj.name) {
          obj.name = obj.Constructor || values[0] || "Unknown";
        }

        return obj;
      });

      setTeams((prev) => [...prev, ...objects]);
      alert(`✅ Завантажено ${objects.length} об'єктів`);
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div style={{ marginTop: "10px" }}>
      <label
        style={{
          cursor: "pointer",
          display: "block",
          padding: "10px",
          backgroundColor: "#333",
          color: "#fff",
          textAlign: "center",
          borderRadius: "4px",
          border: "1px dashed #666",
        }}
      >
        📄 Завантажити CSV
        <input
          type="file"
          accept=".csv"
          onChange={handleUpload}
          style={{ display: "none" }}
        />
      </label>
    </div>
  );
}

export default UploadCSV;
