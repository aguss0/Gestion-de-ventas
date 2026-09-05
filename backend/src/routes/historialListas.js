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
      grupo: item.grupo == null ? null : texto(item.grupo, 'Categoría', 30),
      articuloId: item.articuloId == null ? null : validarNumero(item.articuloId, 'Artículo'),
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
  if (req.query.tipo && !['todos', 'general', 'descartables', 'mf'].includes(req.query.tipo)) throw fallo('Tipo de lista inválido');
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
  if (!['general', 'descartables', 'mf'].includes(tipo)) throw fallo('Tipo de lista inválido');
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
  const actualizados = await prisma.$transaction(async tx => {
    const grupoDe = item => item.grupo || (dato.tipo === 'mf' ? 'mf' : 'descartables');
    const codigosDesc = items.filter(i => grupoDe(i) === 'descartables').map(i => i.codigo).filter(Boolean);
    const codigosMf = items.filter(i => grupoDe(i) === 'mf').map(i => i.codigo).filter(Boolean);
    const idsDirectos = items.filter(i => ['snacks', 'frutos_secos'].includes(grupoDe(i))).map(i => i.articuloId).filter(Boolean);
    const [descartables, mf, directos] = await Promise.all([
      tx.descartable.findMany({ where: { codigo: { in: codigosDesc } } }),
      tx.dietetica.findMany({ where: { codigo: { in: codigosMf } } }),
      tx.articulo.findMany({ where: { id: { in: idsDirectos } } }),
    ]);
    const mapas = {
      descartables: new Map(descartables.map(a => [a.codigo, a])),
      mf: new Map(mf.map(a => [a.codigo, a])),
      directos: new Map(directos.map(a => [a.id, a])),
    };
    let cantidad = 0;
    for (const item of items) {
      const grupo = grupoDe(item);
      if (['snacks', 'frutos_secos'].includes(grupo)) {
        const articulo = mapas.directos.get(item.articuloId);
        const grupoCorrecto = articulo && articulo.descartableId == null && articulo.dieteticaId == null && Boolean(articulo.manejaStock) === (grupo === 'frutos_secos');
        if (!grupoCorrecto) throw fallo(`El artículo ${item.nombre} ya no existe en su catálogo`);
        await tx.articulo.update({ where: { id: articulo.id }, data: { precio: item.precioUnidad, activo: true } });
        cantidad++;
        continue;
      }
      if (!item.codigo) throw fallo(`El artículo ${item.nombre} no tiene código`);
      const origen = mapas[grupo]?.get(item.codigo);
      if (!origen) throw fallo(`El artículo ${item.nombre} ya no existe en su catálogo`);
      for (const [presentacion, precio] of [['unidad', item.precioUnidad], ['bulto', item.precioBulto]]) {
        if (precio == null) continue;
        const data = grupo === 'descartables'
          ? { nombre: `${origen.codigo} - ${origen.nombre} (${presentacion})`, precio, unidadCaja: presentacion === 'bulto' ? `${origen.unidadesBulto} unidades` : '1 unidad', unidadMedida: presentacion }
          : { nombre: `${origen.nombre} (${presentacion === 'unidad' ? 'unidad/kg' : 'bulto ' + origen.presentacion})`, precio, unidadCaja: presentacion === 'bulto' ? origen.presentacion : 'Unidad/kg según lista', unidadMedida: presentacion };
        if (grupo === 'descartables') {
          await tx.articulo.upsert({ where: { descartableId_presentacion: { descartableId: origen.id, presentacion } }, create: { ...data, descartableId: origen.id, presentacion }, update: { ...data, activo: true } });
        } else {
          await tx.articulo.upsert({ where: { dieteticaId_presentacion: { dieteticaId: origen.id, presentacion } }, create: { ...data, dieteticaId: origen.id, presentacion }, update: { ...data, activo: true } });
        }
        cantidad++;
      }
    }
    return cantidad;
  });
  const primerGrupo = items[0].grupo || (dato.tipo === 'mf' ? 'mf' : 'descartables');
  const catalogos = { snacks: 'papas', descartables: 'descartables', mf: 'mf', frutos_secos: 'dietetica' };
  res.json({ actualizados, catalogo: catalogos[primerGrupo] });
});

module.exports = router;
