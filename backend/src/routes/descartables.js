const router = require('express').Router();
const multer = require('multer');
const prisma = require('../utils/prisma');
const { leerLista, unidadesDe } = require('../utils/descartablesPdf');
const { preciosVentaDescartable } = require('../utils/costosDescartables');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const fallo = (message) => Object.assign(new Error(message), { status: 400 });

router.get('/', async (_req, res) => {
  res.json(await prisma.descartable.findMany({ orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }], include: { articulos: true } }));
});

router.get('/resumen', async (req, res) => {
  const { desde, hasta } = req.query;
  for (const f of [desde, hasta]) {
    if (f && (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !Number.isFinite(Date.parse(f)))) throw fallo('Fecha inválida');
  }
  if (desde && hasta && desde > hasta) throw fallo('El período de fechas es inválido');
  const filas = await prisma.detallePedido.findMany({
    where: {
      articulo: { descartableId: { not: null } },
      pedido: { activo: true, fecha: { ...(desde ? { gte: new Date(desde + 'T00:00:00') } : {}), ...(hasta ? { lte: new Date(hasta + 'T23:59:59.999') } : {}) } },
    },
    include: { articulo: true },
  });
  res.json({ ventas: filas.reduce((s, d) => s + d.subtotal, 0), pedidos: new Set(filas.map(d => d.pedidoId)).size,
    unidades: filas.filter(d => d.articulo.presentacion === 'unidad').reduce((s, d) => s + d.cantidad - d.cantidadFaltante, 0),
    bultos: filas.filter(d => d.articulo.presentacion === 'bulto').reduce((s, d) => s + d.cantidad - d.cantidadFaltante, 0) });
});

router.post('/importar', upload.single('archivo'), async (req, res) => {
  if (!req.file || !req.file.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw fallo('Seleccioná un archivo PDF válido');
  let lista;
  try { lista = await leerLista(req.file.buffer); } catch (e) { throw fallo(e.message); }
  if (req.query.preview === '1') return res.json(lista);
  const resultado = await prisma.$transaction(async tx => {
    const existentes = new Map((await tx.descartable.findMany()).map(a => [a.codigo, a]));
    let creados = 0; let actualizados = 0;
    for (const a of lista.articulos) {
      const previo = existentes.get(a.codigo);
      if (previo) {
        const data = { ...a };
        if (previo.unidadesManual) delete data.unidadesBulto;
        await tx.descartable.update({ where: { id: previo.id }, data });
        actualizados++;
      } else { await tx.descartable.create({ data: a }); creados++; }
    }
    return { creados, actualizados };
  }, { timeout: 120000 });
  res.json({ ...resultado, porRevisar: await prisma.descartable.count({ where: { unidadesBulto: null } }) });
});

router.patch('/:id/unidades', async (req, res) => {
  const unidadesBulto = Number(req.body.unidadesBulto);
  if (!Number.isSafeInteger(unidadesBulto) || unidadesBulto < 1 || unidadesBulto > 10000000) throw fallo('Indicá una cantidad entera de unidades por bulto mayor a cero');
  res.json(await prisma.descartable.update({ where: { id: Number(req.params.id) }, data: { unidadesBulto, unidadesManual: true } }));
});

// Reprocesar solo pendientes: no tocar correcciones manuales ni precios de venta.
router.post('/completar-unidades', async (_req, res) => {
  const resultado = await prisma.$transaction(async tx => {
    const pendientes = await tx.descartable.findMany({ where: { unidadesBulto: null, unidadesManual: false } });
    let completados = 0;
    for (const a of pendientes) {
      const unidadesBulto = unidadesDe(a.nombre);
      if (unidadesBulto) {
        const cambio = await tx.descartable.updateMany({ where: { id: a.id, unidadesBulto: null, unidadesManual: false }, data: { unidadesBulto } });
        completados += cambio.count;
      }
    }
    return { completados, pendientes: await tx.descartable.count({ where: { unidadesBulto: null } }) };
  }, { timeout: 120000 });
  res.json(resultado);
});

// Publicación explícita: la importación de costos y la exportación PDF no alteran los precios de pedidos.
router.post('/precios', async (req, res) => {
  const { ids, recargoUnidad, recargoBulto } = req.body;
  if (!Array.isArray(ids) || !ids.length || ids.some(id => !Number.isSafeInteger(id) || id < 1)) throw fallo('Seleccioná artículos válidos');
  const ru = Number(recargoUnidad), rb = Number(recargoBulto);
  if ([ru, rb].some(n => !Number.isFinite(n) || n < 0 || n > 10000)) throw fallo('Los recargos deben estar entre 0 y 10000%');
  const datos = await prisma.$transaction(async tx => {
    const productos = await tx.descartable.findMany({ where: { id: { in: [...new Set(ids)] } } });
    if (productos.length !== new Set(ids).size) throw fallo('Hay artículos que ya no existen');
    for (const a of productos) {
      let precios;
      try { precios = preciosVentaDescartable(a, ru, rb); } catch (e) { throw fallo(e.message); }
      for (const presentacion of ['unidad', 'bulto']) {
        const precio = precios[presentacion];
        const data = { nombre: `${a.codigo} - ${a.nombre} (${presentacion})`, precio, unidadCaja: presentacion === 'bulto' ? `${a.unidadesBulto} unidades` : '1 unidad', unidadMedida: presentacion };
        await tx.articulo.upsert({ where: { descartableId_presentacion: { descartableId: a.id, presentacion } },
          create: { ...data, descartableId: a.id, presentacion }, update: data });
      }
    }
    return productos.length;
  }, { timeout: 120000 });
  res.json({ actualizados: datos });
});

router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: 'El archivo supera el límite de 20 MB o no es válido' });
  next(err);
});
module.exports = router;
