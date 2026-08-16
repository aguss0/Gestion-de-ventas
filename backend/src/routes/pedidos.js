const router = require("express").Router();
const prisma = require("../utils/prisma");

// GET todos los pedidos
router.get("/", async (_req, res) => {
  const data = await prisma.pedido.findMany({
    include: {
      cliente:  { select: { id: true, nombre: true } },
      vendedor: { select: { id: true, nombre: true } },
      detalle:  { include: { articulo: true } },
      pagos:    true,
    },
    orderBy: { nroOrden: "desc" },
  });
  res.json(data);
});

// GET un pedido
router.get("/:id", async (req, res) => {
  const pedido = await prisma.pedido.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      cliente:  true,
      vendedor: true,
      detalle:  { include: { articulo: true } },
      pagos:    true,
      comision: true,
    },
  });
  if (!pedido) return res.status(404).json({ error: "Pedido no encontrado" });
  res.json(pedido);
});

// POST crear pedido con detalle
router.post("/", async (req, res) => {
  const { clienteId, vendedorId, fecha, items, observaciones } = req.body;
  if (!clienteId || !items?.length) {
    return res.status(400).json({ error: "Cliente e items requeridos" });
  }

  const total    = items.reduce((s, i) => s + (i.precio * i.cantidad), 0);
  const ultimo   = await prisma.pedido.findFirst({ orderBy: { nroOrden: "desc" } });
  const nroOrden = (ultimo?.nroOrden || 0) + 1;

  const pedido = await prisma.$transaction(async (tx) => {
    const p = await tx.pedido.create({
      data: {
        nroOrden,
        clienteId:  Number(clienteId),
        vendedorId: vendedorId ? Number(vendedorId) : null,
        fecha:      fecha ? new Date(fecha) : new Date(),
        total,
        saldo:      total,
        observaciones,
      },
    });

    await tx.detallePedido.createMany({
    data: items.map(i => ({
      pedidoId:     p.id,
      articuloId:   Number(i.articuloId),
      cantidad:     Number(i.cantidad),
      precio:       Number(i.precio),
      subtotal:     Number(i.precio) * Number(i.cantidad),
      observaciones: i.observaciones || null,
    })),
});

    return p;
  });

  const completo = await prisma.pedido.findUnique({
    where:   { id: pedido.id },
    include: { cliente: true, vendedor: true, detalle: { include: { articulo: true } } },
  });

  res.status(201).json(completo);
});

// PATCH editar observaciones o vendedor
router.patch("/:id", async (req, res) => {
  const { observaciones, vendedorId, activo } = req.body;
  const data = await prisma.pedido.update({
    where: { id: Number(req.params.id) },
    data:  { observaciones, vendedorId: vendedorId ? Number(vendedorId) : undefined, activo },
  });
  res.json(data);
});

// PATCH marcar faltante en un item del detalle
router.patch("/detalle/:detalleId/faltante", async (req, res) => {
  const { cantidadFaltante } = req.body;
  const detalleId = Number(req.params.detalleId);

  if (cantidadFaltante === undefined || cantidadFaltante < 0) {
    return res.status(400).json({ error: "Cantidad faltante inválida" });
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const detalle = await tx.detallePedido.findUnique({ where: { id: detalleId } });
    if (!detalle) throw { status: 404, message: "Detalle no encontrado" };

    const cantFaltante  = Math.min(Number(cantidadFaltante), detalle.cantidad);
    const cantEntregada = detalle.cantidad - cantFaltante;
    const nuevoSubtotal = detalle.precio * cantEntregada;
    const diferencia    = detalle.subtotal - nuevoSubtotal;

    // Actualizar detalle
    const detalleActualizado = await tx.detallePedido.update({
      where: { id: detalleId },
      data: {
        faltante:         cantFaltante > 0,
        cantidadFaltante: cantFaltante,
        subtotal:         nuevoSubtotal,
      },
    });

    // Ajustar total del pedido
    const pedido = await tx.pedido.findUnique({ where: { id: detalle.pedidoId } });
    await tx.pedido.update({
      where: { id: detalle.pedidoId },
      data: {
        total: pedido.total - diferencia,
        saldo: Math.max(0, pedido.saldo - diferencia),
      },
    });

    return detalleActualizado;
  });

  res.json(resultado);
});

// DELETE eliminar item del detalle
router.delete("/detalle/:detalleId", async (req, res) => {
  const detalleId = Number(req.params.detalleId);

  await prisma.$transaction(async (tx) => {
    const detalle = await tx.detallePedido.findUnique({ where: { id: detalleId } });
    if (!detalle) throw { status: 404, message: "Detalle no encontrado" };

    // Restar el subtotal del pedido
    const pedido = await tx.pedido.findUnique({ where: { id: detalle.pedidoId } });
    await tx.pedido.update({
      where: { id: detalle.pedidoId },
      data: {
        total: pedido.total - detalle.subtotal,
        saldo: Math.max(0, pedido.saldo - detalle.subtotal),
      },
    });

    await tx.detallePedido.delete({ where: { id: detalleId } });
  });

  res.json({ mensaje: "Artículo eliminado del pedido" });
});

// DELETE lógico pedido completo
router.delete("/:id", async (req, res) => {
  await prisma.pedido.update({
    where: { id: Number(req.params.id) },
    data:  { activo: false },
  });
  res.json({ mensaje: "Pedido eliminado" });
});

module.exports = router;