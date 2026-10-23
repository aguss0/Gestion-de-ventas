import api from './api';
export const tiendaOnlineService = {
  productos: () => api.get('/tienda-online/productos').then(r => r.data),
  estado: () => api.get('/tienda-online/estado').then(r => r.data),
  actualizar: (id, data) => api.patch(`/tienda-online/productos/${id}`, data).then(r => r.data),
  guardarImagen: async (id, archivo) => { const data=new FormData();data.append('imagen',archivo);const r=await fetch((process.env.REACT_APP_API_URL||'/api')+`/tienda-online/productos/${id}/imagen`,{method:'POST',body:data});const j=await r.json().catch(()=>({}));if(!r.ok)throw {response:{data:j}};return j; },
  eliminarImagen: id => api.delete(`/tienda-online/productos/${id}/imagen`).then(r=>r.data),
  sincronizar: () => api.post('/tienda-online/sincronizar', {}, { timeout: 45000 }).then(r => r.data),
};
