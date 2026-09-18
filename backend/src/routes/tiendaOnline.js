const router = require('express').Router();
const prisma = require('../utils/prisma');
const { publicacionOnline } = require('../utils/publicacionOnline');
const { crearCatalogoSyncService } = require('../services/catalogoSyncService');
const servicio = crearCatalogoSyncService({ prisma });

// Esta sección sólo se administra desde la computadora local.
router.use((req, res, next) => {
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) {
    return res.status(403).json({ error: 'Tienda Online se administra desde la computadora local.' });
  }
  const origin = req.get('origin');
  if (origin) {
    let host;
    try { host = new URL(origin).host; } catch { return res.status(403).json({ error: 'Origen no permitido.' }); }
    if (host !== req.get('host')) return res.status(403).json({ error: 'Origen no permitido.' });
  }
  next();
});

router.get('/estado', async (_req, res) => res.json(await servicio.resumen()));
router.get('/productos', async (_req, res) => {
  const articulos = await prisma.articulo.findMany({ orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true, codigo: true, precio: true, precioOnline: true, activo: true, publicarOnline: true,
      categoriaOnline: true, imagenUrl: true, presentacion: true, manejaStock: true,
      dietetica: { select: { categoria: true } }, descartable: { select: { categoria: true } } } });
  res.json(articulos.map(({ dietetica, descartable, ...a }) => ({ ...a,
    linea: descartable ? 'Descartables' : dietetica ? 'MF' : a.manejaStock ? 'Dietética' : 'Laurens',
    categoria: a.categoriaOnline || dietetica?.categoria || descartable?.categoria || null })));
});
router.patch('/productos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Artículo inválido.' });
  const data = publicacionOnline(req.body, req);
  if (!Object.keys(data).length) return res.status(400).json({ error: 'Indicá una propiedad de publicación.' });
  try { res.json(await prisma.articulo.update({ where: { id }, data })); }
  catch (e) { if (e.code === 'P2025') return res.status(404).json({ error: 'Artículo no encontrado.' }); throw e; }
});
router.post('/sincronizar', async (_req, res) => {
  const resultado = await servicio.sincronizar();
  res.status(resultado.exitoso ? 200 : 502).json(resultado);
});

module.exports = router;
