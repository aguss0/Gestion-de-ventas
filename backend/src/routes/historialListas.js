const router = require('express').Router();
const prisma = require('../utils/prisma');
const fallo = message => Object.assign(new Error(message), { status: 400 });
const contacto = { vendedor: 'Miguel Sanchez', telefono: '3512590512', email: 'j.miguel.sanchez.23@gmail.com' };

function validarNumero(valor, nombre, admiteNull = false) {
  if (admiteNull && valor == null) return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0 || numero > 1e12) throw fallo(`${nombre} inválido`);
  return Math.round((numero + Number.EPSILON * Math.max(1, numero)) * 100) / 100;
}
function validarItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 5000) throw fallo('La lista debe contener entre 1 y 5000 artículos');
  return items.map((item, i) => {
    const texto = (valor, nombre, max = 500) => {
      const resultado = String(valor ?? '').trim();
      if (!resultado || resultado.length > max) throw fallo(`${nombre} inválido en el artículo ${i + 1}`);
      return resultado;
    };
    return {
      codigo: item.codigo == null || item.codigo === '' ? null : texto(item.codigo, 'Código', 100),
      nombre: texto(item.nombre, 'Nombre'),
      presentacion: item.presentacion == null || item.presentacion === '' ? null : texto(item.presentacion, 'Presentación', 100),
      unidadesBulto: item.unidadesBulto == null ? null : validarNumero(item.unidadesBulto, 'Unidades por bulto'),
      precioUnidad: validarNumero(item.precioUnidad, 'Precio unitario', true),
      precioBulto: validarNumero(item.precioBulto, 'Precio por bulto', true),
    };
  });
}

router.get('/', async (req, res) => {
  if (req.query.tipo && !['todos', 'descartables', 'mf'].includes(req.query.tipo)) throw fallo('Tipo de lista inválido');
  const where = req.query.tipo && req.query.tipo !== 'todos' ? { tipo: req.query.tipo } : {};
  const datos = await prisma.historialListaPrecio.findMany({ where, orderBy: { creadoEn: 'desc' } });
  res.json(datos.map(({ contenido, ...dato }) => dato));
});
router.get('/:id', async (req, res) => {
  const dato = await prisma.historialListaPrecio.findUnique({ where: { id: Number(req.params.id) } });
  if (!dato) return res.status(404).json({ error: 'Lista no encontrada' });
  const { contenido, ...resto } = dato;
  res.json({ ...resto, items: JSON.parse(contenido) });
});
router.post('/', async (req, res) => {
  const tipo = String(req.body.tipo || '').toLowerCase();
  if (!['descartables', 'mf'].includes(tipo)) throw fallo('Tipo de lista inválido');
  const recargoUnidad = validarNumero(req.body.recargoUnidad, 'Recargo por unidad');
  const recargoBulto = validarNumero(req.body.recargoBulto, 'Recargo por bulto');
  const items = validarItems(req.body.items);
  const dato = await prisma.historialListaPrecio.create({ data: { tipo, recargoUnidad, recargoBulto, cantidad: items.length, contenido: JSON.stringify(items), ...contacto } });
  res.status(201).json({ ...dato, contenido: undefined, items });
});

router.post('/:id/precios', async (req, res) => {
  const dato = await prisma.historialListaPrecio.findUnique({ where: { id: Number(req.params.id) } });
  if (!dato) return res.status(404).json({ error: 'Lista no encontrada' });
  const items = validarItems(JSON.parse(dato.contenido));
  const codigos = [...new Set(items.map(item => item.codigo).filter(Boolean))];
  if (codigos.length !== items.length) throw fallo('La lista contiene artículos sin código y no se puede vincular al catálogo');
  const actualizados = await prisma.$transaction(async tx => {
    const origenes = dato.tipo === 'descartables'
      ? await tx.descartable.findMany({ where: { codigo: { in: codigos } } })
      : await tx.dietetica.findMany({ where: { codigo: { in: codigos } } });
    const porCodigo = new Map(origenes.map(origen => [origen.codigo, origen]));
    const faltantes = codigos.filter(codigo => !porCodigo.has(codigo));
    if (faltantes.length) throw fallo(`Hay ${faltantes.length} artículos de la lista que ya no existen en el catálogo`);
    let cantidad = 0;
    for (const item of items) {
      const origen = porCodigo.get(item.codigo);
      for (const [presentacion, precio] of [['unidad', item.precioUnidad], ['bulto', item.precioBulto]]) {
        if (precio == null) continue;
        const data = dato.tipo === 'descartables'
          ? { nombre: `${origen.codigo} - ${origen.nombre} (${presentacion})`, precio, unidadCaja: presentacion === 'bulto' ? `${origen.unidadesBulto} unidades` : '1 unidad', unidadMedida: presentacion }
          : { nombre: `${origen.nombre} (${presentacion === 'unidad' ? 'unidad/kg' : 'bulto ' + origen.presentacion})`, precio, unidadCaja: presentacion === 'bulto' ? origen.presentacion : 'Unidad/kg según lista', unidadMedida: presentacion };
        if (dato.tipo === 'descartables') {
          await tx.articulo.upsert({ where: { descartableId_presentacion: { descartableId: origen.id, presentacion } }, create: { ...data, descartableId: origen.id, presentacion }, update: { ...data, activo: true } });
        } else {
          await tx.articulo.upsert({ where: { dieteticaId_presentacion: { dieteticaId: origen.id, presentacion } }, create: { ...data, dieteticaId: origen.id, presentacion }, update: { ...data, activo: true } });
        }
        cantidad++;
      }
    }
    return cantidad;
  });
  res.json({ actualizados, catalogo: dato.tipo });
});

module.exports = router;
