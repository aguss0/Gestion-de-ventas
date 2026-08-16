import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Layout } from "../../components/Layout";
import { ABM } from "../../components/ABM";
import { importarService, importarPDFService } from "../../services/clienteService";
import api from "../../services/api";

const svc = {
  list:   () => api.get("/articulos").then(r => r.data),
  create: (d) => api.post("/articulos", d).then(r => r.data),
  update: (id, d) => api.patch(`/articulos/${id}`, d).then(r => r.data),
  delete: (id) => api.delete(`/articulos/${id}`).then(r => r.data),
};

const campos = {
  createFn: svc.create,
  updateFn: svc.update,
  deleteFn: svc.delete,
  fields: [
    { key: "codigo",      label: "Código",       placeholder: "opcional" },
    { key: "nombre",      label: "Nombre",        required: true },
    { key: "descripcion", label: "Descripción",   placeholder: "opcional" },
    { key: "unidadCaja",  label: "Unidad x caja", placeholder: "ej: 10 UNID" },
    { key: "precio",      label: "Precio",        type: "number", required: true, render: v => v ? "$" + Number(v).toLocaleString("es-AR") : "—" },
  ],
};

export function Articulos() {
  const fileExcelRef = useRef();
  const filePDFRef   = useRef();
  const queryClient  = useQueryClient();
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado]   = useState(null);

  const handleImportarExcel = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    setImportando(true);
    setResultado(null);
    try {
      const res = await importarService.precios(archivo);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.mensaje);
        setResultado(res);
        queryClient.invalidateQueries(["articulos"]);
      }
    } catch {
      toast.error("Error al importar el archivo");
    } finally {
      setImportando(false);
      fileExcelRef.current.value = "";
    }
  };

  const handleImportarPDF = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    setImportando(true);
    setResultado(null);
    try {
      const res = await importarPDFService.precios(archivo);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.mensaje);
        setResultado(res);
        queryClient.invalidateQueries(["articulos"]);
      }
    } catch {
      toast.error("Error al importar el PDF");
    } finally {
      setImportando(false);
      filePDFRef.current.value = "";
    }
  };

  return (
    <Layout titulo="Artículos">
      {/* Botones importar */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <input ref={fileExcelRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleImportarExcel} />
        <input ref={filePDFRef}   type="file" accept=".pdf"       style={{ display: "none" }} onChange={handleImportarPDF} />

        <button
          onClick={() => fileExcelRef.current.click()}
          disabled={importando}
          style={{ padding: "7px 14px", border: "1px solid #16a34a", borderRadius: 6, background: "#f0fdf4", color: "#16a34a", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
        >
          {importando ? "Importando…" : "📥 Importar desde Excel"}
        </button>

        <button
          onClick={() => filePDFRef.current.click()}
          disabled={importando}
          style={{ padding: "7px 14px", border: "1px solid #dc2626", borderRadius: 6, background: "#fef2f2", color: "#dc2626", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
        >
          {importando ? "Importando…" : "📄 Importar desde PDF"}
        </button>

        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          Excel: columnas <strong>codigo</strong> y <strong>precio</strong> · PDF: lista de precios Laurens
        </span>
      </div>

      {/* Resultado */}
      {resultado && (
        <div style={{ background: "#f0fdf4", border: "1px solid #16a34a", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
          <div style={{ fontWeight: 500, color: "#16a34a", marginBottom: 6 }}>✅ {resultado.mensaje}</div>
          {resultado.creados > 0 && (
            <div style={{ color: "var(--primary)", marginTop: 4 }}>
              🆕 {resultado.creados} artículo(s) nuevo(s) agregado(s) automáticamente
            </div>
          )}
          {resultado.errores?.length > 0 && (
            <div style={{ color: "var(--danger)", marginTop: 4 }}>
              Errores: {resultado.errores.join(" | ")}
            </div>
          )}
        </div>
      )}

      <ABM titulo="artículo" queryKey="articulos" fetchFn={svc.list} campos={campos} />
    </Layout>
  );
}