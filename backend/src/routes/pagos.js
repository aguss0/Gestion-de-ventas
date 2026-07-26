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
    // Verificar pedido
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

    // Actualizar totales del pedido
    const nuevoTotalPagado = pedido.totalPagado + Number(monto);
    const nuevoSaldo       = pedido.total - nuevoTotalPagado;

    await tx.pedido.update({
      where: { id: pedido.id },
      data: {
        totalPagado: nuevoTotalPagado,
        saldo:       nuevoSaldo < 0 ? 0 : nuevoSaldo,
      },
    });

    // Calcular comisión si el pedido tiene vendedor
    if (pedido.vendedorId) {
      const vendedor = await tx.vendedor.findUnique({ where: { id: pedido.vendedorId } });
      const importe  = pedido.total;
      const pct      = vendedor?.comisionPct || 6;

      // Lógica de comisiones según el Excel
      // Miguel: 6%, Gerardo: 4%, Turko: 4% + plus si es Echeq
      let comisionMiguel  = 0;
      let comisionGerardo = 0;
      let comisionTurko   = 0;
      let plusTurko       = 0;

      const nombre = vendedor?.nombre?.toLowerCase() || "";
      if (nombre.includes("miguel")) {
        comisionMiguel = importe * 0.06;
      } else if (nombre.includes("gerardo")) {
        comisionMiguel  = importe * 0.06;
        comisionGerardo = importe * 0.04;
      } else if (nombre.includes("turko")) {
        comisionMiguel = importe * 0.06;
        comisionTurko  = importe * 0.04;
        if (metodo === "Echeq") {
          plusTurko = importe * 0.10;
        }
      }

      // Upsert comisión
      await tx.comision.upsert({
        where:  { pedidoId: pedido.id },
        update: { comisionMiguel, comisionGerardo, comisionTurko, plusTurko, metodo },
        create: {
          pedidoId:   pedido.id,
          vendedorId: pedido.vendedorId,
          importe,
          comisionMiguel, comisionGerardo, comisionTurko, plusTurko,
          metodo,
        },
      });
    }

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