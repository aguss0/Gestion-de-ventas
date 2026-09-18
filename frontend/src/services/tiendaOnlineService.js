import api from './api';
export const tiendaOnlineService = {
  productos: () => api.get('/tienda-online/productos').then(r => r.data),
  estado: () => api.get('/tienda-online/estado').then(r => r.data),
  actualizar: (id, data) => api.patch(`/tienda-online/productos/${id}`, data).then(r => r.data),
  sincronizar: () => api.post('/tienda-online/sincronizar', {}, { timeout: 45000 }).then(r => r.data),
};
