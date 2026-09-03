const router = require('express').Router();
const multer = require('multer');
const prisma = require('../utils/prisma');
const { leerExcel } = require('../utils/dieteticaExcel');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const fallo = (message) => Object.assign(new Error(message), { status: 400 });

router.get('/', async (_req, res) => {
  res.json(await prisma.dietetica.findMany({ orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }], include: { articulos: true } }));
});

router.get('/resumen', async (req, res) => {
  const { desde, hasta } = req.query;
  for (const f of [desde, hasta]) {
    if (f && (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !Number.isFinite(Date.parse(f)))) throw fallo('Fecha inválida');
  }
  if (desde && hasta && desde > hasta) throw fallo('El período de fechas es inválido');
  const filas = await prisma.detallePedido.findMany({
    where: {
      articulo: { dieteticaId: { not: null } },
      pedido: { activo: true, fecha: { ...(desde ? { gte: new Date(desde + 'T00:00:00') } : {}), ...(hasta ? { lte: new Date(hasta + 'T23:59:59.999') } : {}) } },
    },
    include: { articulo: true },
  });
  res.json({ ventas: filas.reduce((s, d) => s + d.subtotal, 0), pedidos: new Set(filas.map(d => d.pedidoId)).size,
    unidades: filas.filter(d => d.articulo.presentacion === 'unidad').reduce((s, d) => s + d.cantidad - d.cantidadFaltante, 0),
    bultos: filas.filter(d => d.articulo.presentacion === 'bulto').reduce((s, d) => s + d.cantidad - d.cantidadFaltante, 0) });
});

router.post('/importar', upload.single('archivo'), async (req, res) => {
  if (!req.file || !/\.xlsx$/i.test(req.file.originalname) || req.file.buffer.subarray(0, 2).toString() !== 'PK') throw fallo('Seleccioná un archivo Excel .xlsx válido');
  let lista;
  try { lista = leerExcel(req.file.buffer, req.body.tipoBloqueFinal || 'pendiente'); } catch (e) { throw fallo(e.message); }
  if (req.query.preview === '1') return res.json(lista);
  const resultado = await prisma.$transaction(async tx => {
    const existentes = new Map((await tx.dietetica.findMany()).map(a => [a.codigo, a]));
    let creados = 0; let actualizados = 0;
    for (const a of lista.articulos) {
      const previo = existentes.get(a.codigo);
      if (previo) {
        const data = { ...a };
        await tx.dietetica.update({ where: { id: previo.id }, data });
        actualizados++;
      } else { await tx.dietetica.create({ data: a }); creados++; }
    }
    return { creados, actualizados };
  }, { timeout: 120000 });
  res.json({ ...resultado, porRevisar: await prisma.dietetica.count({ where: { tipoBulto: 'pendiente' } }) });
});

// Publicación explícita: la importación de costos y la exportación PDF no alteran los precios de pedidos.
router.post('/precios', async (req, res) => {
  const { ids, recargoUnidad, recargoBulto } = req.body;
  if (!Array.isArray(ids) || !ids.length || ids.some(id => !Number.isSafeInteger(id) || id < 1)) throw fallo('Seleccioná artículos válidos');
  const ru = Number(recargoUnidad), rb = Number(recargoBulto);
  if ([ru, rb].some(n => !Number.isFinite(n) || n < 0 || n > 10000)) throw fallo('Los recargos deben estar entre 0 y 10000%');
  const datos = await prisma.$transaction(async tx => {
    const productos = await tx.dietetica.findMany({ where: { id: { in: [...new Set(ids)] } } });
    if (productos.length !== new Set(ids).size) throw fallo('Hay artículos que ya no existen');
    for (const a of productos) {
      if (a.sinStock || (a.costoUnidad == null && a.costoBulto == null)) throw fallo(`No hay precios disponibles para ${a.nombre}`);
      for (const presentacion of ['unidad', 'bulto']) {
        const costo = presentacion === 'unidad' ? a.costoUnidad : a.costoBulto;
        if (costo == null) {
          await tx.articulo.updateMany({ where: { dieteticaId: a.id, presentacion }, data: { activo: false } });
          continue;
        }
        const precio = Math.round(costo * (1 + (presentacion === 'unidad' ? ru : rb) / 100) * 100) / 100;
        const data = { nombre: `${a.nombre} (${presentacion === 'unidad' ? 'unidad/kg' : 'bulto ' + a.presentacion})`, precio, unidadCaja: presentacion === 'bulto' ? a.presentacion : 'Unidad/kg según lista', unidadMedida: presentacion };
        await tx.articulo.upsert({ where: { dieteticaId_presentacion: { dieteticaId: a.id, presentacion } },
          create: { ...data, dieteticaId: a.id, presentacion }, update: data });
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
