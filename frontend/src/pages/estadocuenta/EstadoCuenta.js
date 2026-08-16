import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "../../components/Layout";
import { estadoCuentaService } from "../../services/pedidoService";

function fmt(n) { return "$" + Number(n || 0).toLocaleString("es-AR"); }
function fmtFecha(f) { if (!f) return "—"; return new Date(f).toLocaleDateString("es-AR"); }

export function EstadoCuenta() {
  const [filtroEstado, setFiltroEstado] = useState("todos"); // todos | saldado | pendiente
  const [desde, setDesde]               = useState("");
  const [hasta, setHasta]               = useState("");
  const [buscar, setBuscar]             = useState("");

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["estadocuenta"],
    queryFn:  estadoCuentaService.listar,
  });

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      // Filtro estado
      if (filtroEstado === "saldado"   && p.saldo > 0)  return false;
      if (filtroEstado === "pendiente" && p.saldo <= 0) return false;

      // Filtro fecha
      if (desde) {
        const fechaPedido = new Date(p.fecha);
        if (fechaPedido < new Date(desde)) return false;
      }
      if (hasta) {
        const fechaPedido = new Date(p.fecha);
        if (fechaPedido > new Date(hasta + "T23:59:59")) return false;
      }

      // Filtro búsqueda por cliente o vendedor
      if (buscar) {
        const texto = buscar.toLowerCase();
        if (
          !p.cliente?.toLowerCase().includes(texto) &&
          !p.vendedor?.toLowerCase().includes(texto)
        ) return false;
      }

      return true;
    });
  }, [pedidos, filtroEstado, desde, hasta, buscar]);

  const totalVentas  = pedidosFiltrados.reduce((s, p) => s + p.totalVenta, 0);
  const totalPagado  = pedidosFiltrados.reduce((s, p) => s + p.pagado, 0);
  const totalSaldo   = pedidosFiltrados.reduce((s, p) => s + p.saldo, 0);

  const inputStyle = {
    padding: "8px 10px", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", fontSize: 13,
    fontFamily: "inherit", background: "#fff",
  };

  return (
    <Layout titulo="Estado de cuenta">

      {/* Filtros */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>

        {/* Búsqueda */}
        <input
          style={{ ...inputStyle, minWidth: 180 }}
          placeholder="Buscar cliente o vendedor..."
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
        />

        {/* Estado */}
        <select style={inputStyle} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Con saldo pendiente</option>
          <option value="saldado">Saldados</option>
        </select>

        {/* Desde */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Desde</label>
          <input type="date" style={inputStyle} value={desde} onChange={e => setDesde(e.target.value)} />
        </div>

        {/* Hasta */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Hasta</label>
          <input type="date" style={inputStyle} value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>

        {/* Limpiar */}
        {(filtroEstado !== "todos" || desde || hasta || buscar) && (
          <button
            onClick={() => { setFiltroEstado("todos"); setDesde(""); setHasta(""); setBuscar(""); }}
            style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg)", fontSize: 12, cursor: "pointer", color: "var(--muted)" }}
          >
            Limpiar filtros
          </button>
        )}

        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>
          {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Resumen */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total ventas",    value: fmt(totalVentas), color: "var(--text)"    },
          { label: "Total cobrado",   value: fmt(totalPagado), color: "var(--success)" },
          { label: "Saldo pendiente", value: fmt(totalSaldo),  color: "var(--danger)"  },
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
            {isLoading && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>Cargando…</td></tr>
            )}
            {!isLoading && pedidosFiltrados.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No hay pedidos para los filtros seleccionados</td></tr>
            )}
            {pedidosFiltrados.map(p => (
              <tr key={p.id}
                style={{ borderBottom: "1px solid var(--border)", background: p.saldo <= 0 ? "#f0fdf4" : "#fff" }}
                onMouseEnter={e => e.currentTarget.style.background = p.saldo <= 0 ? "#dcfce7" : "var(--bg)"}
                onMouseLeave={e => e.currentTarget.style.background = p.saldo <= 0 ? "#f0fdf4" : "#fff"}
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