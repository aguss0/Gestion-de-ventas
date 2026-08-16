import api from "./api";

export const clienteService = {
  listar:  () => api.get("/clientes").then(r => r.data),
  crear:   (d) => api.post("/clientes", d).then(r => r.data),
  editar:  (id, d) => api.patch(`/clientes/${id}`, d).then(r => r.data),
  eliminar:(id) => api.delete(`/clientes/${id}`).then(r => r.data),
};

export const articuloService = {
  listar:  () => api.get("/articulos").then(r => r.data),
  crear:   (d) => api.post("/articulos", d).then(r => r.data),
  editar:  (id, d) => api.patch(`/articulos/${id}`, d).then(r => r.data),
  eliminar:(id) => api.delete(`/articulos/${id}`).then(r => r.data),
};

export const vendedorService = {
  listar:  () => api.get("/vendedores").then(r => r.data),
  crear:   (d) => api.post("/vendedores", d).then(r => r.data),
  editar:  (id, d) => api.patch(`/vendedores/${id}`, d).then(r => r.data),
  eliminar:(id) => api.delete(`/vendedores/${id}`).then(r => r.data),
};

export const importarService = {
  precios: (archivo) => {
    const formData = new FormData();
    formData.append("archivo", archivo);
    return fetch(
      (process.env.REACT_APP_API_URL || "/api") + "/importar/precios",
      { method: "POST", body: formData }
    ).then(r => r.json());
  },
};

export const importarPDFService = {
  precios: (archivo) => {
    const formData = new FormData();
    formData.append("archivo", archivo);
    return fetch(
      (process.env.REACT_APP_API_URL || "/api") + "/importar/precios-pdf",
      { method: "POST", body: formData }
    ).then(r => r.json());
  },
};