import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Layout } from "../../components/Layout";
import { importarService, importarPDFService } from "../../services/clienteService";
import api from "../../services/api";

function fmt(n) { return "$" + Number(n || 0).toLocaleString("es-AR"); }

const svc = {
  list:   () => api.get("/articulos").then(r => r.data),
  create: (d) => api.post("/articulos", d).then(r => r.data),
  update: (id, d) => api.patch(`/articulos/${id}`, d).then(r => r.data),
  delete: (id) => api.delete(`/articulos/${id}`).then(r => r.data),
};

// ── Modal nuevo/editar ───────────────────────────────────────
function ModalArticulo({ articulo, onClose, onGuardado }) {
  const esEdicion = !!articulo;
  const [form, setForm] = useState({
  codigo:       articulo?.codigo       || "",
  nombre:       articulo?.nombre       || "",
  descripcion:  articulo?.descripcion  || "",
  unidadCaja:   articulo?.unidadCaja   || "",
  unidadMedida: articulo?.unidadMedida || "",
  precio:       articulo?.precio       || "",
  manejaStock:  articulo?.manejaStock  || false,
  stock:        articulo?.stock        || 0,
  stockMinimo:  articulo?.stockMinimo  || 0,
});

  const set    = campo => e => setForm(f => ({ ...f, [campo]: e.target.value }));
  const setChk = campo => e => setForm(f => ({ ...f, [campo]: e.target.checked }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        precio:      Number(form.precio),
        stock:       Number(form.stock),
        stockMinimo: Number(form.stockMinimo),
      };
      if (esEdicion) {
        await svc.update(articulo.id, data);
        toast.success("Artículo actualizado");
      } else {
        await svc.create(data);
        toast.success("Artículo creado");
      }
      onGuardado();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error al guardar");
    }
  };

  const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 13, fontFamily: "inherit" };
  const labelStyle = { display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 };
  const row        = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{esEdicion ? "Editar artículo" : "Nuevo artículo"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={row}>
            <div><label style={labelStyle}>Código</label><input style={inputStyle} value={form.codigo} onChange={set("codigo")} placeholder="opcional" /></div>
            <div><label style={labelStyle}>Nombre *</label><input style={inputStyle} value={form.nombre} onChange={set("nombre")} required /></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Descripción</label>
            <input style={inputStyle} value={form.descripcion} onChange={set("descripcion")} placeholder="opcional" />
          </div>
          <div style={row}>
            <div><label style={labelStyle}>Unidad x caja</label><input style={inputStyle} value={form.unidadCaja} onChange={set("unidadCaja")} placeholder="ej: 10 UNID" /></div>
            <div>
              <label style={labelStyle}>Unidad de medida</label>
              <select style={inputStyle} value={form.unidadMedida} onChange={set("unidadMedida")}>
                <option value="">— Sin unidad —</option>
                <option value="unidades">Unidades</option>
                <option value="kg">Kilogramos (kg)</option>
                <option value="g">Gramos (g)</option>
                <option value="litros">Litros</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="metros">Metros</option>
                <option value="cm">Centímetros (cm)</option>
              </select>
            </div>
            <div><label style={labelStyle}>Precio *</label><input style={inputStyle} type="number" value={form.precio} onChange={set("precio")} required min="0" /></div>
          </div>

          {/* Stock */}
          <div style={{ background: "var(--bg)", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: form.manejaStock ? 12 : 0 }}>
              <input
                type="checkbox"
                checked={form.manejaStock}
                onChange={setChk("manejaStock")}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Manejar stock para este artículo</span>
            </label>
            {form.manejaStock && (
              <div style={row}>
                <div><label style={labelStyle}>Stock actual</label><input style={inputStyle} type="number" value={form.stock} onChange={set("stock")} min="0" /></div>
                <div><label style={labelStyle}>Stock mínimo</label><input style={inputStyle} type="number" value={form.stockMinimo} onChange={set("stockMinimo")} min="0" /></div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "#fff", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button type="submit" style={{ padding: "8px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: 13, cursor: "pointer" }}>Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Pantalla principal ───────────────────────────────────────
export function Articulos() {
  const fileExcelRef = useRef();
  const filePDFRef   = useRef();
  const queryClient  = useQueryClient();
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado]   = useState(null);
  const [modal, setModal]           = useState(false);
  const [editando, setEditando]     = useState(null);
  const [buscar, setBuscar]         = useState("");
  const [soloStock, setSoloStock]   = useState(false);

  const { data: articulos = [], isLoading } = useQuery({
    queryKey: ["articulos"],
    queryFn:  svc.list,
  });

  const { mutate: desactivar } = useMutation({
    mutationFn: (id) => svc.delete(id),
    onSuccess:  () => { toast.success("Artículo desactivado"); queryClient.invalidateQueries(["articulos"]); },
  });

  const handleImportarExcel = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    setImportando(true); setResultado(null);
    try {
      const res = await importarService.precios(archivo);
      if (res.error) toast.error(res.error);
      else { toast.success(res.mensaje); setResultado(res); queryClient.invalidateQueries(["articulos"]); }
    } catch { toast.error("Error al importar"); }
    finally { setImportando(false); fileExcelRef.current.value = ""; }
  };

  const handleImportarPDF = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    setImportando(true); setResultado(null);
    try {
      const res = await importarPDFService.precios(archivo);
      if (res.error) toast.error(res.error);
      else { toast.success(res.mensaje); setResultado(res); queryClient.invalidateQueries(["articulos"]); }
    } catch { toast.error("Error al importar PDF"); }
    finally { setImportando(false); filePDFRef.current.value = ""; }
  };

  const onGuardado = () => queryClient.invalidateQueries(["articulos"]);
  const abrirNuevo  = () => { setEditando(null); setModal(true); };
  const abrirEditar = (a) => { setEditando(a);   setModal(true); };
  const cerrar      = () => { setModal(false);   setEditando(null); };

  const articulosFiltrados = articulos.filter(a => {
    if (buscar && !a.nombre.toLowerCase().includes(buscar.toLowerCase()) && !a.codigo?.toLowerCase().includes(buscar.toLowerCase())) return false;
    if (soloStock && !a.manejaStock) return false;
    return true;
  });

  const stockBajoCount = articulos.filter(a => a.manejaStock && a.stock <= a.stockMinimo).length;

  const inputStyle = { padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 13, fontFamily: "inherit", background: "#fff" };

  return (
    <Layout titulo="Artículos">

      {/* Alerta stock bajo */}
      {stockBajoCount > 0 && (
        <div style={{ background: "#fef9c3", border: "1px solid var(--warn)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          ⚠ <strong>{stockBajoCount}</strong> artículo{stockBajoCount > 1 ? "s" : ""} con stock bajo o agotado
          <button onClick={() => setSoloStock(true)} style={{ marginLeft: 8, fontSize: 12, padding: "2px 8px", border: "1px solid var(--warn)", borderRadius: 4, background: "#fff", cursor: "pointer", color: "#854d0e" }}>
            Ver solo con stock
          </button>
        </div>
      )}

      {/* Botones importar */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <input ref={fileExcelRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleImportarExcel} />
        <input ref={filePDFRef}   type="file" accept=".pdf"       style={{ display: "none" }} onChange={handleImportarPDF} />
        <input style={{ ...inputStyle, minWidth: 200, flex: 1 }} placeholder="Buscar por nombre o código…" value={buscar} onChange={e => setBuscar(e.target.value)} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={soloStock} onChange={e => setSoloStock(e.target.checked)} />
          Solo con stock
        </label>
        <button onClick={() => fileExcelRef.current.click()} disabled={importando} style={{ padding: "7px 12px", border: "1px solid #16a34a", borderRadius: 6, background: "#f0fdf4", color: "#16a34a", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          📥 Excel
        </button>
        <button onClick={() => filePDFRef.current.click()} disabled={importando} style={{ padding: "7px 12px", border: "1px solid var(--danger)", borderRadius: 6, background: "#fef2f2", color: "var(--danger)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          📄 PDF
        </button>
        <button onClick={abrirNuevo} style={{ padding: "7px 14px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
          + Nuevo artículo
        </button>
      </div>

      {/* Resultado importación */}
      {resultado && (
        <div style={{ background: "#f0fdf4", border: "1px solid #16a34a", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
          <div style={{ fontWeight: 500, color: "#16a34a", marginBottom: 4 }}>✅ {resultado.mensaje}</div>
          {resultado.creados > 0 && <div style={{ color: "var(--primary)" }}>🆕 {resultado.creados} artículo(s) nuevo(s) creado(s)</div>}
          {resultado.noEncontrados?.length > 0 && <div style={{ color: "var(--muted)" }}>No encontrados: {resultado.noEncontrados.join(", ")}</div>}
        </div>
      )}

      {/* Tabla */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Código", "Nombre", "Unid. x caja", "Precio", "Stock", "Estado", "Acciones"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "2px solid var(--border)", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>Cargando…</td></tr>}
            {!isLoading && articulosFiltrados.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No se encontraron artículos</td></tr>}
            {articulosFiltrados.map(a => {
              const stockBajo = a.manejaStock && a.stock <= a.stockMinimo;
              return (
                <tr key={a.id}
                  style={{ borderBottom: "1px solid var(--border)", background: stockBajo ? "#fef9c3" : "#fff" }}
                  onMouseEnter={e => e.currentTarget.style.background = stockBajo ? "#fef08a" : "var(--bg)"}
                  onMouseLeave={e => e.currentTarget.style.background = stockBajo ? "#fef9c3" : "#fff"}
                >
                  <td style={{ padding: "10px 14px", color: "var(--muted)", fontSize: 12 }}>{a.codigo || "—"}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 500 }}>
                    {a.nombre}
                    {a.descripcion && <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>{a.descripcion}</div>}
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--muted)" }}>{a.unidadCaja || "—"}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 500 }}>{fmt(a.precio)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    {a.manejaStock ? (
                      <div>
                        <span style={{ fontWeight: 500, color: stockBajo ? "var(--danger)" : "var(--success)" }}>
                          {a.stock} u {stockBajo ? "⚠" : ""}
                        </span>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>mín. {a.stockMinimo}</div>
                        <div style={{ width: 60, height: 4, background: "#e5e7eb", borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
                          <div style={{ width: Math.min(100, Math.round(a.stock / Math.max(a.stockMinimo * 2, 1) * 100)) + "%", height: "100%", background: stockBajo ? "var(--danger)" : "var(--success)", borderRadius: 2 }} />
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>Sin stock</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, fontWeight: 500, background: a.activo ? "#e8f5eb" : "#f3f4f6", color: a.activo ? "#1a5229" : "var(--muted)" }}>
                      {a.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => abrirEditar(a)} style={{ padding: "4px 10px", border: "1px solid var(--border)", borderRadius: 5, background: "#fff", fontSize: 12, cursor: "pointer" }}>Editar</button>
                      {a.activo && (
                        <button onClick={() => { if (window.confirm("¿Desactivar este artículo?")) desactivar(a.id); }} style={{ padding: "4px 10px", border: "1px solid var(--danger)", borderRadius: 5, background: "#fff", fontSize: 12, cursor: "pointer", color: "var(--danger)" }}>Desactivar</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && <ModalArticulo articulo={editando} onClose={cerrar} onGuardado={onGuardado} />}
    </Layout>
  );
}