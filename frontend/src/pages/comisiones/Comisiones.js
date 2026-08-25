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
  const [tab, setTab]                                 = useState("General");
  const [desde, setDesde]                             = useState("");
  const [hasta, setHasta]                             = useState("");
  const [soloSeleccionados, setSoloSeleccionados]     = useState(false);
  const [seleccionados, setSeleccionados]             = useState([]);

  const { data: detalle = [], isLoading } = useQuery({
    queryKey: ["comisiones", desde, hasta],
    queryFn:  () => comisionService.listar({ desde, hasta }),
  });

  const { mutate: toggleCobrado } = useMutation({
    mutationFn: ({ id, cobrado }) =>
      api.patch(`/comisiones/${id}/cobrado`, { cobrado }).then(r => r.data),
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries(["comisiones"]);
    },
    onError: () => toast.error("Error al actualizar"),
  });

  // Filtrar por tab y seleccionados
  const detalleFiltrado = useMemo(() => {
    return detalle.filter(c => {
      if (soloSeleccionados && seleccionados.length > 0) {
        if (!seleccionados.includes(c.id)) return false;
      }
      if (tab === "Miguel"  && c.comisionMiguel  <= 0) return false;
      if (tab === "Gerardo" && c.comisionGerardo <= 0) return false;
      if (tab === "Turko"   && c.comisionTurko   <= 0) return false;
      return true;
    });
  }, [detalle, soloSeleccionados, seleccionados, tab]);

  // Calcular resumen desde los datos filtrados (o seleccionados)
  const baseParaResumen = useMemo(() => {
    if (soloSeleccionados && seleccionados.length > 0) {
      return detalle.filter(c => seleccionados.includes(c.id));
    }
    return detalle;
  }, [detalle, soloSeleccionados, seleccionados]);

  const resumen = useMemo(() => {
  const map = {
    Miguel:  { vendedor: "Miguel",  total: 0, cobrado: 0, pendiente: 0 },
    Gerardo: { vendedor: "Gerardo", total: 0, cobrado: 0, pendiente: 0 },
    Turko:   { vendedor: "Turko",   total: 0, cobrado: 0, pendiente: 0 },
  };

  for (const c of baseParaResumen) {
    if (c.comisionMiguel > 0) {
      map.Miguel.total += c.comisionMiguel;
      if (c.cobrado) map.Miguel.cobrado   += c.comisionMiguel;
      else           map.Miguel.pendiente += c.comisionMiguel;
    }
    if (c.comisionGerardo > 0) {
      map.Gerardo.total += c.comisionGerardo;
      if (c.cobrado) map.Gerardo.cobrado   += c.comisionGerardo;
      else           map.Gerardo.pendiente += c.comisionGerardo;
    }
    if (c.comisionTurko > 0) {
      map.Turko.total += c.comisionTurko;
      if (c.cobrado) map.Turko.cobrado   += c.comisionTurko;
      else           map.Turko.pendiente += c.comisionTurko;
    }
  }

  return Object.values(map).filter(v => v.total > 0);
}, [baseParaResumen]);

  const toggleSeleccion = (id) => {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (seleccionados.length === detalleFiltrado.length) setSeleccionados([]);
    else setSeleccionados(detalleFiltrado.map(c => c.id));
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

  const columnas = tab === "General"
    ? ["Sel.", "Cobrado", "OC", "Cliente", "Vendedor", "Importe", "Com. Miguel", "Com. Gerardo", "Com. Turko", "Fecha cobro"]
    : tab === "Miguel"
    ? ["Sel.", "Cobrado", "OC", "Cliente", "Importe", "Com. Miguel", "Fecha cobro"]
    : tab === "Gerardo"
    ? ["Sel.", "Cobrado", "OC", "Cliente", "Importe", "Com. Gerardo", "Fecha cobro"]
    : ["Sel.", "Cobrado", "OC", "Cliente", "Importe", "Com. Turko", "Fecha cobro"];

  return (
    <Layout titulo="Comisiones">

      {/* Cards resumen — se actualizan con filtros y selección */}
      {resumen.length > 0 && (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
        {resumen.map(v => (
          <div key={v.vendedor} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>🤝 {v.vendedor}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "var(--primary)", marginBottom: 8 }}>
              {fmt(v.total)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: "var(--success)" }}>✅ Cobrado:</span>
              <span style={{ fontWeight: 500, color: "var(--success)" }}>{fmt(v.cobrado)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--danger)" }}>⏳ Pendiente:</span>
              <span style={{ fontWeight: 500, color: "var(--danger)" }}>{fmt(v.pendiente)}</span>
            </div>
          </div>
        ))}
      </div>
    )}

      {/* Filtros */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Desde</label>
          <input type="date" style={inputStyle} value={desde} onChange={e => { setDesde(e.target.value); setSeleccionados([]); }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>Hasta</label>
          <input type="date" style={inputStyle} value={hasta} onChange={e => { setHasta(e.target.value); setSeleccionados([]); }} />
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

      {/* Indicadores */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{ background: "#fef9c3", border: "1px solid #d97706", borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>
          ⏳ <strong>{detalleFiltrado.filter(c => !c.cobrado).length}</strong> pendiente{detalleFiltrado.filter(c => !c.cobrado).length !== 1 ? "s" : ""}
        </div>
        <div style={{ background: "#f0fdf4", border: "1px solid #16a34a", borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>
          ✅ <strong>{detalleFiltrado.filter(c => c.cobrado).length}</strong> cobrada{detalleFiltrado.filter(c => c.cobrado).length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: 0 }}>
        {TABS.map(t => (
          <div key={t} onClick={() => setTab(t)} style={{
            padding: "8px 18px", fontSize: 13, cursor: "pointer",
            color: tab === t ? "var(--primary)" : "var(--muted)",
            borderBottom: tab === t ? "2px solid var(--primary)" : "2px solid transparent",
            marginBottom: -2, fontWeight: tab === t ? 500 : 400,
            transition: "all .15s",
          }}>
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
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
                onMouseLeave={e => e.currentTarget.style.background = c.cobrado ? "#f0fdf4" : seleccionados.includes(c.id) ? "#eff6ff" : "#fff"}
              >
                <td style={{ padding: "9px 14px" }}>
                  <input type="checkbox" checked={seleccionados.includes(c.id)} onChange={() => toggleSeleccion(c.id)} style={{ cursor: "pointer" }} />
                </td>
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