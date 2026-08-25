import api from "./api";

export const pedidoService = {
  listar:  () => api.get("/pedidos").then(r => r.data),
  obtener: (id) => api.get(`/pedidos/${id}`).then(r => r.data),
  crear:   (d) => api.post("/pedidos", d).then(r => r.data),
  editar:  (id, d) => api.patch(`/pedidos/${id}`, d).then(r => r.data),
  eliminar:(id) => api.delete(`/pedidos/${id}`).then(r => r.data),
};

export const pagoService = {
  listar:   (params) => api.get("/pagos", { params }).then(r => r.data),
  registrar:(d) => api.post("/pagos", d).then(r => r.data),
  eliminar: (id) => api.delete(`/pagos/${id}`).then(r => r.data),
};

export const estadoCuentaService = {
  listar:     () => api.get("/estadocuenta").then(r => r.data),
  porCliente: (id) => api.get(`/estadocuenta/cliente/${id}`).then(r => r.data),
};

export const comisionService = {
  listar:  (params = {}) => api.get("/comisiones", { params }).then(r => r.data),
  resumen: (params = {}) => api.get("/comisiones/resumen", { params }).then(r => r.data),
};