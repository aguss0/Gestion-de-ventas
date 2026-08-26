const router = require("express").Router();
const prisma  = require("../utils/prisma");

// GET todas las comisiones con filtros opcionales
router.get("/", async (req, res) => {
  const { desde, hasta } = req.query;

  let pedidoIds = null;
  if (desde || hasta) {
    const pedidos = await prisma.pedido.findMany({
      where: {
        fecha: {
          ...(desde ? { gte: new Date(desde) } : {}),
          ...(hasta ? { lte: new Date(hasta + "T23:59:59") } : {}),
        }
      },
      select: { id: true },
    });
    pedidoIds = pedidos.map(p => p.id);
  }

  const where = pedidoIds !== null ? { pedidoId: { in: pedidoIds } } : {};

  const data = await prisma.comision.findMany({
    where,
    include: {
      pedido: {
        include: {
          cliente: true,
          detalle: { include: { articulo: true } },
        }
      },
      vendedor: true,
    },
  });
  res.json(data);
});

// GET resumen por vendedor con filtros opcionales
router.get("/resumen", async (req, res) => {
  const { desde, hasta } = req.query;

  let pedidoIds = null;
  if (desde || hasta) {
    const pedidos = await prisma.pedido.findMany({
      where: {
        fecha: {
          ...(desde ? { gte: new Date(desde) } : {}),
          ...(hasta ? { lte: new Date(hasta + "T23:59:59") } : {}),
        }
      },
      select: { id: true },
    });
    pedidoIds = pedidos.map(p => p.id);
  }

  const where = pedidoIds !== null ? { pedidoId: { in: pedidoIds } } : {};

  const comisiones = await prisma.comision.findMany({ where });

  // Sumar por persona, no por vendedor del pedido
  const resumen = {
    Miguel:  { vendedor: "Miguel",  total: 0, cobrado: 0, pendiente: 0 },
    Gerardo: { vendedor: "Gerardo", total: 0, cobrado: 0, pendiente: 0 },
    Turko:   { vendedor: "Turko",   total: 0, cobrado: 0, pendiente: 0 },
  };

  for (const c of comisiones) {
    if (c.comisionMiguel > 0) {
      resumen.Miguel.total += c.comisionMiguel;
      if (c.cobrado) resumen.Miguel.cobrado   += c.comisionMiguel;
      else           resumen.Miguel.pendiente += c.comisionMiguel;
    }
    if (c.comisionGerardo > 0) {
      resumen.Gerardo.total += c.comisionGerardo;
      if (c.cobrado) resumen.Gerardo.cobrado   += c.comisionGerardo;
      else           resumen.Gerardo.pendiente += c.comisionGerardo;
    }
    if (c.comisionTurko > 0) {
      resumen.Turko.total += c.comisionTurko;
      if (c.cobrado) resumen.Turko.cobrado   += c.comisionTurko;
      else           resumen.Turko.pendiente += c.comisionTurko;
    }
  }

  // Solo devolver los que tienen algo
  res.json(Object.values(resumen).filter(v => v.total > 0));
});

// PATCH marcar cobrado/pendiente
router.patch("/:id/cobrado", async (req, res) => {
  const { cobrado } = req.body;
  const data = await prisma.comision.update({
    where: { id: Number(req.params.id) },
    data:  {
      cobrado,
      fechaCobro: cobrado ? new Date() : null,
    },
  });
  res.json(data);
});

module.exports = router;