import { Layout } from "../../components/Layout";
import { ABM } from "../../components/ABM";
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
    { key: "nombre",      label: "Nombre",      required: true },
    { key: "descripcion", label: "Descripción",  placeholder: "opcional" },
    { key: "precio",      label: "Precio",       type: "number", required: true, render: v => v ? "$" + Number(v).toLocaleString("es-AR") : "—" },
    { key: "stock",       label: "Stock",        type: "number", render: v => v ?? 0 },
  ],
};

export function Articulos() {
  return (
    <Layout titulo="Artículos">
      <ABM titulo="artículo" queryKey="articulos" fetchFn={svc.list} campos={campos} />
    </Layout>
  );
}