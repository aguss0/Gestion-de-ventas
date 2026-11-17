import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Layout } from '../../components/Layout';
import { tiendaOnlineService as svc } from '../../services/tiendaOnlineService';

const dinero = n => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const fecha = n => n ? new Date(n).toLocaleString('es-AR') : 'Todavía no se sincronizó';
const control = { padding: 10, border: '1px solid var(--border)', borderRadius: 6, font: 'inherit' };

const TIPOS_PRECIO = [['peso', 'Por peso (precio por kg)'], ['unidad', 'Por unidad'], ['bulto', 'Bulto cerrado'], ['pack', 'Pack cerrado']];
const DETALLE_EJEMPLO = { peso: 'ej: suelto', unidad: 'ej: 1 kg', bulto: 'ej: 10 kg', pack: 'ej: x 12' };
const renglonVacio = tipo => ({ tipo, detalle: '', precio: '', pasoGramos: tipo === 'peso' ? '250' : '' });

function DatosPublicos({ producto, guardar, guardarImagen, eliminarImagen, ocupado }) {
  const [nombreOnline, setNombre] = useState(producto.nombreOnline || '');
  const [categoriaOnline, setCategoria] = useState(producto.categoriaOnline || '');
  const [precioOnline, setPrecio] = useState(producto.precioOnline == null ? '' : String(producto.precioOnline));
  const [renglones, setRenglones] = useState(() => (producto.preciosOnline || []).map(r => ({ tipo: r.tipo, detalle: r.detalle || '', precio: r.precio == null ? '' : String(r.precio), pasoGramos: r.pasoGramos ? String(r.pasoGramos) : '' })));
  const [archivo, setArchivo] = useState(null);
  const base = precioOnline === '' ? producto.precio : Number(precioOnline);
  const cambiar = (i, campo, valor) => setRenglones(rs => rs.map((r, n) => n !== i ? r : campo === 'tipo' ? { ...r, tipo: valor, pasoGramos: valor === 'peso' ? r.pasoGramos || '250' : '' } : { ...r, [campo]: valor }));
  const enviar = e => {
    e.preventDefault();
    guardar({ id: producto.id, data: { nombreOnline, categoriaOnline, precioOnline: precioOnline === '' ? null : Number(precioOnline),
      preciosOnline: renglones.map(r => ({ tipo: r.tipo, detalle: r.detalle, precio: r.precio === '' ? null : Number(r.precio), pasoGramos: r.tipo === 'peso' ? Number(r.pasoGramos) : null })) } });
  };
  return <form onSubmit={enviar} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
    <label style={{ display: 'grid', gap: 4, flex: '1 1 260px' }}>Nombre en tienda (opcional)
      <input aria-label={`Nombre en tienda de ${producto.nombre}`} style={control} maxLength={240} placeholder={producto.nombre} value={nombreOnline} onChange={e => setNombre(e.target.value)} />
      <small>Vacío: se publica con el nombre del sistema. No cambia listas ni pedidos.</small>
    </label>
    <label style={{ display: 'grid', gap: 4 }}>Precio base en tienda (opcional)
      <input aria-label={`Precio en tienda de ${producto.nombre}`} style={control} type="number" min="0" max="1000000000" step="0.01" placeholder={String(producto.precio)} value={precioOnline} onChange={e => setPrecio(e.target.value)} />
      <small>Vacío: usar el precio del sistema. No cambia los pedidos locales.</small>
    </label>
    <label style={{ display: 'grid', gap: 4 }}>Categoría
      <input aria-label={`Categoría de ${producto.nombre}`} style={control} maxLength={120} placeholder={producto.categoria || 'Categoría opcional'} value={categoriaOnline} onChange={e => setCategoria(e.target.value)} />
    </label>
    <fieldset style={{ flexBasis: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: 12, display: 'grid', gap: 8 }}>
      <legend>Precios en tienda (un renglón por cada forma de venta)</legend>
      {!renglones.length && <small>Sin renglones: la tienda muestra un único precio ({dinero(base)}) con el botón Agregar.</small>}
      {renglones.map((r, i) => <div key={i} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={{ display: 'grid', gap: 4 }}>Tipo
          <select aria-label={`Tipo del renglón ${i + 1}`} style={control} value={r.tipo} onChange={e => cambiar(i, 'tipo', e.target.value)}>{TIPOS_PRECIO.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>Detalle (opcional)
          <input aria-label={`Detalle del renglón ${i + 1}`} style={{ ...control, width: 120 }} maxLength={60} placeholder={DETALLE_EJEMPLO[r.tipo]} value={r.detalle} onChange={e => cambiar(i, 'detalle', e.target.value)} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>{r.tipo === 'peso' ? 'Precio por kg' : 'Precio'}
          <input aria-label={`Precio del renglón ${i + 1}`} style={{ ...control, width: 140 }} type="number" min="0" max="1000000000" step="0.01" placeholder={`${base} (base)`} value={r.precio} onChange={e => cambiar(i, 'precio', e.target.value)} />
        </label>
        {r.tipo === 'peso' && <label style={{ display: 'grid', gap: 4 }}>Gramos por paso
          <input aria-label={`Gramos por paso del renglón ${i + 1}`} style={{ ...control, width: 110 }} type="number" min="10" max="10000" step="1" required value={r.pasoGramos} onChange={e => cambiar(i, 'pasoGramos', e.target.value)} />
        </label>}
        <button type="button" style={control} aria-label={`Quitar renglón ${i + 1}`} onClick={() => setRenglones(rs => rs.filter((_, n) => n !== i))}>Quitar</button>
      </div>)}
      {renglones.length < 6 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {TIPOS_PRECIO.map(([v, t]) => <button key={v} type="button" style={control} onClick={() => setRenglones(rs => [...rs, renglonVacio(v)])}>+ {t}</button>)}
      </div>}
      <small>Precio vacío = precio base. En “por peso” el cliente elige los gramos de a un paso (ej. 250 g) y se cobra proporcional al kg.</small>
    </fieldset>
    <button style={control} disabled={ocupado}>Guardar nombre, precios y categoría</button>
    <div style={{ flexBasis: '100%', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      {producto.imagenLocal && <img src={`/api/tienda-online/productos/${producto.id}/imagen?v=${encodeURIComponent(producto.imagenLocal)}`} alt={`Vista de ${producto.nombre}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6 }} />}
      <label>Imagen local (JPG, PNG o WebP; máximo 2 MB) <input aria-label={`Imagen local de ${producto.nombre}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setArchivo(e.target.files?.[0] || null)} /></label>
      <button type="button" style={control} disabled={ocupado || !archivo} onClick={() => guardarImagen({id:producto.id,archivo,onDone:()=>setArchivo(null)})}>Guardar imagen</button>
      {producto.imagenLocal && <button type="button" style={control} disabled={ocupado} onClick={() => window.confirm('¿Quitar la imagen de este producto?') && eliminarImagen(producto.id)}>Quitar imagen</button>}
    </div>
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
  const imagen = useMutation({ mutationFn: ({id,archivo}) => svc.guardarImagen(id,archivo), onSuccess: (_r,v) => { v.onDone?.();invalidar();toast.success('Imagen guardada. Sincronizá para publicarla.'); }, onError:e=>toast.error(e.response?.data?.error||'No se pudo guardar la imagen.') });
  const quitarImagen = useMutation({ mutationFn: svc.eliminarImagen, onSuccess:()=>{invalidar();toast.success('Imagen quitada. Sincronizá para actualizar la tienda.');},onError:e=>toast.error(e.response?.data?.error||'No se pudo quitar la imagen.') });
  const sync = useMutation({ mutationFn: svc.sincronizar,
    onSuccess: r => { invalidar(); toast.success(r.mensaje); if (r.advertencia) toast.error(r.advertencia); },
    onError: e => { invalidar(); toast.error(e.response?.data?.mensaje || 'No se pudo confirmar la sincronización. Revisá el estado antes de reintentar.'); } });
  const ocupado = sync.isPending || imagen.isPending || quitarImagen.isPending || estado.data?.ejecutando;
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
        <div style={{ flex: 1, minWidth: 180 }}><strong>{p.nombre}</strong>{p.nombreOnline && <div>En tienda: <strong>{p.nombreOnline}</strong></div>}<div>{p.linea} · {p.codigo || `Artículo ${p.id}`} · {`Sistema: ${dinero(p.precio)} · Tienda: `}{p.preciosOnline?.length ? p.preciosOnline.map(r => `${TIPOS_PRECIO.find(([v]) => v === r.tipo)?.[1].replace(' (precio por kg)', '')}${r.detalle ? ' ' + r.detalle : ''} ${dinero(r.precio ?? p.precioOnline ?? p.precio)}${r.tipo === 'peso' ? '/kg' : ''}`).join(' · ') : dinero(p.precioOnline ?? p.precio)}</div>{!p.activo && <small>Inactivo: no se enviará a la tienda.</small>}</div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input aria-label={`Publicar online: ${p.nombre}`} type="checkbox" checked={Boolean(p.publicarOnline)} disabled={ocupado || actualizacion.isPending} onChange={e => actualizacion.mutate({ id: p.id, data: { publicarOnline: e.target.checked } })} />Publicar online</label>
        <button style={control} onClick={() => setEditar(editar === p.id ? null : p.id)}>Nombre, precios, categoría e imagen</button>
      </div>
      {editar === p.id && <DatosPublicos key={`${p.id}:${p.categoriaOnline}:${p.imagenUrl}:${p.precioOnline}:${p.nombreOnline}:${JSON.stringify(p.preciosOnline)}`} producto={p} guardar={actualizacion.mutate} guardarImagen={imagen.mutate} eliminarImagen={quitarImagen.mutate} ocupado={ocupado || actualizacion.isPending} />}
    </article>)}
  </Layout>;
}
