const router = require("express").Router();
const prisma = require("../utils/prisma");

function filtroCategoria(categoria) {
  if (!categoria || categoria === 'todas') return {};
  const filtros = {
    papas: { descartableId: null, dieteticaId: null, manejaStock: false },
    descartables: { descartableId: { not: null } },
    mf: { dieteticaId: { not: null } },
    dietetica: { descartableId: null, dieteticaId: null, manejaStock: true },
  };
  if (!Object.hasOwn(filtros, categoria)) throw Object.assign(new Error('Categoría inválida'), { status: 400 });
  return { detalle: { some: { articulo: filtros[categoria] } } };
}
const detalleCategorias = { select: { articulo: { select: { descartableId: true, dieteticaId: true, manejaStock: true } } } };
const categoriasDe = p => [...new Set(p.detalle.map(d => d.articulo.dieteticaId != null ? 'mf' : d.articulo.descartableId != null ? 'descartables' : d.articulo.manejaStock ? 'dietetica' : 'papas'))];

// GET estado de cuenta general
router.get("/", async (req, res) => {
  const pedidos = await prisma.pedido.findMany({
    where:   { activo: true, ...filtroCategoria(req.query.categoria) },
    include: {
      cliente:  { select: { nombre: true } },
      vendedor: { select: { nombre: true } },
      pagos: {
        orderBy: { fecha: "asc" },
        select: { id: true, fecha: true, metodo: true, monto: true, observaciones: true },
      },
      detalle: detalleCategorias,
    },
    orderBy: { nroOrden: "asc" },
  });

  const data = pedidos.map(p => ({
    id:          p.id,
    nroOrden:    p.nroOrden,
    fecha:       p.fecha,
    cliente:     p.cliente?.nombre,
    clienteId:   p.clienteId,
    categorias:  categoriasDe(p),
    vendedor:    p.vendedor?.nombre,
    totalVenta:  p.total,
    pagado:      p.totalPagado,
    saldo:       p.saldo,
    observaciones: p.observaciones,
    pagos:       p.pagos,
  }));

  res.json(data);
});

// GET resumen por cliente
router.get("/cliente/:clienteId", async (req, res) => {
  const pedidos = await prisma.pedido.findMany({
    where:   { clienteId: Number(req.params.clienteId), activo: true, ...filtroCategoria(req.query.categoria) },
    include: { pagos: true, detalle: detalleCategorias },
    orderBy: { nroOrden: "asc" },
  });

  const resumen = {
    totalVentas:  pedidos.reduce((s, p) => s + p.total, 0),
    totalPagado:  pedidos.reduce((s, p) => s + p.totalPagado, 0),
    saldoPendiente: pedidos.reduce((s, p) => s + p.saldo, 0),
    pedidos: pedidos.map(({ detalle, ...p }) => ({ ...p, categorias: categoriasDe({ detalle }) })),
  };

  res.json(resumen);
});

module.exports = router;
