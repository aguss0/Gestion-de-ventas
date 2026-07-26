import { useNavigate, useLocation } from "react-router-dom";

const nav = [
  { path: "/pedidos",      label: "Pedidos",        icono: "🧾" },
  { path: "/estadocuenta", label: "Estado de cuenta",icono: "💰" },
  { path: "/pagos",        label: "Pagos",           icono: "💳" },
  { path: "/comisiones",   label: "Comisiones",      icono: "📊" },
  { path: "/clientes",     label: "Clientes",        icono: "👥" },
  { path: "/articulos",    label: "Artículos",       icono: "📦" },
  { path: "/vendedores",   label: "Vendedores",      icono: "🤝" },
];

export function Layout({ titulo, children, acciones }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{
        width: 210, background: "#1e293b", color: "#fff",
        display: "flex", flexDirection: "column", flexShrink: 0,
        position: "fixed", top: 0, left: 0, height: "100vh", overflowY: "auto",
      }}>
        <div style={{ padding: "18px 16px", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>🏢 Sistema Ventas</div>
        </div>
        <nav style={{ padding: "8px 0", flex: 1 }}>
          {nav.map(item => (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px", cursor: "pointer", fontSize: 13,
                color: location.pathname.startsWith(item.path) ? "#fff" : "rgba(255,255,255,.65)",
                background: location.pathname.startsWith(item.path) ? "rgba(255,255,255,.1)" : "transparent",
                borderLeft: `3px solid ${location.pathname.startsWith(item.path) ? "#3b82f6" : "transparent"}`,
              }}
            >
              <span>{item.icono}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
      </aside>

      <div style={{ flex: 1, marginLeft: 210 }}>
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