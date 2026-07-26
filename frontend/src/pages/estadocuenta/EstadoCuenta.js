import { useQuery } from "@tanstack/react-query";
import { Layout } from "../../components/Layout";
import { estadoCuentaService } from "../../services/pedidoService";

function fmt(n) { return "$" + Number(n || 0).toLocaleString("es-AR"); }
function fmtFecha(f) { if (!f) return "—"; return new Date(f).toLocaleDateString("es-AR"); }

export function EstadoCuenta() {
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["estadocuenta"],
    queryFn:  estadoCuentaService.listar,
  });

  const totalVentas  = pedidos.reduce((s, p) => s + p.totalVenta, 0);
  const totalPagado  = pedidos.reduce((s, p) => s + p.pagado, 0);
  const totalSaldo   = pedidos.reduce((s, p) => s + p.saldo, 0);

  return (
    <Layout titulo="Estado de cuenta">

      {/* Resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total ventas",   value: fmt(totalVentas),  color: "var(--text)" },
          { label: "Total cobrado",  value: fmt(totalPagado),  color: "var(--success)" },
          { label: "Saldo pendiente",value: fmt(totalSaldo),   color: "var(--danger)" },
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
              {["N° Orden", "Fecha", "Cliente", "Vendedor", "Total venta", "Pagado", "Saldo", "Obs."].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "2px solid var(--border)", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>Cargando…</td></tr>}
            {pedidos.map(p => (
              <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                <td style={{ padding: "10px 14px", fontWeight: 500 }}>#{p.nroOrden}</td>
                <td style={{ padding: "10px 14px", color: "var(--muted)" }}>{fmtFecha(p.fecha)}</td>
                <td style={{ padding: "10px 14px" }}>{p.cliente}</td>
                <td style={{ padding: "10px 14px", color: "var(--muted)" }}>{p.vendedor || "—"}</td>
                <td style={{ padding: "10px 14px", fontWeight: 500 }}>{fmt(p.totalVenta)}</td>
                <td style={{ padding: "10px 14px", color: "var(--success)" }}>{fmt(p.pagado)}</td>
                <td style={{ padding: "10px 14px", fontWeight: 500, color: p.saldo > 0 ? "var(--danger)" : "var(--success)" }}>
                  {p.saldo > 0 ? fmt(p.saldo) : "✓ Saldado"}
                </td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--muted)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.observaciones || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}