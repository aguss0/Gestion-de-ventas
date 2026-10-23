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

    // Si el monto supera el saldo, el excedente pasa a los próximos pedidos
    // con saldo del mismo cliente (del más antiguo al más nuevo)
    let excedente = Math.max(0, Number(monto) - pedido.saldo);
    const reparto = [];
    if (excedente > 0) {
      const otros = await tx.pedido.findMany({
        where: { clienteId: pedido.clienteId, activo: true, saldo: { gt: 0 }, id: { not: pedido.id } },
        orderBy: { nroOrden: "asc" },
      });
      for (const otro of otros) {
        if (excedente <= 0) break;
        const aplicado = Math.min(excedente, otro.saldo);
        reparto.push({ pedido: otro, monto: aplicado });
        excedente -= aplicado;
      }
    }

    // Lo que no se pudo repartir queda en el pedido original
    const montoOriginal = Number(monto) - reparto.reduce((s, r) => s + r.monto, 0);
    const aplicaciones = [{ pedido, monto: montoOriginal }, ...reparto];

    const pagos = [];
    for (const [i, a] of aplicaciones.entries()) {
      // Registrar pago
      const pago = await tx.pago.create({
        data: {
          pedidoId:  a.pedido.id,
          clienteId: Number(clienteId || pedido.clienteId),
          monto:     a.monto,
          metodo,
          fecha:     fecha ? new Date(fecha) : new Date(),
          observaciones: i === 0
            ? observaciones
            : [observaciones, `Excedente del pago del pedido #${pedido.nroOrden}`].filter(Boolean).join(" — "),
        },
      });

      // Actualizar saldo del pedido
      const nuevoTotalPagado = a.pedido.totalPagado + a.monto;
      await tx.pedido.update({
        where: { id: a.pedido.id },
        data: {
          totalPagado: nuevoTotalPagado,
          saldo:       Math.max(0, a.pedido.total - nuevoTotalPagado),
        },
      });

      pagos.push({ ...pago, nroOrden: a.pedido.nroOrden });
    }

    return { ...pagos[0], aplicados: pagos };
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