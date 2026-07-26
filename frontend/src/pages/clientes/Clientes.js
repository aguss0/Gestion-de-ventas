import { Layout } from "../../components/Layout";
import { ABM } from "../../components/ABM";
import api from "../../services/api";

const svc = {
  list:   () => api.get("/clientes").then(r => r.data),
  create: (d) => api.post("/clientes", d).then(r => r.data),
  update: (id, d) => api.patch(`/clientes/${id}`, d).then(r => r.data),
  delete: (id) => api.delete(`/clientes/${id}`).then(r => r.data),
};

const campos = {
  createFn: svc.create,
  updateFn: svc.update,
  deleteFn: svc.delete,
  fields: [
    { key: "nombre",   label: "Nombre",    required: true },
    { key: "email",    label: "Email",     type: "email", placeholder: "opcional" },
    { key: "telefono", label: "Teléfono",  placeholder: "opcional" },
    { key: "direccion",label: "Dirección", placeholder: "opcional" },
  ],
};

export function Clientes() {
  return (
    <Layout titulo="Clientes">
      <ABM titulo="cliente" queryKey="clientes" fetchFn={svc.list} campos={campos} />
    </Layout>
  );
}