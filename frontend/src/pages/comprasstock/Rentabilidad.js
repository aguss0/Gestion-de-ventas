import { useQuery } from "@tanstack/react-query";
import { Layout } from "../../components/Layout";
import api from "../../services/api";

function fmt(n)  { return "$" + Number(n || 0).toLocaleString("es-AR"); }
function pct(n)  { return Number(n || 0).toFixed(1) + "%"; }

export function Rentabilidad({ embedded = false }) {
  const Contenedor = embedded ? ContenidoRentabilidad : Layout;
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["rentabilidad"],
    queryFn:  () => api.get("/comprasstock/rentabilidad").then(r => r.data),
  });

  const totalInvertido = items.reduce((s, i) => s + i.totalInvertido, 0);
  const totalVendido   = items.reduce((s, i) => s + i.totalVendido,   0);
  const totalGanancia  = items.reduce((s, i) => s + i.ganancia,       0);

  return (
    <Contenedor titulo="Rentabilidad por producto">

      {/* Resumen general */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total invertido",  value: fmt(totalInvertido), color: "var(--danger)"  },
          { label: "Total vendido",    value: fmt(totalVendido),   color: "var(--primary)" },
          { label: "Ganancia bruta",   value: fmt(totalGanancia),  color: "var(--success)" },
        ].map(m => (
          <div key={m.label} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Producto", "Stock actual", "Unid. compradas", "Total invertido", "Unid. vendidas", "Total vendido", "Ganancia", "Margen"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "2px solid var(--border)", fontWeight: 500, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>Cargando…</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>Sin datos de compras registradas</td></tr>}
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: "1px solid var(--border)" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                <td style={{ padding: "10px 14px", fontWeight: 500 }}>{item.nombre}</td>
                <td style={{ padding: "10px 14px" }}>{item.stockActual} {item.unidadMedida || "u"}</td>
                <td style={{ padding: "10px 14px", color: "var(--muted)" }}>{item.unidadesCompradas} {item.unidadMedida || "u"}</td>
                <td style={{ padding: "10px 14px", color: "var(--danger)" }}>{fmt(item.totalInvertido)}</td>
                <td style={{ padding: "10px 14px", color: "var(--muted)" }}>{item.unidadesVendidas} {item.unidadMedida || "u"}</td>
                <td style={{ padding: "10px 14px" }}>{fmt(item.totalVendido)}</td>
                <td style={{ padding: "10px 14px", fontWeight: 500, color: item.ganancia >= 0 ? "var(--success)" : "var(--danger)" }}>
                  {fmt(item.ganancia)}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{
                    fontSize: 12, padding: "2px 8px", borderRadius: 12, fontWeight: 500,
                    background: item.margen >= 30 ? "var(--green-light, #e8f5eb)" : item.margen >= 15 ? "#fef9c3" : "#fee2e2",
                    color:      item.margen >= 30 ? "#1a5229" : item.margen >= 15 ? "#854d0e" : "var(--danger)",
                  }}>
                    {pct(item.margen)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Contenedor>
  );
}
function ContenidoRentabilidad({ children }) { return <>{children}</>; }
