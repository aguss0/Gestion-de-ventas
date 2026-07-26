import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export function ABM({ titulo, queryKey, fetchFn, campos }) {
  const [modal, setModal]     = useState(false);
  const [editando, setEditando] = useState(null);
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({ queryKey: [queryKey], queryFn: fetchFn });

  const { mutate: guardar, isLoading: guardando } = useMutation({
    mutationFn: (form) => editando ? campos.updateFn(editando.id, form) : campos.createFn(form),
    onSuccess: () => {
      toast.success(editando ? "Actualizado correctamente" : "Creado correctamente");
      queryClient.invalidateQueries([queryKey]);
      cerrar();
    },
    onError: (err) => toast.error(err.response?.data?.error || "Error al guardar"),
  });

  const { mutate: eliminar } = useMutation({
    mutationFn: (id) => campos.deleteFn(id),
    onSuccess: () => {
      toast.success("Eliminado correctamente");
      queryClient.invalidateQueries([queryKey]);
    },
    onError: () => toast.error("Error al eliminar"),
  });

  const abrirNuevo  = () => { setEditando(null); setModal(true); };
  const abrirEditar = (item) => { setEditando(item); setModal(true); };
  const cerrar      = () => { setModal(false); setEditando(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = {};
    campos.fields.forEach(f => {
      form[f.key] = e.target[f.key].value || undefined;
    });
    guardar(form);
  };

  const inputStyle = {
    width: "100%", padding: "8px 10px",
    border: "1px solid var(--border)", borderRadius: "var(--radius)",
    fontSize: 13, fontFamily: "inherit", marginBottom: 12,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>{data.filter(d => d.activo).length} registros activos</span>
        <button onClick={abrirNuevo} style={{
          background: "var(--primary)", color: "#fff", border: "none",
          borderRadius: "var(--radius)", padding: "8px 16px", fontSize: 13, cursor: "pointer",
        }}>
          + Nuevo {titulo}
        </button>
      </div>

      {/* Tabla */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {campos.fields.map(f => (
                <th key={f.key} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "2px solid var(--border)", fontWeight: 500, textTransform: "uppercase" }}>
                  {f.label}
                </th>
              ))}
              <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: "var(--muted)", borderBottom: "2px solid var(--border)", fontWeight: 500, textTransform: "uppercase" }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={campos.fields.length + 1} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>Cargando…</td></tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr><td colSpan={campos.fields.length + 1} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No hay registros todavía</td></tr>
            )}
            {data.map(item => (
              <tr key={item.id}
                style={{ borderBottom: "1px solid var(--border)", opacity: item.activo ? 1 : 0.45 }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {campos.fields.map(f => (
                  <td key={f.key} style={{ padding: "10px 14px" }}>
                    {f.render ? f.render(item[f.key]) : (item[f.key] ?? "—")}
                  </td>
                ))}
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => abrirEditar(item)} style={{
                      padding: "4px 10px", border: "1px solid var(--border)", borderRadius: 5,
                      background: "var(--card)", fontSize: 12, cursor: "pointer",
                    }}>Editar</button>
                    {item.activo && (
                      <button onClick={() => { if (window.confirm("¿Eliminar este registro?")) eliminar(item.id); }} style={{
                        padding: "4px 10px", border: "1px solid var(--danger)", borderRadius: 5,
                        background: "var(--card)", fontSize: 12, cursor: "pointer", color: "var(--danger)",
                      }}>Eliminar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={e => e.target === e.currentTarget && cerrar()}>
          <div style={{ background: "var(--card)", borderRadius: 12, padding: 24, width: "100%", maxWidth: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{editando ? `Editar ${titulo}` : `Nuevo ${titulo}`}</span>
              <button onClick={cerrar} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              {campos.fields.map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
                    {f.label}{f.required ? " *" : ""}
                  </label>
                  <input
                    name={f.key}
                    type={f.type || "text"}
                    defaultValue={editando?.[f.key] ?? ""}
                    required={f.required}
                    placeholder={f.placeholder}
                    style={inputStyle}
                  />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button type="button" onClick={cerrar} style={{ padding: "8px 16px", border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--card)", fontSize: 13, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} style={{ padding: "8px 16px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: 13, cursor: "pointer" }}>
                  {guardando ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}