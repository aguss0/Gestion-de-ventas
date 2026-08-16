import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Layout } from "../../components/Layout";
import { clienteService } from "../../services/clienteService";
import { vendedorService } from "../../services/clienteService";
import api from "../../services/api";

function fmt(n)     { return "$" + Number(n || 0).toLocaleString("es-AR"); }
function fmtFecha(f){ if (!f) return "—"; return new Date(f).toLocaleDateString("es-AR"); }
function diasDesde(f){ if (!f) return null; return Math.round((new Date() - new Date(f)) / (1000 * 60 * 60 * 24)); }

// ── Modal crear/editar cliente ───────────────────────────────
function ModalCliente({ cliente, vendedores, onClose, onGuardado }) {
  const esEdicion = !!cliente;
  const [form, setForm] = useState({
    nombre:     cliente?.nombre     || "",
    cuit:       cliente?.cuit       || "",
    direccion:  cliente?.direccion  || "",
    barrio:     cliente?.barrio     || "",
    telefono:   cliente?.telefono   || "",
    email:      cliente?.email      || "",
    tipo:       cliente?.tipo       || "",
    vendedorId: cliente?.vendedorId || "",
  });

  const set = campo => e => setForm(f => ({ ...f, [campo]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, vendedorId: form.vendedorId ? Number(form.vendedorId) : null };
      if (esEdicion) {
        await clienteService.editar(cliente.id, data);
        toast.success("Cliente actualizado");
      } else {
        await clienteService.crear(data);
        toast.success("Cliente creado");
      }
      onGuardado();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error al guardar");
    }
  };

  const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 13, fontFamily: "inherit", marginBottom: 0 };
  const labelStyle = { display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 };
  const row        = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{esEdicion ? "Editar cliente" : "Nuevo cliente"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={row}>
            <div><label style={labelStyle}>Nombre *</label><input style={inputStyle} value={form.nombre} onChange={set("nombre")} required /></div>
            <div><label style={labelStyle}>CUIT</label><input style={inputStyle} value={form.cuit} onChange={set("cuit")} /></div>
          </div>
          <div style={row}>
            <div><label style={labelStyle}>Dirección</label><input style={inputStyle} value={form.direccion} onChange={set("direccion")} /></div>
            <div><label style={labelStyle}>Barrio</label><input style={inputStyle} value={form.barrio} onChange={set("barrio")} /></div>
          </div>
          <div style={row}>
            <div><label style={labelStyle}>Teléfono</label><input style={inputStyle} value={form.telefono} onChange={set("telefono")} /></div>
            <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={set("email")} /></div>
          </div>
          <div style={row}>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select style={inputStyle} value={form.tipo} onChange={set("tipo")}>
                <option value="">— Sin tipo —</option>
                <option value="Mayorista">Mayorista</option>
                <option value="Minorista">Minorista</option>
                <option value="Distribuidor">Distribuidor</option>
                <option value="Supermercado">Supermercado</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Vendedor</label>
              <select style={inputStyle} value={form.vendedorId} onChange={set("vendedorId")}>
                <option value="">— Sin vendedor —</option>
                {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "#fff", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
            <button type="submit" style={{ padding: "8px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: 13, cursor: "pointer" }}>Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Fila expandible de cliente ───────────────────────────────
function FilaCliente({ cliente, onEditar, onEliminar }) {
  const [expandido, setExpandido] = useState(false);

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["cliente-stats", cliente.id],
    queryFn:  () => api.get(`/clientes/${cliente.id}/estadisticas`).then(r => r.data),
    enabled:  expandido,
  });

  const dias = diasDesde(stats?.ultimaCompra);

  const colorUltimaCompra = dias === null ? "var(--muted)"
    : dias <= 30  ? "var(--success)"
    : dias <= 60  ? "var(--warn)"
    : "var(--danger)";

  return (
    <>
      {/* Fila principal */}
      <tr
        style={{ borderBottom: expandido ? "none" : "1px solid var(--border)", cursor: "pointer", background: expandido ? "#f8fafc" : "#fff" }}
        onClick={() => setExpandido(!expandido)}
        onMouseEnter={e => { if (!expandido) e.currentTarget.style.background = "var(--bg)"; }}
        onMouseLeave={e => { if (!expandido) e.currentTarget.style.background = "#fff"; }}
      >
        <td style={{ padding: "10px 14px", fontSize: 16 }}>{expandido ? "▾" : "▸"}</td>
        <td style={{ padding: "10px 14px" }}>
          <div style={{ fontWeight: 500 }}>{cliente.nombre}</div>
          {cliente.tipo && <div style={{ fontSize: 11, color: "var(--muted)" }}>{cliente.tipo}</div>}
        </td>
        <td style={{ padding: "10px 14px", color: "var(--muted)", fontSize: 12 }}>{cliente.cuit || "—"}</td>
        <td style={{ padding: "10px 14px", fontSize: 12 }}>
          {cliente.direccion && <div>{cliente.direccion}</div>}
          {cliente.barrio    && <div style={{ color: "var(--muted)" }}>{cliente.barrio}</div>}
          {!cliente.direccion && !cliente.barrio && "—"}
        </td>
        <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--muted)" }}>{cliente.telefono || "—"}</td>
        <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--muted)" }}>{cliente.email || "—"}</td>
        <td style={{ padding: "10px 14px" }}>
          {cliente.vendedor
            ? <span style={{ fontSize: 12, background: "#eff6ff", color: "var(--primary)", padding: "2px 8px", borderRadius: 12 }}>{cliente.vendedor.nombre}</span>
            : <span style={{ color: "var(--muted)", fontSize: 12 }}>—</span>}
        </td>
        <td style={{ padding: "10px 14px", fontSize: 12, color: colorUltimaCompra }}>
          {stats?.ultimaCompra ? fmtFecha(stats.ultimaCompra) : "—"}
        </td>
        <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 500 }}>
          {stats?.totalComprado ? fmt(stats.totalComprado) : "—"}
        </td>
        <td style={{ padding: "10px 14px" }}>
          <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, fontWeight: 500, background: cliente.activo ? "var(--green-light, #e8f5eb)" : "#f3f4f6", color: cliente.activo ? "#1a5229" : "var(--muted)" }}>
            {cliente.activo ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onEditar(cliente)} style={{ padding: "4px 10px", border: "1px solid var(--border)", borderRadius: 5, background: "#fff", fontSize: 12, cursor: "pointer" }}>Editar</button>
            {cliente.activo && (
              <button onClick={() => onEliminar(cliente.id)} style={{ padding: "4px 10px", border: "1px solid var(--danger)", borderRadius: 5, background: "#fff", fontSize: 12, cursor: "pointer", color: "var(--danger)" }}>Desactivar</button>
            )}
          </div>
        </td>
      </tr>

      {/* Panel expandido */}
      {expandido && (
        <tr style={{ borderBottom: "1px solid var(--border)" }}>
          <td colSpan={11} style={{ padding: "0 14px 16px 14px", background: "#f8fafc" }}>
            {loadingStats ? (
              <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>Cargando estadísticas…</div>
            ) : !stats || stats.totalPedidos === 0 ? (
              <div style={{ padding: 16, color: "var(--muted)", fontSize: 13 }}>Sin compras registradas</div>
            ) : (
              <div style={{ padding: "12px 0" }}>

                {/* Métricas rápidas */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
                  {[
                    { label: "Total pedidos",     value: stats.totalPedidos,                        color: "var(--text)"    },
                    { label: "Total comprado",     value: fmt(stats.totalComprado),                  color: "var(--primary)" },
                    { label: "Ticket promedio",    value: fmt(stats.ticketPromedio),                 color: "var(--text)"    },
                    { label: "Primera compra",     value: fmtFecha(stats.primeraCompra),             color: "var(--muted)"   },
                    { label: "Última compra",      value: fmtFecha(stats.ultimaCompra),              color: colorUltimaCompra},
                    { label: "Días desde última",  value: dias !== null ? `${dias} días` : "—",      color: colorUltimaCompra},
                    { label: "Meses activo",       value: `${stats.mesesActivo} meses`,              color: "var(--text)"    },
                    { label: "Frecuencia promedio",value: stats.frecuenciaDias ? `c/ ${stats.frecuenciaDias} días` : "—", color: "var(--text)" },
                  ].map(m => (
                    <div key={m.label} style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>{m.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                  {/* Top productos */}
                  <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10 }}>Top 5 productos más comprados</div>
                    {stats.topProductos.map((p, i) => (
                      <div key={p.nombre} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < stats.topProductos.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: i < 2 ? "#eff6ff" : "var(--bg)", color: i < 2 ? "var(--primary)" : "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1, fontSize: 12 }}>{p.nombre}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.cantidad} u</div>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{fmt(p.subtotal)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Compras por mes */}
                  <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10 }}>Compras por mes</div>
                    {stats.compraPorMes.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>Sin datos</div>}
                    {stats.compraPorMes.map(m => {
                      const maxVal = Math.max(...stats.compraPorMes.map(x => x.total));
                      const pct    = Math.round((m.total / maxVal) * 100);
                      return (
                        <div key={m.mes} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <div style={{ width: 60, fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{m.mes}</div>
                          <div style={{ flex: 1, height: 8, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: pct + "%", height: "100%", background: "var(--primary)", borderRadius: 4 }} />
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 500, width: 80, textAlign: "right" }}>{fmt(m.total)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ── Pantalla principal ───────────────────────────────────────
export function Clientes() {
  const [modal, setModal]     = useState(false);
  const [editando, setEditando] = useState(null);
  const [buscar, setBuscar]   = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [filtroTipo, setFiltroTipo]         = useState("");
  const queryClient = useQueryClient();

  const { data: clientes  = [], isLoading } = useQuery({ queryKey: ["clientes"],  queryFn: clienteService.listar });
  const { data: vendedores= [] }            = useQuery({ queryKey: ["vendedores"], queryFn: vendedorService.listar });

  const { mutate: desactivar } = useMutation({
    mutationFn: (id) => clienteService.eliminar(id),
    onSuccess:  () => { toast.success("Cliente desactivado"); queryClient.invalidateQueries(["clientes"]); },
  });

  const clientesFiltrados = clientes.filter(c => {
    if (buscar && !c.nombre.toLowerCase().includes(buscar.toLowerCase())) return false;
    if (filtroVendedor && String(c.vendedorId) !== filtroVendedor) return false;
    if (filtroTipo && c.tipo !== filtroTipo) return false;
    return true;
  });

  const onGuardado = () => queryClient.invalidateQueries(["clientes"]);
  const abrirNuevo  = () => { setEditando(null); setModal(true); };
  const abrirEditar = (c) => { setEditando(c);   setModal(true); };
  const cerrar      = () => { setModal(false);   setEditando(null); };

  const inputStyle = { padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 13, fontFamily: "inherit", background: "#fff" };

  return (
    <Layout titulo="Clientes">

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...inputStyle, minWidth: 200, flex: 1 }}
          placeholder="Buscar por nombre…"
          value={buscar}
          onChange={e => setBuscar(e.target.value)}
        />
        <select style={inputStyle} value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}>
          <option value="">Todos los vendedores</option>
          {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
        <select style={inputStyle} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="Mayorista">Mayorista</option>
          <option value="Minorista">Minorista</option>
          <option value="Distribuidor">Distribuidor</option>
          <option value="Supermercado">Supermercado</option>
        </select>
        <button onClick={abrirNuevo} style={{ padding: "8px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: 13, cursor: "pointer" }}>
          + Nuevo cliente
        </button>
      </div>

      {/* Tabla */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["", "Cliente", "CUIT", "Dirección", "Teléfono", "Email", "Vendedor", "Última compra", "Total comprado", "Estado", "Acciones"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "2px solid var(--border)", fontWeight: 500, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={11} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>Cargando…</td></tr>}
            {!isLoading && clientesFiltrados.length === 0 && <tr><td colSpan={11} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No se encontraron clientes</td></tr>}
            {clientesFiltrados.map(c => (
              <FilaCliente
                key={c.id}
                cliente={c}
                onEditar={abrirEditar}
                onEliminar={(id) => { if (window.confirm("¿Desactivar este cliente?")) desactivar(id); }}
              />
            ))}
          </tbody>
        </table>
      </div>

      {modal && <ModalCliente cliente={editando} vendedores={vendedores} onClose={cerrar} onGuardado={onGuardado} />}
    </Layout>
  );
}