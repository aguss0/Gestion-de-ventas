import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Layout } from "../../components/Layout";
import { pedidoService } from "../../services/pedidoService";
import { useOrden } from "../../hooks/useOrden";

function fmt(n) { return "$" + Number(n || 0).toLocaleString("es-AR"); }

function fmtFecha(f) {
  if (!f) return "—";
  const d = new Date(f);
  return `${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}/${d.getUTCFullYear()}`;
}

function ThOrdenable({ label, campo, orden, onToggle }) {
  const activo = orden.campo === campo;
  return (
    <th
      onClick={() => onToggle(campo)}
      style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: activo ? "var(--primary)" : "var(--muted)", borderBottom: "2px solid var(--border)", fontWeight: 500, textTransform: "uppercase", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
    >
      {label} {activo ? (orden.dir === "asc" ? "↑" : "↓") : "↕"}
    </th>
  );
}

export function Pedidos() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["pedidos"],
    queryFn:  pedidoService.listar,
  });

 const activos = pedidos.filter(p => p.activo);
  const [soloStock, setSoloStock] = useState(false);

  const pedidosFiltrados = soloStock
    ? activos.filter(p => p.detalle?.some(d => d.articulo?.manejaStock))
    : activos;

  const { datosordenados, orden, toggleOrden } = useOrden(pedidosFiltrados, { campo: "nroOrden", dir: "desc" });

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
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={soloStock}
            onChange={e => setSoloStock(e.target.checked)}
          />
          Solo pedidos con productos de stock
        </label>
      </div>
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <ThOrdenable label="N° Orden" campo="nroOrden"       orden={orden} onToggle={toggleOrden} />
              <ThOrdenable label="Fecha"    campo="fecha"           orden={orden} onToggle={toggleOrden} />
              <ThOrdenable label="Cliente"  campo="cliente.nombre"  orden={orden} onToggle={toggleOrden} />
              <ThOrdenable label="Vendedor" campo="vendedor.nombre" orden={orden} onToggle={toggleOrden} />
              <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "2px solid var(--border)", fontWeight: 500, textTransform: "uppercase" }}>Total</th>
              <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "2px solid var(--border)", fontWeight: 500, textTransform: "uppercase" }}>Pagado</th>
              <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "2px solid var(--border)", fontWeight: 500, textTransform: "uppercase" }}>Saldo</th>
              <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "2px solid var(--border)", fontWeight: 500, textTransform: "uppercase" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>Cargando…</td></tr>}
            {!isLoading && datosordenados.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No hay pedidos todavía</td></tr>}
            {datosordenados.map(p => (
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