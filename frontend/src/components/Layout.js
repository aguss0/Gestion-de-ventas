import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const nav = [
  { path: "/pedidos",       label: "Pedidos",         icono: "🧾" },
  { path: "/estadocuenta",  label: "Estado de cuenta", icono: "💰" },
  { path: "/pagos",         label: "Pagos",            icono: "💳" },
  { path: "/comisiones",    label: "Comisiones",       icono: "📊" },
  { path: "/clientes",      label: "Clientes",         icono: "👥" },
  { path: "/articulos",     label: "Artículos",        icono: "📦" },
  { path: "/vendedores",    label: "Vendedores",       icono: "🤝" },
];

export function Layout({ titulo, children, acciones }) {
  const navigate   = useNavigate();
  const location   = useLocation();
  const [contraido, setContraido] = useState(false);

  const ancho = contraido ? 52 : 210;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>

      {/* Sidebar */}
      <aside style={{
        width: ancho, background: "#1e293b", color: "#fff",
        display: "flex", flexDirection: "column", flexShrink: 0,
        position: "fixed", top: 0, left: 0, height: "100vh",
        overflowY: "auto", overflowX: "hidden",
        transition: "width .2s ease", zIndex: 100,
      }}>
        {/* Logo + botón contraer */}
        <div style={{
          padding: contraido ? "16px 10px" : "18px 16px",
          borderBottom: "1px solid rgba(255,255,255,.1)",
          display: "flex", alignItems: "center",
          justifyContent: contraido ? "center" : "space-between",
        }}>
          {!contraido && <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}>🏢 Sistema Ventas</div>}
          <button
            onClick={() => setContraido(!contraido)}
            title={contraido ? "Expandir menú" : "Contraer menú"}
            style={{
              background: "rgba(255,255,255,.1)", border: "none",
              color: "#fff", borderRadius: 6, width: 28, height: 28,
              cursor: "pointer", fontSize: 14, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {contraido ? "▸" : "◂"}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ padding: "8px 0", flex: 1 }}>
          {nav.map(item => {
            const activo = location.pathname.startsWith(item.path);
            return (
              <div
                key={item.path}
                onClick={() => navigate(item.path)}
                title={contraido ? item.label : undefined}
                style={{
                  display: "flex", alignItems: "center",
                  gap: contraido ? 0 : 10,
                  padding: contraido ? "12px 0" : "10px 16px",
                  justifyContent: contraido ? "center" : "flex-start",
                  cursor: "pointer", fontSize: 13,
                  color: activo ? "#fff" : "rgba(255,255,255,.65)",
                  background: activo ? "rgba(255,255,255,.1)" : "transparent",
                  borderLeft: contraido ? "none" : `3px solid ${activo ? "#3b82f6" : "transparent"}`,
                  transition: "all .15s",
                }}
              >
                <span style={{ fontSize: contraido ? 18 : 15, flexShrink: 0 }}>{item.icono}</span>
                {!contraido && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Contenido */}
      <div style={{ flex: 1, marginLeft: ancho, transition: "margin-left .2s ease", minWidth: 0 }}>
        <div style={{
          background: "#fff", borderBottom: "1px solid var(--border)",
          padding: "0 24px", height: 52,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <span style={{ fontSize: 16, fontWeight: 500 }}>{titulo}</span>
          {acciones && <div>{acciones}</div>}
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
}