import { Fragment, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "../../components/Layout";
import { SelectorCliente } from "../../components/SelectorCliente";
import { estadoCuentaService } from "../../services/pedidoService";

function fmt(n) { return "$" + Number(n || 0).toLocaleString("es-AR"); }
const categorias = { papas: 'Laurens', descartables: 'Descartables', mf: 'MF', dietetica: 'Dietética' };
function fmtFecha(f) {
  if (!f) return "—";
  const d = new Date(f);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export function EstadoCuenta() {
  const [filtroEstado, setFiltroEstado] = useState("todos"); // todos | saldado | pendiente
  const [desde, setDesde]               = useState("");
  const [hasta, setHasta]               = useState("");
  const [categoria, setCategoria] = useState('todas');
  const [clienteId, setClienteId] = useState('');
  const [pedidoExpandido, setPedidoExpandido] = useState(null);

  const { data: pedidos = [], isLoading, error } = useQuery({
    queryKey: ["estadocuenta"],
    queryFn:  estadoCuentaService.listar,
  });
  const clientes = useMemo(() => [...new Map(pedidos.map(p => [p.clienteId, { id: p.clienteId, nombre: p.cliente }])).values()].sort((a,b) => (a.nombre || '').localeCompare(b.nombre || '')), [pedidos]);

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      if (categoria !== 'todas' && !p.categorias?.includes(categoria)) return false;
      if (clienteId && p.clienteId !== Number(clienteId)) return false;
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

      return true;
    });
  }, [pedidos, filtroEstado, desde, hasta, categoria, clienteId]);

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

        <SelectorCliente clientes={clientes} value={clienteId} onChange={setClienteId} style={inputStyle} />
        <select aria-label="Categoría" style={inputStyle} value={categoria} onChange={e => setCategoria(e.target.value)}>
          <option value="todas">Todas las categorías</option>
          {Object.entries(categorias).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
        </select>
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
        {(filtroEstado !== "todos" || desde || hasta || clienteId || categoria !== 'todas') && (
          <button
            onClick={() => { setFiltroEstado("todos"); setDesde(""); setHasta(""); setClienteId(''); setCategoria('todas'); }}
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
      {error && <p role="alert">No se pudo cargar el estado de cuenta. {error.response?.data?.error || error.message}</p>}
      {categoria !== 'todas' && <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Se muestran pedidos que contienen {categorias[categoria]}. Los importes y pagos corresponden al pedido completo, incluso si es mixto. No sumes los resultados de distintas categorías: un pedido mixto puede aparecer en más de una.</p>}
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
            {pedidosFiltrados.map(p => {
              const expandido = pedidoExpandido === p.id;
              return (
                <Fragment key={p.id}>
                  <tr
                    onClick={() => setPedidoExpandido(expandido ? null : p.id)}
                    onKeyDown={e => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setPedidoExpandido(expandido ? null : p.id);
                      }
                    }}
                    tabIndex={0}
                    aria-expanded={expandido}
                    style={{ borderBottom: expandido ? "none" : "1px solid var(--border)", background: p.saldo <= 0 ? "#f0fdf4" : "#fff", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = p.saldo <= 0 ? "#dcfce7" : "var(--bg)"}
                    onMouseLeave={e => e.currentTarget.style.background = p.saldo <= 0 ? "#f0fdf4" : "#fff"}
                  >
                    <td style={{ padding: "10px 14px", fontWeight: 500 }}>
                      <span style={{ display: "inline-block", width: 16, color: "var(--muted)" }}>{expandido ? "▾" : "▸"}</span>
                      #{p.nroOrden}
                      <div style={{ marginLeft: 16, fontSize: 11, color: 'var(--muted)' }}>{p.categorias?.length > 1 ? 'Mixto: ' : ''}{p.categorias?.map(c => categorias[c]).join(' / ') || 'Sin artículos'}</div>
                    </td>
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
                  {expandido && (
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <td colSpan={8} style={{ padding: "0 14px 16px 30px", background: p.saldo <= 0 ? "#f0fdf4" : "#f8fafc" }}>
                        <div style={{ paddingTop: 10, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                          Pagos del pedido ({p.pagos?.length || 0})
                        </div>
                        {!p.pagos?.length ? (
                          <div style={{ padding: "10px 12px", color: "var(--muted)", background: "#fff", border: "1px solid var(--border)", borderRadius: 7 }}>
                            Este pedido todavía no tiene pagos registrados.
                          </div>
                        ) : (
                          <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 7, background: "#fff" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead>
                                <tr>
                                  {["Fecha", "Forma de pago", "Importe", "Observaciones"].map(h => (
                                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "var(--muted)", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {p.pagos.map((pago, i) => (
                                  <tr key={pago.id} style={{ borderBottom: i < p.pagos.length - 1 ? "1px solid var(--border)" : "none" }}>
                                    <td style={{ padding: "8px 12px" }}>{fmtFecha(pago.fecha)}</td>
                                    <td style={{ padding: "8px 12px" }}>{pago.metodo}</td>
                                    <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--success)" }}>{fmt(pago.monto)}</td>
                                    <td style={{ padding: "8px 12px", color: "var(--muted)" }}>{pago.observaciones || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
