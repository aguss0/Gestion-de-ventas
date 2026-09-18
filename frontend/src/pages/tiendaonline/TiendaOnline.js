import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Layout } from '../../components/Layout';
import { tiendaOnlineService as svc } from '../../services/tiendaOnlineService';

const dinero = n => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const fecha = n => n ? new Date(n).toLocaleString('es-AR') : 'Todavía no se sincronizó';
const control = { padding: 10, border: '1px solid var(--border)', borderRadius: 6, font: 'inherit' };

function DatosPublicos({ producto, guardar, ocupado }) {
  const [categoriaOnline, setCategoria] = useState(producto.categoriaOnline || '');
  const [precioOnline, setPrecio] = useState(producto.precioOnline == null ? '' : String(producto.precioOnline));
  const [imagenUrl, setImagen] = useState(producto.imagenUrl || '');
  return <form onSubmit={e => { e.preventDefault(); guardar({ id: producto.id, data: { categoriaOnline, imagenUrl, precioOnline: precioOnline === '' ? null : Number(precioOnline) } }); }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
    <label style={{ display: 'grid', gap: 4 }}>Precio en tienda (opcional)
      <input aria-label={`Precio en tienda de ${producto.nombre}`} style={control} type="number" min="0" max="1000000000" step="0.01" placeholder={String(producto.precio)} value={precioOnline} onChange={e => setPrecio(e.target.value)} />
      <small>Vacío: usar el precio del sistema. No cambia los pedidos locales.</small>
    </label>
    <input aria-label={`Categoría de ${producto.nombre}`} style={control} maxLength={120} placeholder={producto.categoria || 'Categoría opcional'} value={categoriaOnline} onChange={e => setCategoria(e.target.value)} />
    <input aria-label={`Imagen de ${producto.nombre}`} style={{ ...control, flex: 1, minWidth: 180 }} type="url" maxLength={2048} placeholder="Imagen: https://… (opcional)" value={imagenUrl} onChange={e => setImagen(e.target.value)} />
    <button style={control} disabled={ocupado}>Guardar datos públicos</button>
  </form>;
}

export function TiendaOnline() {
  const [buscar, setBuscar] = useState('');
  const [linea, setLinea] = useState('');
  const [soloHabilitados, setSoloHabilitados] = useState(false);
  const [editar, setEditar] = useState(null);
  const qc = useQueryClient();
  const productos = useQuery({ queryKey: ['tienda-online-productos'], queryFn: svc.productos });
  const estado = useQuery({ queryKey: ['tienda-online-estado'], queryFn: svc.estado });
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['tienda-online-productos'] });
    qc.invalidateQueries({ queryKey: ['tienda-online-estado'] });
    qc.invalidateQueries({ queryKey: ['articulos'] });
  };
  const actualizacion = useMutation({ mutationFn: ({ id, data }) => svc.actualizar(id, data),
    onSuccess: () => { invalidar(); toast.success('Cambio guardado. Sincronizá para actualizar la tienda.'); },
    onError: e => toast.error(e.response?.data?.error || 'No se pudo guardar el cambio.') });
  const sync = useMutation({ mutationFn: svc.sincronizar,
    onSuccess: r => { invalidar(); toast.success(r.mensaje); if (r.advertencia) toast.error(r.advertencia); },
    onError: e => { invalidar(); toast.error(e.response?.data?.mensaje || 'No se pudo confirmar la sincronización. Revisá el estado antes de reintentar.'); } });
  const ocupado = sync.isPending || estado.data?.ejecutando;
  const ultima = estado.data?.ultimaSincronizacion;
  const lista = (productos.data || []).filter(p => (!linea || p.linea === linea) && (!soloHabilitados || p.publicarOnline) && `${p.nombre} ${p.codigo || ''} ${p.categoria || ''}`.toLocaleLowerCase().includes(buscar.toLocaleLowerCase()));
  return <Layout titulo="Tienda Online">
    <p>Elegí qué artículos querés publicar. Los cambios aparecerán en Internet después de sincronizar.</p>
    <section style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: 18, marginBottom: 20 }}>
      <p><strong>Productos habilitados: {estado.data?.habilitados ?? '—'}</strong></p>
      <p>Último intento: {fecha(ultima?.finalizadoEn)}</p>
      {ultima && <p role="status">{ultima.exitoso ? 'Sincronización exitosa' : 'Sincronización no confirmada'}: {ultima.mensaje}</p>}
      {!estado.isLoading && estado.data && !estado.data.configurado && <p>Falta configurar la dirección y la credencial de la API en el backend local.</p>}
      {estado.isError && <p role="alert">No se pudo consultar el estado. Verificá que la preparación de Tienda Online esté instalada.</p>}
      <button style={{ ...control, background: 'var(--primary)', color: 'white', cursor: 'pointer' }} disabled={ocupado || actualizacion.isPending || !estado.data?.configurado || estado.isError} onClick={() => {
        if (estado.data.habilitados === 0 && !window.confirm('No hay productos habilitados. Sincronizar retirará todos los productos de la tienda online. ¿Continuar?')) return;
        sync.mutate();
      }}>{ocupado ? 'Sincronizando…' : 'Sincronizar catálogo'}</button>
    </section>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
      <input style={{ ...control, flex: 1 }} aria-label="Buscar productos" placeholder="Buscar por nombre, código o categoría" value={buscar} onChange={e => setBuscar(e.target.value)} />
      <select aria-label="Línea de productos" style={control} value={linea} onChange={e => setLinea(e.target.value)}><option value="">Todas las líneas</option>{['Laurens', 'Dietética', 'MF', 'Descartables'].map(l => <option key={l}>{l}</option>)}</select>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={soloHabilitados} onChange={e => setSoloHabilitados(e.target.checked)} />Solo habilitados</label>
    </div>
    {productos.isLoading && <p>Cargando productos…</p>}
    {productos.isError && <p role="alert">No se pudieron cargar los productos. <button onClick={() => productos.refetch()}>Reintentar</button></p>}
    {!productos.isLoading && !productos.isError && lista.length === 0 && <p>No se encontraron productos.</p>}
    {lista.map(p => <article key={p.id} style={{ borderBottom: '1px solid var(--border)', padding: '14px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}><strong>{p.nombre}</strong><div>{p.linea} · {p.codigo || `Artículo ${p.id}`} · {`Sistema: ${dinero(p.precio)} · Tienda: ${dinero(p.precioOnline ?? p.precio)}`}</div>{!p.activo && <small>Inactivo: no se enviará a la tienda.</small>}</div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input aria-label={`Publicar online: ${p.nombre}`} type="checkbox" checked={Boolean(p.publicarOnline)} disabled={ocupado || actualizacion.isPending} onChange={e => actualizacion.mutate({ id: p.id, data: { publicarOnline: e.target.checked } })} />Publicar online</label>
        <button style={control} onClick={() => setEditar(editar === p.id ? null : p.id)}>Precio, categoría e imagen</button>
      </div>
      {editar === p.id && <DatosPublicos key={`${p.id}:${p.categoriaOnline}:${p.imagenUrl}:${p.precioOnline}`} producto={p} guardar={actualizacion.mutate} ocupado={ocupado || actualizacion.isPending} />}
    </article>)}
  </Layout>;
}
