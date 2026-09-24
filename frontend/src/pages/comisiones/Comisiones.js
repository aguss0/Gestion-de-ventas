import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Layout } from "../../components/Layout";
import { comisionService } from "../../services/pedidoService";
import api from "../../services/api";
import { useOrden } from "../../hooks/useOrden";

function fmt(n) { return "$" + Number(n || 0).toLocaleString("es-AR"); }
function fmtFecha(f) {
  if (!f) return "—";
  const d = new Date(f);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export function Comisiones() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("general");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [soloSeleccionados, setSoloSeleccionados] = useState(false);
  const [seleccionados, setSeleccionados] = useState([]);
  const [soloConStock, setSoloConStock] = useState(false);

  const { data: detalle = [], isLoading } = useQuery({
    queryKey: ["comisiones", desde, hasta],
    queryFn: () => comisionService.listar({ desde, hasta }),
  });

  const vendedores = useMemo(() => {
    const unicos = new Map(detalle.map(c => [c.vendedorId, c.vendedor]));
    return [...unicos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [detalle]);

  const { mutate: toggleCobrado } = useMutation({
    mutationFn: ({ id, cobrado }) => api.patch(`/comisiones/${id}/cobrado`, { cobrado }).then(r => r.data),
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["comisiones"] });
    },
    onError: () => toast.error("Error al actualizar"),
  });

  const { mutate: limpiarHuerfanas, isPending: limpiando } = useMutation({
    mutationFn: comisionService.limpiarHuerfanas,
    onSuccess: data => {
      toast.success(data.mensaje);
      setSeleccionados([]);
      queryClient.invalidateQueries({ queryKey: ["comisiones"] });
    },
    onError: () => toast.error("No se pudieron limpiar las comisiones antiguas"),
  });

  const detalleFiltrado = useMemo(() => detalle.filter(c => {
    if (tab !== "general" && c.vendedorId !== Number(tab)) return false;
    if (soloConStock && !c.pedido?.detalle?.some(d => d.articulo?.manejaStock)) return false;
    if (soloSeleccionados && seleccionados.length && !seleccionados.includes(c.id)) return false;
    return true;
  }), [detalle, tab, soloConStock, soloSeleccionados, seleccionados]);

  const { datosordenados: comisionesOrdenadas, orden, toggleOrden } = useOrden(detalleFiltrado, { campo: "pedido.nroOrden", dir: "desc" });

  const baseParaResumen = useMemo(() =>
    soloSeleccionados && seleccionados.length
      ? detalle.filter(c => seleccionados.includes(c.id))
      : detalle,
  [detalle, soloSeleccionados, seleccionados]);

  const resumen = useMemo(() => {
    const mapa = new Map();
    for (const c of baseParaResumen) {
      if (!mapa.has(c.vendedorId)) mapa.set(c.vendedorId, { vendedorId: c.vendedorId, vendedor: c.vendedor.nombre, total: 0, cobrado: 0, pendiente: 0 });
      const fila = mapa.get(c.vendedorId);
      fila.total += c.monto;
      if (c.cobrado) fila.cobrado += c.monto;
      else fila.pendiente += c.monto;
    }
    return [...mapa.values()].sort((a, b) => a.vendedor.localeCompare(b.vendedor));
  }, [baseParaResumen]);

  const toggleSeleccion = id => setSeleccionados(actual => actual.includes(id) ? actual.filter(x => x !== id) : [...actual, id]);
  const toggleTodos = () => setSeleccionados(actual =>
    detalleFiltrado.length && detalleFiltrado.every(c => actual.includes(c.id))
      ? actual.filter(id => !detalleFiltrado.some(c => c.id === id))
      : [...new Set([...actual, ...detalleFiltrado.map(c => c.id)])]
  );
  const limpiarFiltros = () => { setDesde(""); setHasta(""); setSoloSeleccionados(false); setSeleccionados([]); setTab("general"); };
  const hayFiltros = desde || hasta || soloSeleccionados || tab !== "general";
  const inputStyle = { padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 13, fontFamily: "inherit", background: "#fff" };

  const columnas = [
    ["Sel.", null], ["Cobrado", null], ["OC", "pedido.nroOrden"], ["Fecha pedido", "pedido.fecha"],
    ["Cliente", "pedido.cliente.nombre"], ["Vendedor", "vendedor.nombre"], ["Base Laurens", null],
    ["Porcentaje", null], ["Comisión", null], ["Fecha cobro", "fechaCobro"],
  ];

  return (
    <Layout titulo="Comisiones" acciones={
      <button onClick={() => window.confirm("¿Eliminar las comisiones cuyos pedidos ya fueron eliminados?") && limpiarHuerfanas()} disabled={limpiando}
        style={{ padding: "7px 14px", border: "1px solid var(--danger)", borderRadius: 6, background: "#fff", color: "var(--danger)", fontSize: 13, cursor: "pointer" }}>
        {limpiando ? "Limpiando…" : "Limpiar comisiones antiguas"}
      </button>
    }>
      {resumen.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
          {resumen.map(v => (
            <div key={v.vendedorId} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>🤝 {v.vendedor}</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "var(--primary)", marginBottom: 8 }}>{fmt(v.total)}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: "var(--success)" }}>✅ Cobrado:</span><strong style={{ color: "var(--success)" }}>{fmt(v.cobrado)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span style={{ color: "var(--danger)" }}>⏳ Pendiente:</span><strong style={{ color: "var(--danger)" }}>{fmt(v.pendiente)}</strong></div>
            </div>
          ))}
        </div>
      )}

      {resumen.length > 0 && (
        <div style={{ background: "var(--primary)", color: "#fff", borderRadius: 10, padding: "14px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>Total comisiones</strong>
          <strong style={{ fontSize: 22 }}>{fmt(resumen.reduce((s, v) => s + v.total, 0))}</strong>
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ fontSize: 12, color: "var(--muted)" }}>Desde <input type="date" style={inputStyle} value={desde} onChange={e => { setDesde(e.target.value); setSeleccionados([]); }} /></label>
        <label style={{ fontSize: 12, color: "var(--muted)" }}>Hasta <input type="date" style={inputStyle} value={hasta} onChange={e => { setHasta(e.target.value); setSeleccionados([]); }} /></label>
        {seleccionados.length > 0 && <label style={{ fontSize: 13 }}><input type="checkbox" checked={soloSeleccionados} onChange={e => setSoloSeleccionados(e.target.checked)} /> Ver solo seleccionados ({seleccionados.length})</label>}
        {hayFiltros && <button onClick={limpiarFiltros} style={inputStyle}>Limpiar filtros</button>}
        <label style={{ fontSize: 13 }}><input type="checkbox" checked={soloConStock} onChange={e => setSoloConStock(e.target.checked)} /> Solo pedidos con productos de stock</label>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>{detalleFiltrado.length} comisiones</span>
      </div>

      <div style={{ display: "flex", borderBottom: "2px solid var(--border)", overflowX: "auto" }}>
        {[{ id: "general", nombre: "General" }, ...vendedores].map(v => {
          const id = String(v.id);
          return <button key={id} onClick={() => setTab(id)} style={{ padding: "8px 18px", border: "none", borderBottom: tab === id ? "2px solid var(--primary)" : "2px solid transparent", background: "transparent", color: tab === id ? "var(--primary)" : "var(--muted)", fontWeight: tab === id ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap", marginBottom: -2 }}>{v.nombre}</button>;
        })}
      </div>

      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "0 0 10px 10px", overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 1050, borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{columnas.map(([label, campo]) => (
            <th key={label} onClick={campo ? () => toggleOrden(campo) : undefined} style={{ textAlign: "left", padding: "8px 14px", fontSize: 11, color: orden.campo === campo ? "var(--primary)" : "var(--muted)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", cursor: campo ? "pointer" : "default", whiteSpace: "nowrap" }}>
              {label === "Sel." ? <input type="checkbox" checked={detalleFiltrado.length > 0 && detalleFiltrado.every(c => seleccionados.includes(c.id))} onChange={toggleTodos} /> : <>{label}{campo ? ` ${orden.campo === campo ? (orden.dir === "asc" ? "↑" : "↓") : "↕"}` : ""}</>}
            </th>
          ))}</tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={columnas.length} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Cargando…</td></tr>}
            {!isLoading && !detalleFiltrado.length && <tr><td colSpan={columnas.length} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Sin comisiones para los filtros seleccionados</td></tr>}
            {comisionesOrdenadas.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid var(--border)", background: c.cobrado ? "#f0fdf4" : seleccionados.includes(c.id) ? "#eff6ff" : "#fff" }}>
                <td style={{ padding: "9px 14px" }}><input type="checkbox" checked={seleccionados.includes(c.id)} onChange={() => toggleSeleccion(c.id)} /></td>
                <td style={{ padding: "9px 14px" }}><input type="checkbox" checked={c.cobrado} onChange={() => toggleCobrado({ id: c.id, cobrado: !c.cobrado })} /></td>
                <td style={{ padding: "9px 14px", fontWeight: 500 }}>#{c.pedido.nroOrden}</td>
                <td style={{ padding: "9px 14px", color: "var(--muted)" }}>{fmtFecha(c.pedido.fecha)}</td>
                <td style={{ padding: "9px 14px" }}>{c.pedido.cliente.nombre}</td>
                <td style={{ padding: "9px 14px" }}>{c.vendedor.nombre}</td>
                <td style={{ padding: "9px 14px" }}>{fmt(c.importe)}</td>
                <td style={{ padding: "9px 14px" }}>{Number(c.porcentaje).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%</td>
                <td style={{ padding: "9px 14px", fontWeight: 600, color: "var(--primary)" }}>{fmt(c.monto)}</td>
                <td style={{ padding: "9px 14px", color: "var(--muted)" }}>{fmtFecha(c.fechaCobro)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
