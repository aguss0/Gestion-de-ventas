import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Layout } from "../../components/Layout";
import { pagoService, pedidoService } from "../../services/pedidoService";

function fmt(n) { return "$" + Number(n || 0).toLocaleString("es-AR"); }
function fmtFecha(f) { if (!f) return "—"; return new Date(f).toLocaleDateString("es-AR"); }

export function Pagos() {
  const queryClient = useQueryClient();
  const [pedidoId, setPedidoId]   = useState("");
  const [monto, setMonto]         = useState("");
  const [metodo, setMetodo]       = useState("Efectivo");
  const [fecha, setFecha]         = useState(new Date().toISOString().split("T")[0]);
  const [obs, setObs]             = useState("");

  const { data: pedidos = [] } = useQuery({ queryKey: ["pedidos"], queryFn: pedidoService.listar });
  const { data: pagos   = [] } = useQuery({ queryKey: ["pagos"],   queryFn: () => pagoService.listar() });

  const pedido = pedidos.find(p => p.id === Number(pedidoId));

  const { mutate: registrar, isLoading } = useMutation({
    mutationFn: () => pagoService.registrar({
      pedidoId: Number(pedidoId),
      clienteId: pedido?.clienteId,
      monto: Number(monto),
      metodo, fecha, observaciones: obs || undefined,
    }),
    onSuccess: () => {
      toast.success("Pago registrado");
      queryClient.invalidateQueries(["pagos"]);
      queryClient.invalidateQueries(["pedidos"]);
      queryClient.invalidateQueries(["estadocuenta"]);
      setPedidoId(""); setMonto(""); setObs("");
    },
    onError: (err) => toast.error(err.response?.data?.error || "Error al registrar"),
  });

  const { mutate: eliminar } = useMutation({
    mutationFn: (id) => pagoService.eliminar(id),
    onSuccess: () => {
      toast.success("Pago eliminado");
      queryClient.invalidateQueries(["pagos"]);
      queryClient.invalidateQueries(["pedidos"]);
    },
  });

  const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 13, fontFamily: "inherit" };
  const labelStyle = { display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 };

  return (
    <Layout titulo="Pagos">
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>

        {/* Formulario */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: 16, alignSelf: "start" }}>
          <div style={{ fontWeight: 500, marginBottom: 14 }}>Registrar pago</div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Pedido *</label>
            <select style={inputStyle} value={pedidoId} onChange={e => { setPedidoId(e.target.value); setMonto(""); }}>
              <option value="">— Seleccionar pedido —</option>
              {pedidos.filter(p => p.activo && p.saldo > 0).map(p => (
                <option key={p.id} value={p.id}>#{p.nroOrden} — {p.cliente?.nombre} (saldo: ${p.saldo.toLocaleString("es-AR")})</option>
              ))}
            </select>
          </div>

          {pedido && (
            <div style={{ background: "var(--bg)", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Total pedido:</span><strong>{fmt(pedido.total)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Pagado:</span><span style={{ color: "var(--success)" }}>{fmt(pedido.totalPagado)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Saldo:</span><strong style={{ color: "var(--danger)" }}>{fmt(pedido.saldo)}</strong></div>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Monto *</label>
            <input type="number" min="0" style={inputStyle} value={monto} onChange={e => setMonto(e.target.value)} placeholder="0" />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Método *</label>
            <select style={inputStyle} value={metodo} onChange={e => setMetodo(e.target.value)}>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Echeq">Echeq</option>
            </select>
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
            onClick={() => { if (!pedidoId || !monto) return toast.error("Completá los campos requeridos"); registrar(); }}
            disabled={isLoading}
            style={{ width: "100%", background: "var(--primary)", color: "#fff", border: "none", borderRadius: 6, padding: "9px", fontSize: 13, cursor: "pointer" }}
          >
            {isLoading ? "Registrando…" : "Registrar pago"}
          </button>
        </div>

        {/* Historial */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>Historial de pagos</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Fecha", "Pedido", "Cliente", "Método", "Monto", ""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "1px solid var(--border)", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>Sin pagos registrados</td></tr>}
              {pagos.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                >
                  <td style={{ padding: "9px 14px", color: "var(--muted)" }}>{fmtFecha(p.fecha)}</td>
                  <td style={{ padding: "9px 14px" }}>#{p.pedido?.nroOrden}</td>
                  <td style={{ padding: "9px 14px" }}>{p.pedido?.cliente?.nombre}</td>
                  <td style={{ padding: "9px 14px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, fontWeight: 500,
                      background: p.metodo === "Efectivo" ? "#f0fdf4" : p.metodo === "Echeq" ? "#eff6ff" : "#fdf4ff",
                      color: p.metodo === "Efectivo" ? "var(--success)" : p.metodo === "Echeq" ? "var(--primary)" : "#7c3aed",
                    }}>{p.metodo}</span>
                  </td>
                  <td style={{ padding: "9px 14px", fontWeight: 500 }}>{fmt(p.monto)}</td>
                  <td style={{ padding: "9px 14px" }}>
                    <button onClick={() => { if (window.confirm("¿Eliminar este pago?")) eliminar(p.id); }}
                      style={{ padding: "3px 8px", border: "1px solid var(--danger)", borderRadius: 4, background: "#fff", fontSize: 11, cursor: "pointer", color: "var(--danger)" }}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}