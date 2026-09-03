import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Layout } from "../../components/Layout";
import api from "../../services/api";

function fmt(n) { return "$" + Number(n || 0).toLocaleString("es-AR"); }
function fmtFecha(f) {
  if (!f) return "—";
  const d = new Date(f);
  return `${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}/${d.getUTCFullYear()}`;
}

const compraService = {
  listar:    () => api.get("/comprasstock").then(r => r.data),
  registrar: (d) => api.post("/comprasstock", d).then(r => r.data),
  eliminar:  (id) => api.delete(`/comprasstock/${id}`).then(r => r.data),
};

export function ComprasStock({ embedded = false }) {
  const Contenedor = embedded ? ContenidoCompras : Layout;
  const queryClient = useQueryClient();
  const [articuloId, setArticuloId]     = useState("");
  const [cantidad, setCantidad]         = useState("");
  const [precio, setPrecio]             = useState("");
  const [proveedor, setProveedor]       = useState("");
  const [fecha, setFecha]               = useState(new Date().toISOString().split("T")[0]);
  const [obs, setObs]                   = useState("");

  const { data: articulos = [] } = useQuery({
    queryKey: ["articulos"],
    queryFn:  () => api.get("/articulos").then(r => r.data),
  });

  const { data: compras = [] } = useQuery({
    queryKey: ["comprasstock"],
    queryFn:  compraService.listar,
  });

  const articulosConStock = articulos.filter(a => a.activo && a.manejaStock && a.descartableId == null && a.dieteticaId == null);
  const articulo = articulosConStock.find(a => a.id === Number(articuloId));
  const total = cantidad && precio ? Number(cantidad) * Number(precio) : 0;

  const { mutate: registrar, isPending } = useMutation({
    mutationFn: () => compraService.registrar({
      articuloId: Number(articuloId),
      cantidad:   Number(cantidad),
      precioUnitario: Number(precio),
      proveedor:  proveedor || undefined,
      fecha,
      observaciones: obs || undefined,
    }),
    onSuccess: (data) => {
      toast.success(`Compra registrada — Stock nuevo: ${data.stockNuevo}`);
      queryClient.invalidateQueries({ queryKey: ["comprasstock"] });
      queryClient.invalidateQueries({ queryKey: ["rentabilidad"] });
      queryClient.invalidateQueries({ queryKey: ["articulos"] });
      setArticuloId(""); setCantidad(""); setPrecio("");
      setProveedor(""); setObs("");
    },
    onError: (err) => toast.error(err.response?.data?.error || "Error al registrar"),
  });

  const { mutate: eliminar } = useMutation({
    mutationFn: (id) => compraService.eliminar(id),
    onSuccess: () => {
      toast.success("Compra eliminada y stock revertido");
      queryClient.invalidateQueries({ queryKey: ["comprasstock"] });
      queryClient.invalidateQueries({ queryKey: ["rentabilidad"] });
      queryClient.invalidateQueries({ queryKey: ["articulos"] });
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const inputStyle = {
    width: "100%", padding: "8px 10px",
    border: "1px solid var(--border)", borderRadius: "var(--radius)",
    fontSize: 13, fontFamily: "inherit", background: "#fff",
  };
  const labelStyle = { display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 };

  return (
    <Contenedor titulo="Compras de stock">
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>

        {/* Formulario */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: 16, alignSelf: "start" }}>
          <div style={{ fontWeight: 500, marginBottom: 14 }}>Registrar compra</div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Artículo *</label>
            <select style={inputStyle} value={articuloId} onChange={e => { setArticuloId(e.target.value); setPrecio(""); }}>
              <option value="">— Seleccionar artículo —</option>
              {articulosConStock.map(a => (
                <option key={a.id} value={a.id}>
                  {a.nombre} (stock: {a.stock} {a.unidadMedida || ""})
                </option>
              ))}
            </select>
          </div>

          {/* Info del artículo */}
          {articulo && (
            <div style={{ background: "var(--bg)", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "var(--muted)" }}>Stock actual:</span>
                <strong style={{ color: articulo.stock <= articulo.stockMinimo ? "var(--danger)" : "var(--success)" }}>
                  {articulo.stock} {articulo.unidadMedida || "u"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Stock mínimo:</span>
                <span>{articulo.stockMinimo} {articulo.unidadMedida || "u"}</span>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Cantidad *</label>
              <input type="number" min="1" style={inputStyle} value={cantidad} onChange={e => setCantidad(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>Precio unitario *</label>
              <input type="number" min="0" style={inputStyle} value={precio} onChange={e => setPrecio(e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Total */}
          {total > 0 && (
            <div style={{ background: "var(--bg)", borderRadius: 6, padding: "8px 12px", marginBottom: 12, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}>Total compra:</span>
              <strong>{fmt(total)}</strong>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Proveedor</label>
            <input style={inputStyle} value={proveedor} onChange={e => setProveedor(e.target.value)} placeholder="Opcional…" />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Fecha</label>
            <input type="date" style={inputStyle} value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Observaciones</label>
            <input style={inputStyle} value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional…" />
          </div>

          <button
            onClick={() => {
              if (!articuloId) return toast.error("Seleccioná un artículo");
              if (!cantidad || Number(cantidad) < 1) return toast.error("Ingresá una cantidad válida");
              if (!precio || Number(precio) <= 0) return toast.error("Ingresá un precio válido");
              registrar();
            }}
            disabled={isPending}
            style={{ width: "100%", background: "var(--primary)", color: "#fff", border: "none", borderRadius: 6, padding: "9px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            {isPending ? "Registrando…" : "✓ Registrar compra"}
          </button>
        </div>

        {/* Historial */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>
            Historial de compras
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Fecha", "Artículo", "Cantidad", "Precio unit.", "Total", "Proveedor", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "1px solid var(--border)", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compras.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Sin compras registradas</td></tr>
              )}
              {compras.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                >
                  <td style={{ padding: "9px 14px", color: "var(--muted)" }}>{fmtFecha(c.fecha)}</td>
                  <td style={{ padding: "9px 14px", fontWeight: 500 }}>{c.articulo?.nombre}</td>
                  <td style={{ padding: "9px 14px" }}>{c.cantidad} {c.articulo?.unidadMedida || "u"}</td>
                  <td style={{ padding: "9px 14px" }}>{fmt(c.precioUnitario)}</td>
                  <td style={{ padding: "9px 14px", fontWeight: 500 }}>{fmt(c.total)}</td>
                  <td style={{ padding: "9px 14px", color: "var(--muted)" }}>{c.proveedor || "—"}</td>
                  <td style={{ padding: "9px 14px" }}>
                    <button
                      onClick={() => { if (window.confirm("¿Eliminar esta compra? El stock se revertirá.")) eliminar(c.id); }}
                      style={{ padding: "3px 8px", border: "1px solid var(--danger)", borderRadius: 4, background: "#fff", fontSize: 11, cursor: "pointer", color: "var(--danger)" }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Contenedor>
  );
}
function ContenidoCompras({ children }) { return <>{children}</>; }
