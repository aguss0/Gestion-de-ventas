const router = require("express").Router();
const prisma = require("../utils/prisma");

function filtroFecha(desde, hasta) {
  if (!desde && !hasta) return {};
  return {
    fecha: {
      ...(desde ? { gte: new Date(desde) } : {}),
      ...(hasta ? { lte: new Date(hasta + "T23:59:59") } : {}),
    },
  };
}

// Una fila por vendedor y pedido. Funciona también con vendedores creados después.
router.get("/", async (req, res) => {
  const { desde, hasta } = req.query;
  const data = await prisma.pedidoComisionVendedor.findMany({
    where: {
      monto: { gt: 0 },
      pedido: { is: { activo: true, ...filtroFecha(desde, hasta) } },
    },
    include: {
      pedido: {
        include: {
          cliente: true,
          detalle: { include: { articulo: true } },
        },
      },
      vendedor: true,
    },
    orderBy: [{ pedido: { nroOrden: "desc" } }, { vendedor: { nombre: "asc" } }],
  });
  res.json(data);
});

router.get("/resumen", async (req, res) => {
  const { desde, hasta } = req.query;
  const comisiones = await prisma.pedidoComisionVendedor.findMany({
    where: {
      monto: { gt: 0 },
      pedido: { is: { activo: true, ...filtroFecha(desde, hasta) } },
    },
    include: { vendedor: { select: { id: true, nombre: true } } },
  });

  const resumen = new Map();
  for (const comision of comisiones) {
    if (!resumen.has(comision.vendedorId)) {
      resumen.set(comision.vendedorId, {
        vendedorId: comision.vendedorId,
        vendedor: comision.vendedor.nombre,
        total: 0,
        cobrado: 0,
        pendiente: 0,
      });
    }
    const fila = resumen.get(comision.vendedorId);
    fila.total += comision.monto;
    if (comision.cobrado) fila.cobrado += comision.monto;
    else fila.pendiente += comision.monto;
  }
  res.json([...resumen.values()].sort((a, b) => a.vendedor.localeCompare(b.vendedor)));
});

router.delete("/huerfanas", async (_req, res) => {
  const resultado = await prisma.pedidoComisionVendedor.deleteMany({
    where: { pedido: { is: { activo: false } } },
  });
  res.json({
    eliminadas: resultado.count,
    mensaje: resultado.count
      ? `Se eliminaron ${resultado.count} comisión(es) sin pedido activo`
      : "No se encontraron comisiones para limpiar",
  });
});

router.patch("/:id/cobrado", async (req, res) => {
  const cobrado = Boolean(req.body.cobrado);
  const data = await prisma.pedidoComisionVendedor.update({
    where: { id: Number(req.params.id) },
    data: { cobrado, fechaCobro: cobrado ? new Date() : null },
  });
  res.json(data);
});

module.exports = router;
