const router = require("express").Router();
const prisma = require("../utils/prisma");

// GET estado de cuenta general
router.get("/", async (_req, res) => {
  const pedidos = await prisma.pedido.findMany({
    where:   { activo: true },
    include: {
      cliente:  { select: { nombre: true } },
      vendedor: { select: { nombre: true } },
      pagos:    true,
    },
    orderBy: { nroOrden: "asc" },
  });

  const data = pedidos.map(p => ({
    id:          p.id,
    nroOrden:    p.nroOrden,
    fecha:       p.fecha,
    cliente:     p.cliente?.nombre,
    vendedor:    p.vendedor?.nombre,
    totalVenta:  p.total,
    pagado:      p.totalPagado,
    saldo:       p.saldo,
    observaciones: p.observaciones,
  }));

  res.json(data);
});

// GET resumen por cliente
router.get("/cliente/:clienteId", async (req, res) => {
  const pedidos = await prisma.pedido.findMany({
    where:   { clienteId: Number(req.params.clienteId), activo: true },
    include: { pagos: true },
    orderBy: { nroOrden: "asc" },
  });

  const resumen = {
    totalVentas:  pedidos.reduce((s, p) => s + p.total, 0),
    totalPagado:  pedidos.reduce((s, p) => s + p.totalPagado, 0),
    saldoPendiente: pedidos.reduce((s, p) => s + p.saldo, 0),
    pedidos,
  };

  res.json(resumen);
});

module.exports = router;