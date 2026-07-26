import { useQuery } from "@tanstack/react-query";
import { Layout } from "../../components/Layout";
import { comisionService } from "../../services/pedidoService";

function fmt(n) { return "$" + Number(n || 0).toLocaleString("es-AR"); }

export function Comisiones() {
  const { data: detalle = [], isLoading } = useQuery({
    queryKey: ["comisiones"],
    queryFn:  comisionService.listar,
  });

  const { data: resumen = [] } = useQuery({
    queryKey: ["comisiones-resumen"],
    queryFn:  comisionService.resumen,
  });

  return (
    <Layout titulo="Comisiones">

      {/* Resumen por vendedor */}
      {resumen.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
          {resumen.map(v => (
            <div key={v.vendedor} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>🤝 {v.vendedor}</div>
              {v.comisionMiguel  > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: "var(--muted)" }}>Miguel:</span><span>{fmt(v.comisionMiguel)}</span></div>}
              {v.comisionGerardo > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: "var(--muted)" }}>Gerardo:</span><span>{fmt(v.comisionGerardo)}</span></div>}
              {v.comisionTurko   > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: "var(--muted)" }}>Turko:</span><span>{fmt(v.comisionTurko)}</span></div>}
              {v.plusTurko       > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: "var(--muted)" }}>Plus Turko:</span><span style={{ color: "var(--success)" }}>{fmt(v.plusTurko)}</span></div>}
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                <span>Total:</span><span style={{ color: "var(--primary)" }}>{fmt(v.comisionMiguel + v.comisionGerardo + v.comisionTurko)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detalle */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>Detalle por pedido</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["OC", "Cliente", "Vendedor", "Importe", "Com. Miguel", "Com. Gerardo", "Com. Turko", "Plus Turko", "Método"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "1px solid var(--border)", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Cargando…</td></tr>}
            {detalle.length === 0 && !isLoading && <tr><td colSpan={9} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Sin comisiones registradas todavía</td></tr>}
            {detalle.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                <td style={{ padding: "9px 14px", fontWeight: 500 }}>#{c.pedido?.nroOrden}</td>
                <td style={{ padding: "9px 14px" }}>{c.pedido?.cliente?.nombre}</td>
                <td style={{ padding: "9px 14px" }}>{c.vendedor?.nombre}</td>
                <td style={{ padding: "9px 14px", fontWeight: 500 }}>{fmt(c.importe)}</td>
                <td style={{ padding: "9px 14px" }}>{c.comisionMiguel  > 0 ? fmt(c.comisionMiguel)  : "—"}</td>
                <td style={{ padding: "9px 14px" }}>{c.comisionGerardo > 0 ? fmt(c.comisionGerardo) : "—"}</td>
                <td style={{ padding: "9px 14px" }}>{c.comisionTurko   > 0 ? fmt(c.comisionTurko)   : "—"}</td>
                <td style={{ padding: "9px 14px", color: "var(--success)" }}>{c.plusTurko > 0 ? fmt(c.plusTurko) : "—"}</td>
                <td style={{ padding: "9px 14px" }}>{c.metodo || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}