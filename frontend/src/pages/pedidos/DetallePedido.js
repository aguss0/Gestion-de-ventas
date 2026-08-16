import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Layout } from "../../components/Layout";
import { pedidoService } from "../../services/pedidoService";
import api from "../../services/api";

function fmt(n) { return "$" + Number(n || 0).toLocaleString("es-AR"); }
function fmtFecha(f) { if (!f) return "—"; return new Date(f).toLocaleDateString("es-AR"); }

export function DetallePedido() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const [faltanteModal, setFaltanteModal] = useState(null);
  const [cantFaltante, setCantFaltante]   = useState(0);

  const { data: pedido, isLoading } = useQuery({
    queryKey: ["pedido", id],
    queryFn:  () => pedidoService.obtener(id),
  });

  const { mutate: marcarFaltante, isLoading: guardandoFaltante } = useMutation({
    mutationFn: ({ detalleId, cantidadFaltante }) =>
      api.patch(`/pedidos/detalle/${detalleId}/faltante`, { cantidadFaltante }).then(r => r.data),
    onSuccess: () => {
      toast.success("Faltante registrado");
      queryClient.invalidateQueries(["pedido", id]);
      queryClient.invalidateQueries(["pedidos"]);
      setFaltanteModal(null);
    },
    onError: () => toast.error("Error al registrar faltante"),
  });

  const { mutate: eliminarItem } = useMutation({
    mutationFn: (detalleId) =>
      api.delete(`/pedidos/detalle/${detalleId}`).then(r => r.data),
    onSuccess: () => {
      toast.success("Artículo eliminado del pedido");
      queryClient.invalidateQueries(["pedido", id]);
      queryClient.invalidateQueries(["pedidos"]);
    },
    onError: () => toast.error("Error al eliminar artículo"),
  });

  if (isLoading) return <Layout titulo="Detalle de pedido"><div style={{ padding: 32, color: "var(--muted)" }}>Cargando…</div></Layout>;
  if (!pedido)   return <Layout titulo="Detalle de pedido"><div style={{ padding: 32, color: "var(--muted)" }}>Pedido no encontrado</div></Layout>;

  return (
    <Layout titulo={`Pedido #${pedido.nroOrden}`}>
      <div style={{ maxWidth: 760 }}>

        {/* Botón volver */}
        <button
          onClick={() => navigate("/pedidos")}
          style={{ marginBottom: 16, padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", fontSize: 13, cursor: "pointer" }}
        >
          ← Volver a pedidos
        </button>

        {/* Info general */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 500, marginBottom: 12 }}>Información del pedido</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontSize: 13 }}>
            <div><div style={{ color: "var(--muted)", marginBottom: 4 }}>Cliente</div><div style={{ fontWeight: 500 }}>{pedido.cliente?.nombre}</div></div>
            <div><div style={{ color: "var(--muted)", marginBottom: 4 }}>Vendedor</div><div>{pedido.vendedor?.nombre || "—"}</div></div>
            <div><div style={{ color: "var(--muted)", marginBottom: 4 }}>Fecha</div><div>{fmtFecha(pedido.fecha)}</div></div>
            <div><div style={{ color: "var(--muted)", marginBottom: 4 }}>Total</div><div style={{ fontWeight: 500 }}>{fmt(pedido.total)}</div></div>
            <div><div style={{ color: "var(--muted)", marginBottom: 4 }}>Pagado</div><div style={{ color: "var(--success)", fontWeight: 500 }}>{fmt(pedido.totalPagado)}</div></div>
            <div><div style={{ color: "var(--muted)", marginBottom: 4 }}>Saldo</div><div style={{ color: pedido.saldo > 0 ? "var(--danger)" : "var(--success)", fontWeight: 500 }}>{pedido.saldo > 0 ? fmt(pedido.saldo) : "✓ Saldado"}</div></div>
          </div>
          {pedido.observaciones && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "var(--bg)", borderRadius: 6, fontSize: 13, color: "var(--muted)" }}>
              📝 {pedido.observaciones}
            </div>
          )}
        </div>

        {/* Detalle de artículos */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 500, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Artículos</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {pedido.detalle?.filter(d => d.faltante).length > 0 && `⚠ ${pedido.detalle.filter(d => d.faltante).length} con faltante`}
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Artículo", "Unid. x caja", "Pedido", "Faltante", "Entregado", "Precio unit.", "Subtotal", "Acciones"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "1px solid var(--border)", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedido.detalle?.map(d => {
                const entregado = d.cantidad - (d.cantidadFaltante || 0);
                return (
                  <tr key={d.id} style={{ borderBottom: "1px solid var(--border)", background: d.faltante ? "#fef9c3" : "#fff" }}>
                    <td style={{ padding: "9px 14px", fontWeight: 500 }}>
                      {d.articulo?.nombre}
                      {d.faltante && <span style={{ marginLeft: 6, fontSize: 11, background: "#fef08a", color: "#854d0e", padding: "1px 6px", borderRadius: 4 }}>FALTANTE</span>}
                    </td>
                    <td style={{ padding: "9px 14px", color: "var(--muted)" }}>{d.articulo?.unidadCaja || "—"}</td>
                    <td style={{ padding: "9px 14px" }}>{d.cantidad}</td>
                    <td style={{ padding: "9px 14px", color: d.cantidadFaltante > 0 ? "var(--danger)" : "var(--muted)" }}>
                      {d.cantidadFaltante > 0 ? d.cantidadFaltante : "—"}
                    </td>
                    <td style={{ padding: "9px 14px", fontWeight: 500 }}>{entregado}</td>
                    <td style={{ padding: "9px 14px" }}>{fmt(d.precio)}</td>
                    <td style={{ padding: "9px 14px", fontWeight: 500 }}>{fmt(d.subtotal)}</td>
                    <td style={{ padding: "9px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => { setFaltanteModal(d); setCantFaltante(d.cantidadFaltante || 0); }}
                          style={{ padding: "3px 8px", border: "1px solid #d97706", borderRadius: 4, background: "#fef9c3", fontSize: 11, cursor: "pointer", color: "#854d0e" }}
                        >
                          ⚠ Faltante
                        </button>
                        <button
                          onClick={() => { if (window.confirm("¿Eliminar este artículo del pedido?")) eliminarItem(d.id); }}
                          style={{ padding: "3px 8px", border: "1px solid var(--danger)", borderRadius: 4, background: "#fff", fontSize: 11, cursor: "pointer", color: "var(--danger)" }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagos */}
        {pedido.pagos?.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>Pagos registrados</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Fecha", "Método", "Monto"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "1px solid var(--border)", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedido.pagos.map(p => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "9px 14px", color: "var(--muted)" }}>{fmtFecha(p.fecha)}</td>
                    <td style={{ padding: "9px 14px" }}>{p.metodo}</td>
                    <td style={{ padding: "9px 14px", fontWeight: 500 }}>{fmt(p.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal faltante */}
      {faltanteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={e => e.target === e.currentTarget && setFaltanteModal(null)}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 380 }}>
            <div style={{ fontWeight: 500, marginBottom: 16, fontSize: 15 }}>Registrar faltante</div>
            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <strong>{faltanteModal.articulo?.nombre}</strong>
              <div style={{ color: "var(--muted)", marginTop: 4 }}>Cantidad pedida: {faltanteModal.cantidad}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
                Cantidad faltante (0 = sin faltante)
              </label>
              <input
                type="number"
                min="0"
                max={faltanteModal.cantidad}
                value={cantFaltante}
                onChange={e => setCantFaltante(Number(e.target.value))}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, fontFamily: "inherit" }}
              />
              {cantFaltante > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
                  Entregado: <strong>{faltanteModal.cantidad - cantFaltante}</strong> u ·
                  Nuevo subtotal: <strong>{fmt(faltanteModal.precio * (faltanteModal.cantidad - cantFaltante))}</strong>
                  {" "}(descuento: <strong style={{ color: "var(--danger)" }}>{fmt(faltanteModal.precio * cantFaltante)}</strong>)
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setFaltanteModal(null)} style={{ padding: "8px 14px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
              <button
                onClick={() => marcarFaltante({ detalleId: faltanteModal.id, cantidadFaltante: cantFaltante })}
                disabled={guardandoFaltante}
                style={{ padding: "8px 14px", background: "#d97706", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer" }}
              >
                {guardandoFaltante ? "Guardando…" : "Confirmar faltante"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}