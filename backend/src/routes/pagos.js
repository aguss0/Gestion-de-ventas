const router = require("express").Router();
const prisma = require("../utils/prisma");

// GET pagos (todos o por pedido)
router.get("/", async (req, res) => {
  const { pedidoId } = req.query;
  const data = await prisma.pago.findMany({
    where: pedidoId ? { pedidoId: Number(pedidoId) } : {},
    include: { pedido: { include: { cliente: true } } },
    orderBy: { fecha: "desc" },
  });
  res.json(data);
});

// POST registrar pago
router.post("/", async (req, res) => {
  const { pedidoId, clienteId, monto, metodo, fecha, observaciones } = req.body;
  if (!pedidoId || !monto || !metodo) {
    return res.status(400).json({ error: "Pedido, monto y método requeridos" });
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({ where: { id: Number(pedidoId) } });
    if (!pedido) throw { status: 404, message: "Pedido no encontrado" };

    // Registrar pago
    const pago = await tx.pago.create({
      data: {
        pedidoId:  Number(pedidoId),
        clienteId: Number(clienteId || pedido.clienteId),
        monto:     Number(monto),
        metodo,
        fecha:     fecha ? new Date(fecha) : new Date(),
        observaciones,
      },
    });

    // Actualizar saldo del pedido
    const nuevoTotalPagado = pedido.totalPagado + Number(monto);
    await tx.pedido.update({
      where: { id: pedido.id },
      data: {
        totalPagado: nuevoTotalPagado,
        saldo:       Math.max(0, pedido.total - nuevoTotalPagado),
      },
    });

    return pago;
  });

  res.status(201).json(resultado);
});

// DELETE pago (también revierte el saldo)
router.delete("/:id", async (req, res) => {
  await prisma.$transaction(async (tx) => {
    const pago = await tx.pago.findUnique({ where: { id: Number(req.params.id) } });
    if (!pago) throw { status: 404, message: "Pago no encontrado" };

    const pedido = await tx.pedido.findUnique({ where: { id: pago.pedidoId } });
    await tx.pago.delete({ where: { id: pago.id } });
    await tx.pedido.update({
      where: { id: pedido.id },
      data: {
        totalPagado: pedido.totalPagado - pago.monto,
        saldo:       pedido.saldo + pago.monto,
      },
    });
  });
  res.json({ mensaje: "Pago eliminado" });
});

module.exports = router;