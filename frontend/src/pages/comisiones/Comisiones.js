import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Layout } from "../../components/Layout";
import { comisionService } from "../../services/pedidoService";
import api from "../../services/api";

function fmt(n) { return "$" + Number(n || 0).toLocaleString("es-AR"); }
function fmtFecha(f) { if (!f) return "—"; return new Date(f).toLocaleDateString("es-AR"); }

const TABS = ["General", "Miguel", "Gerardo", "Turko"];

export function Comisiones() {
  const queryClient = useQueryClient();
  const [tab, setTab]           = useState("General");
  const [desde, setDesde]       = useState("");
  const [hasta, setHasta]       = useState("");
  const [soloSeleccionados, setSoloSeleccionados] = useState(false);
  const [seleccionados, setSeleccionados]         = useState([]);

  const { data: detalle = [], isLoading } = useQuery({
    queryKey: ["comisiones"],
    queryFn:  comisionService.listar,
  });

  const { data: resumen = [] } = useQuery({
    queryKey: ["comisiones-resumen"],
    queryFn:  comisionService.resumen,
  });

  const { mutate: toggleCobrado } = useMutation({
    mutationFn: ({ id, cobrado }) =>
      api.patch(`/comisiones/${id}/cobrado`, { cobrado }).then(r => r.data),
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries(["comisiones"]);
      queryClient.invalidateQueries(["comisiones-resumen"]);
    },
    onError: () => toast.error("Error al actualizar"),
  });

  // Filtrar detalle
  const detalleFiltrado = useMemo(() => {
    return detalle.filter(c => {
      if (desde) {
        const fecha = new Date(c.creadoEn);
        if (fecha < new Date(desde)) return false;
      }
      if (hasta) {
        const fecha = new Date(c.creadoEn);
        if (fecha > new Date(hasta + "T23:59:59")) return false;
      }
      if (soloSeleccionados && seleccionados.length > 0) {
        if (!seleccionados.includes(c.id)) return false;
      }
      // Filtro por tab
      if (tab === "Miguel"  && c.comisionMiguel  <= 0) return false;
      if (tab === "Gerardo" && c.comisionGerardo <= 0) return false;
      if (tab === "Turko"   && c.comisionTurko   <= 0) return false;
      return true;
    });
  }, [detalle, desde, hasta, soloSeleccionados, seleccionados, tab]);

  // Totales del filtrado
  const totalesFiltrado = useMemo(() => ({
    miguel:  detalleFiltrado.reduce((s, c) => s + c.comisionMiguel,  0),
    gerardo: detalleFiltrado.reduce((s, c) => s + c.comisionGerardo, 0),
    turko:   detalleFiltrado.reduce((s, c) => s + c.comisionTurko,   0),
    plus:    detalleFiltrado.reduce((s, c) => s + c.plusTurko,       0),
    cobrado: detalleFiltrado.filter(c => c.cobrado).reduce((s, c) => s + c.comisionMiguel + c.comisionGerardo + c.comisionTurko, 0),
    pendiente: detalleFiltrado.filter(c => !c.cobrado).reduce((s, c) => s + c.comisionMiguel + c.comisionGerardo + c.comisionTurko, 0),
  }), [detalleFiltrado]);

  const toggleSeleccion = (id) => {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (seleccionados.length === detalleFiltrado.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(detalleFiltrado.map(c => c.id));
    }
  };

  const limpiarFiltros = () => {
    setDesde(""); setHasta("");
    setSoloSeleccionados(false);
    setSeleccionados([]);
  };

  const hayFiltros = desde || hasta || soloSeleccionados;

  const inputStyle = {
    padding: "8px 10px", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", fontSize: 13,
    fontFamily: "inherit", background: "#fff",
  };

  // Columnas según tab
  const columnas = tab === "General"
    ? ["Sel.", "Cobrado", "OC", "Cliente", "Vendedor", "Importe", "Com. Miguel", "Com. Gerardo", "Com. Turko", "Plus Turko", "Método", "Fecha cobro"]
    : tab === "Miguel"
    ? ["Sel.", "Cobrado", "OC", "Cliente", "Importe", "Com. Miguel", "Método", "Fecha cobro"]
    : tab === "Gerardo"
    ? ["Sel.", "Cobrado", "OC", "Cliente", "Importe", "Com. Gerardo", "Método", "Fecha cobro"]
    : ["Sel.", "Cobrado", "OC", "Cliente", "Importe", "Com. Turko", "Plus Turko", "Método", "Fecha cobro"];

  return (
    <Layout titulo="Comisiones">

      {/* Resumen por vendedor */}
      {resumen.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 20 }}>
          {resumen.map(v => (
            <div key={v.vendedor} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>🤝 {v.vendedor}</div>
              {v.comisionMiguel  > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: "var(--muted)" }}>Miguel:</span><span>{fmt(v.comisionMiguel)}</span></div>}
              {v.comisionGerardo > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: "var(--muted)" }}>Gerardo:</span><span>{fmt(v.comisionGerardo)}</span></div>}
              {v.comisionTurko   > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: "var(--muted)" }}>Turko:</span><span>{fmt(v.comisionTurko)}</span></div>}
              {v.plusTurko       > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}><span style={{ color: "var(--muted)" }}>Plus Turko:</span><span style={{ color: "var(--success)" }}>{fmt(v.plusTurko)}</span></div>}
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "var(--success)" }}>✅ Cobrado:</span>
                  <span style={{ fontWeight: 500, color: "var(--success)" }}>{fmt(v.totalCobrado)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--danger)" }}>⏳ Pendiente:</span>
                  <span style={{ fontWeight: 500, color: "var(--danger)" }}>{fmt(v.totalPendiente)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Desde</label>
          <input type="date" style={inputStyle} value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Hasta</label>
          <input type="date" style={inputStyle} value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        {seleccionados.length > 0 && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={soloSeleccionados}
              onChange={e => setSoloSeleccionados(e.target.checked)}
            />
            Ver solo seleccionados ({seleccionados.length})
          </label>
        )}
        {hayFiltros && (
          <button onClick={limpiarFiltros} style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg)", fontSize: 12, cursor: "pointer", color: "var(--muted)" }}>
            Limpiar filtros
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted)" }}>
          {detalleFiltrado.length} comisión{detalleFiltrado.length !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Totales del filtrado */}
      {(desde || hasta || soloSeleccionados) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Com. Miguel",  value: totalesFiltrado.miguel,   color: "var(--text)" },
            { label: "Com. Gerardo", value: totalesFiltrado.gerardo,  color: "var(--text)" },
            { label: "Com. Turko",   value: totalesFiltrado.turko,    color: "var(--text)" },
            { label: "Plus Turko",   value: totalesFiltrado.plus,     color: "var(--success)" },
            { label: "✅ Cobrado",   value: totalesFiltrado.cobrado,  color: "var(--success)" },
            { label: "⏳ Pendiente", value: totalesFiltrado.pendiente,color: "var(--danger)" },
          ].filter(m => m.value > 0).map(m => (
            <div key={m.label} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: m.color }}>{fmt(m.value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Indicadores generales */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{ background: "#fef9c3", border: "1px solid #d97706", borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>
          ⏳ <strong>{detalle.filter(c => !c.cobrado).length}</strong> pendiente{detalle.filter(c => !c.cobrado).length !== 1 ? "s" : ""}
        </div>
        <div style={{ background: "#f0fdf4", border: "1px solid #16a34a", borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>
          ✅ <strong>{detalle.filter(c => c.cobrado).length}</strong> cobrada{detalle.filter(c => c.cobrado).length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: 0 }}>
        {TABS.map(t => (
          <div
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 18px", fontSize: 13, cursor: "pointer",
              color: tab === t ? "var(--primary)" : "var(--muted)",
              borderBottom: tab === t ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: -2, fontWeight: tab === t ? 500 : 400,
              transition: "all .15s",
            }}
          >
            {t}
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {columnas.map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "1px solid var(--border)", fontWeight: 500, textTransform: "uppercase" }}>
                  {h === "Sel." ? (
                    <input
                      type="checkbox"
                      checked={seleccionados.length === detalleFiltrado.length && detalleFiltrado.length > 0}
                      onChange={toggleTodos}
                      style={{ cursor: "pointer" }}
                    />
                  ) : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={columnas.length} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Cargando…</td></tr>}
            {!isLoading && detalleFiltrado.length === 0 && <tr><td colSpan={columnas.length} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Sin comisiones para los filtros seleccionados</td></tr>}
            {detalleFiltrado.map(c => (
              <tr key={c.id}
                style={{ borderBottom: "1px solid var(--border)", background: c.cobrado ? "#f0fdf4" : seleccionados.includes(c.id) ? "#eff6ff" : "#fff" }}
                onMouseEnter={e => e.currentTarget.style.background = c.cobrado ? "#dcfce7" : "var(--bg)"}
                onMouseLeave={e => e.currentTarget.style.background = c.cobrado ? "#f0fdf4" : seleccionados.includes(c.id) ? "#eff6ff" : "#fff"}
              >
                {/* Checkbox selección */}
                <td style={{ padding: "9px 14px" }}>
                  <input
                    type="checkbox"
                    checked={seleccionados.includes(c.id)}
                    onChange={() => toggleSeleccion(c.id)}
                    style={{ cursor: "pointer" }}
                  />
                </td>
                {/* Cobrado */}
                <td style={{ padding: "9px 14px" }}>
                  <input
                    type="checkbox"
                    checked={c.cobrado}
                    onChange={() => toggleCobrado({ id: c.id, cobrado: !c.cobrado })}
                    style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--success)" }}
                  />
                </td>
                <td style={{ padding: "9px 14px", fontWeight: 500 }}>#{c.pedido?.nroOrden}</td>
                <td style={{ padding: "9px 14px" }}>{c.pedido?.cliente?.nombre}</td>
                {tab === "General" && <td style={{ padding: "9px 14px" }}>{c.vendedor?.nombre}</td>}
                <td style={{ padding: "9px 14px", fontWeight: 500 }}>{fmt(c.importe)}</td>
                {(tab === "General" || tab === "Miguel")  && <td style={{ padding: "9px 14px" }}>{c.comisionMiguel  > 0 ? fmt(c.comisionMiguel)  : "—"}</td>}
                {(tab === "General" || tab === "Gerardo") && <td style={{ padding: "9px 14px" }}>{c.comisionGerardo > 0 ? fmt(c.comisionGerardo) : "—"}</td>}
                {(tab === "General" || tab === "Turko")   && <td style={{ padding: "9px 14px" }}>{c.comisionTurko   > 0 ? fmt(c.comisionTurko)   : "—"}</td>}
                {(tab === "General" || tab === "Turko")   && <td style={{ padding: "9px 14px", color: "var(--success)" }}>{c.plusTurko > 0 ? fmt(c.plusTurko) : "—"}</td>}
                <td style={{ padding: "9px 14px" }}>{c.metodo || "—"}</td>
                <td style={{ padding: "9px 14px", color: "var(--muted)", fontSize: 12 }}>
                  {c.fechaCobro ? new Date(c.fechaCobro).toLocaleDateString("es-AR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}