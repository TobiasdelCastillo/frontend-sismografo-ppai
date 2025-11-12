import React from "react";
import { Link } from "react-router-dom";

function Inicio() {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center min-vh-100"
      style={{
        background: "linear-gradient(135deg, #0f2027 0%, #2c5364 100%)",
        color: "#fff",
        fontFamily: "'Segoe UI', 'Roboto', 'Arial', sans-serif",
      }}
    >
      <div
        className="shadow-lg rounded-4 p-5"
        style={{
          background: "rgba(20, 30, 48, 0.85)",
          maxWidth: 540,
          width: "100%",
        }}
      >
        <div className="mb-4 text-center">
          
          <h1 className="fw-bold mb-2" style={{ letterSpacing: 1 }}>
            Centro de Control de Red Sísmica <span style={{ color: "#00e6ff" }}>(CCRS)</span>
          </h1>
          <h5 className="mb-3" style={{ color: "#00e6ff" }}>
            Red Sísmica Nacional
          </h5>
        </div>
        <p className="mb-4 text-light" style={{ fontSize: 17 }}>
          Entidad responsable de la observación, detección, procesamiento y comunicación de los movimientos sísmicos en el país y áreas contiguas. CCRS es el organismo líder en monitoreo sísmico, brindando información en tiempo real y soporte a la toma de decisiones para la seguridad nacional.
        </p>
        <Link
          to="/revisionManual"
          className="btn btn-lg btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
          style={{
            background: "linear-gradient(90deg, #00e6ff 0%, #0072ff 100%)",
            border: "none",
            fontWeight: 600,
            fontSize: 18,
            boxShadow: "0 4px 24px 0 rgba(0,230,255,0.15)",
            transition: "transform 0.1s",
          }}
        >
          <i className="bi bi-journal-check" style={{ fontSize: 22 }}></i>
          Registrar Resultado de Revisión Manual
        </Link>
      </div>
    </div>
  );
}

export { Inicio };
