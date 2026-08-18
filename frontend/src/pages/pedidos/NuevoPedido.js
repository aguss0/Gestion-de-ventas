import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Layout } from "../../components/Layout";
import { pedidoService } from "../../services/pedidoService";
import { clienteService, articuloService, vendedorService } from "../../services/clienteService";

function fmt(n) { return "$" + Number(n || 0).toLocaleString("es-AR"); }

function BuscadorDropdown({ opciones, valor, onSeleccionar, placeholder, renderOpcion, renderValor }) {
  const [buscar, setBuscar]   = useState("");
  const [abierto, setAbierto] = useState(false);

  const filtradas = opciones.filter(o =>
    renderValor(o).toLowerCase().includes(buscar.toLowerCase())
  );

  const seleccionado = opciones.find(o => o.id === Number(valor));

  const inputStyle = {
    width: "100%", padding: "8px 10px",
    border: "1px solid var(--border)", borderRadius: "var(--radius)",
    fontSize: 13, fontFamily: "inherit",
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        style={inputStyle}
        placeholder={seleccionado ? renderValor(seleccionado) : placeholder}
        value={abierto ? buscar : (seleccionado ? renderValor(seleccionado) : "")}
        onChange={e => { setBuscar(e.target.value); setAbierto(true); }}
        onFocus={() => { setAbierto(true); setBuscar(""); }}
        onBlur={() => setTimeout(() => setAbierto(false), 200)}
      />
      {abierto && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "#fff", border: "1px solid var(--border)",
          borderRadius: 6, maxHeight: 220, overflowY: "auto",
          zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,.1)",
        }}>
          {filtradas.length === 0 && (
            <div style={{ padding: "9px 12px", color: "var(--muted)", fontSize: 13 }}>No se encontraron resultados</div>
          )}
          {filtradas.map(o => (
            <div
              key={o.id}
              onMouseDown={() => { onSeleccionar(o); setBuscar(""); setAbierto(false); }}
              style={{
                padding: "9px 12px", cursor: "pointer", fontSize: 13,
                background: valor === String(o.id) ? "#eff6ff" : "#fff",
                borderBottom: "1px solid var(--border)",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
              onMouseLeave={e => e.currentTarget.style.background = valor === String(o.id) ? "#eff6ff" : "#fff"}
            >
              {renderOpcion(o)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function NuevoPedido() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [clienteId, setClienteId]       = useState("");
  const [vendedorId, setVendedorId]     = useState("");
  const [fecha, setFecha]               = useState(new Date().toISOString().split("T")[0]);
  const [obs, setObs]                   = useState("");
  const [items, setItems]               = useState([]);
  const [articuloId, setArticuloId]     = useState("");
  const [cantidad, setCantidad]         = useState("");
  const [precioCustom, setPrecioCustom] = useState("");
  const [obsItem, setObsItem]           = useState("");
  const [nroOrden, setNroOrden] = useState("");

  const { data: clientes  = [] } = useQuery({ queryKey: ["clientes"],  queryFn: clienteService.listar });
  const { data: articulos = [] } = useQuery({ queryKey: ["articulos"], queryFn: articuloService.listar });
  const { data: vendedores= [] } = useQuery({ queryKey: ["vendedores"],queryFn: vendedorService.listar });

  const articulo = articulos.find(a => a.id === Number(articuloId));
  const precio   = precioCustom ? Number(precioCustom) : Number(articulo?.precio || 0);
  const total    = items.reduce((s, i) => s + i.subtotal, 0);

  const agregarItem = (e) => {
    e.preventDefault();
    if (!articulo) return toast.error("Seleccioná un artículo");
      if (!cantidad || Number(cantidad) < 1) return toast.error("La cantidad debe ser mayor a 0");
    const existe = items.findIndex(i => i.articuloId === articulo.id);
    if (existe >= 0) {
      const nuevos = [...items];
      nuevos[existe].cantidad += Number(cantidad);
      nuevos[existe].subtotal  = nuevos[existe].precio * nuevos[existe].cantidad;
      setItems(nuevos);
    } else {
      setItems([...items, {
        articuloId:    articulo.id,
        nombre:        articulo.nombre,
        unidadCaja:    articulo.unidadCaja,
        cantidad:      Number(cantidad),
        precio,
        subtotal:      precio * Number(cantidad),
        observaciones: obsItem || null,
      }]);
    }
    setArticuloId(""); setCantidad(""); setPrecioCustom(""); setObsItem("");
  };

  const quitarItem    = (id) => setItems(items.filter(i => i.articuloId !== id));
  const editarCantidad = (id, nueva) => {
    if (nueva < 1) return;
    setItems(items.map(i => i.articuloId === id ? { ...i, cantidad: nueva, subtotal: i.precio * nueva } : i));
  };

  const { mutate: crear, isLoading } = useMutation({
    mutationFn: () => pedidoService.crear({
      nroOrden:   nroOrden ? Number(nroOrden) : undefined,
      clienteId:  Number(clienteId),
      vendedorId: vendedorId ? Number(vendedorId) : null,
      fecha, items, observaciones: obs || undefined,
    }),
    onSuccess: (data) => {
      toast.success(`Pedido #${data.nroOrden} creado`);
      queryClient.invalidateQueries(["pedidos"]);
      navigate("/pedidos");
    },
    onError: (err) => toast.error(err.response?.data?.error || "Error al crear"),
  });

  const inputStyle = { width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 13, fontFamily: "inherit" };
  const labelStyle = { display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 };

  return (
    <Layout titulo="Nuevo pedido">
      <div style={{ maxWidth: 700 }}>

        {/* Datos del pedido */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 500, marginBottom: 14 }}>Datos del pedido</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Cliente *</label>
              <BuscadorDropdown
                opciones={clientes.filter(c => c.activo)}
                valor={clienteId}
                placeholder="Buscar cliente..."
                onSeleccionar={(c) => {
                  setClienteId(String(c.id));
                  if (c.vendedorId) setVendedorId(String(c.vendedorId));
                  else setVendedorId("");
                }}
                renderValor={(c) => c.nombre}
                renderOpcion={(c) => (
                  <div>
                    <div style={{ fontWeight: 500 }}>{c.nombre}</div>
                    {c.vendedor && <div style={{ fontSize: 11, color: "var(--muted)" }}>Vendedor: {c.vendedor.nombre}</div>}
                  </div>
                )}
              />
            </div>
            <div>
              <label style={labelStyle}>Vendedor</label>
              <select style={inputStyle} value={vendedorId} onChange={e => setVendedorId(e.target.value)}>
                <option value="">— Sin vendedor —</option>
                {vendedores.filter(v => v.activo).map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>N° Orden</label>
              <input
                type="number"
                min="1"
                style={inputStyle}
                value={nroOrden}
                onChange={e => setNroOrden(e.target.value)}
                placeholder="Automático"
              />
            </div>
            <div>
              <label style={labelStyle}>Fecha</label>
              <input type="date" style={inputStyle} value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Observaciones del pedido</label>
            <input style={inputStyle} value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional…" />
          </div>
        </div>

        {/* Agregar artículo */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 500, marginBottom: 14 }}>Agregar artículo</div>
          <form onSubmit={agregarItem}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, alignItems: "flex-end" }}>
              <div>
                <label style={labelStyle}>Artículo *</label>
                <BuscadorDropdown
                  opciones={articulos.filter(a => a.activo)}
                  valor={articuloId}
                  placeholder="Buscar artículo..."
                  onSeleccionar={(a) => { setArticuloId(String(a.id)); setPrecioCustom(""); }}
                  renderValor={(a) => a.nombre}
                  renderOpcion={(a) => (
                    <div>
                      <div style={{ fontWeight: 500 }}>{a.nombre}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        {a.unidadCaja && `${a.unidadCaja} · `}{fmt(a.precio)}
                      </div>
                    </div>
                  )}
                />
              </div>
              <div>
                <label style={labelStyle}>Cantidad</label>
                <input type="number" min="1" style={inputStyle} value={cantidad} onChange={e => setCantidad(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>
                  Precio {articulo ? <strong style={{ color: "var(--primary)" }}>({fmt(articulo.precio)})</strong> : ""}
                </label>
                <input type="text" inputMode="numeric" style={inputStyle} value={precioCustom} onChange={e => setPrecioCustom(e.target.value)} placeholder="Automático"/>
              </div>
              <button type="submit" style={{ background: "var(--primary)", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                + Agregar
              </button>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>Observaciones del artículo</label>
              <input
                style={inputStyle}
                value={obsItem}
                onChange={e => setObsItem(e.target.value)}
                placeholder="Opcional…"
              />
            </div>
          </form>
        </div>

        {/* Items del pedido */}
        {items.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 500, marginBottom: 14 }}>Detalle del pedido</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Artículo", "Caja", "Cantidad", "Precio unit.", "Subtotal", ""].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 11, color: "var(--muted)", borderBottom: "1px solid var(--border)", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.articuloId} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px" }}>
                      <div>{item.nombre}</div>
                      {item.observaciones && (
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>📝 {item.observaciones}</div>
                      )}
                    </td>
                    <td style={{ padding: "8px", color: "var(--muted)", fontSize: 12 }}>{item.unidadCaja || "—"}</td>
                    <td style={{ padding: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button onClick={() => editarCantidad(item.articuloId, item.cantidad - 1)} style={{ width: 22, height: 22, border: "1px solid var(--border)", borderRadius: 4, background: "var(--bg)", cursor: "pointer" }}>−</button>
                        <span style={{ minWidth: 28, textAlign: "center" }}>{item.cantidad}</span>
                        <button onClick={() => editarCantidad(item.articuloId, item.cantidad + 1)} style={{ width: 22, height: 22, border: "1px solid var(--border)", borderRadius: 4, background: "var(--bg)", cursor: "pointer" }}>+</button>
                      </div>
                    </td>
                    <td style={{ padding: "8px" }}>{fmt(item.precio)}</td>
                    <td style={{ padding: "8px", fontWeight: 500 }}>{fmt(item.subtotal)}</td>
                    <td style={{ padding: "8px" }}>
                      <button onClick={() => quitarItem(item.articuloId)} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: 16 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: "2px solid var(--border)", marginTop: 8, paddingTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Total: {fmt(total)}</span>
            </div>
          </div>
        )}

        {/* Confirmar */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => navigate("/pedidos")} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: 6, background: "#fff", fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
          <button
            onClick={() => { if (!clienteId) return toast.error("Seleccioná un cliente"); if (!items.length) return toast.error("Agregá al menos un artículo"); crear(); }}
            disabled={isLoading}
            style={{ padding: "8px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer" }}
          >
            {isLoading ? "Guardando…" : "Confirmar pedido"}
          </button>
        </div>
      </div>
    </Layout>
  );
}