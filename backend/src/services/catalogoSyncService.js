const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

function productoPublico(a) {
  const precio = a.precioOnline ?? a.precio;
  if (!Number.isSafeInteger(a.id) || a.id < 1 || !a.nombre?.trim() || !Number.isFinite(precio) || precio < 0 || precio > 1000000000) {
    throw new Error(`Revisá el nombre o precio del artículo ${a.id} (${a.nombre || 'sin nombre'}).`);
  }
  const disponible = a.activo && (!a.manejaStock || a.stock > 0) && !a.dietetica?.sinStock;
  return {
    articuloLocalId: a.id, codigo: a.codigo || null, nombre: a.nombre.trim(),
    descripcion: a.descripcion || null, precioCentavos: Math.round(precio * 100),
    categoria: a.categoriaOnline || a.dietetica?.categoria || a.descartable?.categoria || (a.manejaStock ? 'Dietética' : 'Laurens'),
    presentacion: a.presentacion || a.unidadCaja || null,
    imagenUrl: a.imagenUrl || null, disponible: Boolean(disponible),
  };
}

function crearCatalogoSyncService({ prisma, fetchImpl = fetch, env = process.env,
  estadoPath = path.join(__dirname, '../../data/tienda-online-estado.json') }) {
  let ejecutando = false;
  async function leerEstado() {
    try { return JSON.parse(await fs.readFile(estadoPath, 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return null; throw new Error('No se pudo leer el estado de sincronización.'); }
  }
  async function guardarEstado(estado) {
    await fs.mkdir(path.dirname(estadoPath), { recursive: true });
    const temporal = estadoPath + '.' + crypto.randomUUID() + '.tmp';
    try { await fs.writeFile(temporal, JSON.stringify(estado), { mode: 0o600 }); await fs.rename(temporal, estadoPath); }
    finally { await fs.rm(temporal, { force: true }).catch(() => {}); }
  }
  function configuracion() {
    let url;
    try { url = new URL(env.CATALOGO_API_URL); } catch { throw new Error('Configurá CATALOGO_API_URL en el backend local.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('La API del catálogo debe usar HTTPS sin credenciales en la URL.');
    if (!env.CATALOGO_SYNC_TOKEN || env.CATALOGO_SYNC_TOKEN.length < 32) throw new Error('Configurá una credencial de sincronización de al menos 32 caracteres en el backend local.');
    return { url: new URL('/api/catalogo/sincronizar', url).href, token: env.CATALOGO_SYNC_TOKEN };
  }
  async function resumen() {
    const [habilitados, ultimaSincronizacion] = await Promise.all([
      prisma.articulo.count({ where: { publicarOnline: true, activo: true } }), leerEstado(),
    ]);
    let configurado = true;
    try { configuracion(); } catch { configurado = false; }
    return { habilitados, ultimaSincronizacion, ejecutando, configurado };
  }
  async function sincronizar() {
    if (ejecutando) throw Object.assign(new Error('Ya hay una sincronización en curso.'), { status: 409 });
    ejecutando = true;
    const iniciadoEn = new Date().toISOString();
    let estado;
    try {
      const config = configuracion();
      const articulos = await prisma.articulo.findMany({
        where: { publicarOnline: true, activo: true },
        select: { id: true, codigo: true, nombre: true, descripcion: true, precio: true, precioOnline: true,
          categoriaOnline: true, imagenUrl: true, presentacion: true, unidadCaja: true,
          activo: true, manejaStock: true, stock: true,
          dietetica: { select: { categoria: true, sinStock: true } },
          descartable: { select: { categoria: true } } },
      });
      const productos = articulos.map(productoPublico);
      if (productos.some(p => !Number.isSafeInteger(p.precioCentavos))) throw new Error('Hay un precio fuera del rango admitido. Revisá los artículos habilitados.');
      const sincronizacionId = crypto.randomUUID();
      let response;
      try {
        response = await fetchImpl(config.url, {
          method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.token}` },
          body: JSON.stringify({ version: 1, tipo: 'catalogo-completo', sincronizacionId, generadoEn: iniciadoEn, productos }),
        });
      } catch {
        throw new Error('No se pudo sincronizar el catálogo. Verifique la conexión a Internet. Si hubo un corte durante el envío, consulte el catálogo online antes de reintentar.');
      }
      if (!response.ok) {
        if ([401, 403].includes(response.status)) throw new Error('La API rechazó la credencial de sincronización. Revisá la configuración del backend local.');
        if ([400, 422].includes(response.status)) throw new Error('La API rechazó el catálogo. Revisá los datos de los productos habilitados.');
        throw new Error(`La API del catálogo no pudo completar la sincronización (HTTP ${response.status}).`);
      }
      let resultado;
      try { resultado = await response.json(); } catch { throw new Error('La API devolvió una respuesta inválida. No se pudo confirmar la sincronización.'); }
      if (resultado.ok !== true || resultado.sincronizacionId !== sincronizacionId || resultado.productosProcesados !== productos.length) {
        throw new Error('La API no confirmó el catálogo completo enviado. Revisá el catálogo online antes de reintentar.');
      }
      estado = { iniciadoEn, finalizadoEn: new Date().toISOString(), exitoso: true,
        mensaje: 'Sincronización exitosa', productosEnviados: productos.length, sincronizacionId };
    } catch (e) {
      estado = { iniciadoEn, finalizadoEn: new Date().toISOString(), exitoso: false, mensaje: e.message };
    }
    try {
      await guardarEstado(estado);
      return estado;
    } catch {
      return { ...estado, advertencia: 'No se pudo guardar el estado en la computadora. Revisá los permisos de la carpeta backend/data.' };
    } finally { ejecutando = false; }
  }
  return { resumen, sincronizar };
}

module.exports = { crearCatalogoSyncService, productoPublico };
