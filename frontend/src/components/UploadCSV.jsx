import React from "react";
import { v4 as uuidv4 } from "uuid";

function UploadCSV({ setTeams }) {
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split("\n").filter(Boolean);
      if (lines.length < 2) return;

      // Перший рядок – заголовки
      const headers = lines[0].split(",").map(h => h.trim());

      const objects = lines.slice(1).map((line) => {
        const values = line.split(",").map(v => v.trim().replace(/"/g, ""));
        const obj = { id: uuidv4() };
        headers.forEach((header, i) => {
          // конвертуємо числа
          if (["Total_Starts","GP_Wins","Pole_Positions","GP_Podiums"].includes(header)) {
            obj[header] = Number(values[i]);
          } else if (header === "Win_Percentage") {
            obj[header] = Number(values[i].replace(",", ".").replace("%",""));
          } else {
            obj[header] = values[i];
          }
        });
        return obj;
      });

      console.log("Parsed objects:", objects); // <-- додаємо лог

      setTeams((prev) => [...prev, ...objects]);
    };

    reader.readAsText(file);
  };

  return (
    <div style={{ marginTop: "10px" }}>
      <label style={{ cursor: "pointer", display: "block", color: "#fff", textAlign: "center" }}>
        Upload CSV
        <input type="file" accept=".csv" onChange={handleUpload} style={{ display: "none" }} />
      </label>
    </div>
  );
}

export default UploadCSV;
