import { Layout } from "../../components/Layout";
import { ABM } from "../../components/ABM";
import api from "../../services/api";

const svc = {
  list:   () => api.get("/vendedores").then(r => r.data),
  create: (d) => api.post("/vendedores", d).then(r => r.data),
  update: (id, d) => api.patch(`/vendedores/${id}`, d).then(r => r.data),
  delete: (id) => api.delete(`/vendedores/${id}`).then(r => r.data),
};

const campos = {
  createFn: svc.create,
  updateFn: svc.update,
  deleteFn: svc.delete,
  fields: [
    { key: "nombre",   label: "Nombre",   required: true },
    { key: "email",    label: "Email",    type: "email", placeholder: "opcional" },
    { key: "telefono", label: "Teléfono", placeholder: "opcional" },
  ],
};

export function Vendedores() {
  return (
    <Layout titulo="Vendedores">
      <ABM titulo="vendedor" queryKey="vendedores" fetchFn={svc.list} campos={campos} />
    </Layout>
  );
}