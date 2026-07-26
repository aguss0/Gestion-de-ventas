import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Layout } from "../../components/Layout";
import { pedidoService } from "../../services/pedidoService";

function fmt(n) {
  return "$" + Number(n || 0).toLocaleString("es-AR");
}

function fmtFecha(f) {
  if (!f) return "—";
  return new Date(f).toLocaleDateString("es-AR");
}

export function Pedidos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["pedidos"],
    queryFn:  pedidoService.listar,
  });

  const { mutate: eliminar } = useMutation({
    mutationFn: (id) => pedidoService.eliminar(id),
    onSuccess: () => {
      toast.success("Pedido eliminado");
      queryClient.invalidateQueries(["pedidos"]);
    },
  });

  const btnStyle = (color) => ({
    padding: "4px 10px", border: `1px solid ${color}`,
    borderRadius: 5, background: "#fff",
    fontSize: 12, cursor: "pointer", color,
  });

  return (
    <Layout
      titulo="Pedidos"
      acciones={
        <button
          onClick={() => navigate("/pedidos/nuevo")}
          style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 13, cursor: "pointer" }}
        >
          + Nuevo pedido
        </button>
      }
    >
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["N° Orden", "Fecha", "Cliente", "Vendedor", "Total", "Pagado", "Saldo", "Acciones"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "2px solid var(--border)", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>Cargando…</td></tr>}
            {!isLoading && pedidos.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No hay pedidos todavía</td></tr>}
            {pedidos.filter(p => p.activo).map(p => (
              <tr key={p.id}
                style={{ borderBottom: "1px solid var(--border)" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                <td style={{ padding: "10px 14px", fontWeight: 500 }}>#{p.nroOrden}</td>
                <td style={{ padding: "10px 14px", color: "var(--muted)" }}>{fmtFecha(p.fecha)}</td>
                <td style={{ padding: "10px 14px" }}>{p.cliente?.nombre}</td>
                <td style={{ padding: "10px 14px", color: "var(--muted)" }}>{p.vendedor?.nombre || "—"}</td>
                <td style={{ padding: "10px 14px", fontWeight: 500 }}>{fmt(p.total)}</td>
                <td style={{ padding: "10px 14px", color: "var(--success)" }}>{fmt(p.totalPagado)}</td>
                <td style={{ padding: "10px 14px", fontWeight: 500, color: p.saldo > 0 ? "var(--danger)" : "var(--success)" }}>
                  {fmt(p.saldo)}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={btnStyle("#2563eb")} onClick={() => navigate(`/pedidos/${p.id}`)}>Ver</button>
                    <button style={btnStyle("#dc2626")} onClick={() => { if (window.confirm("¿Eliminar pedido?")) eliminar(p.id); }}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}