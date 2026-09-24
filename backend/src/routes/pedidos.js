const router = require("express").Router();
const prisma = require("../utils/prisma");
const { actualizarComisionPedido } = require("../utils/comisionPedido");

async function configuracionComisionCliente(tx, clienteId) {
  const cliente = await tx.cliente.findUnique({
    where: { id: Number(clienteId) },
    include: { comisionesVendedores: { select: { vendedorId: true, porcentaje: true } } },
  });
  if (!cliente) throw { status: 400, message: "Cliente no encontrado" };
  return cliente.comisionesVendedores;
}

// Libera un número ocupado por un pedido eliminado sin borrar su historial.
// Los pedidos archivados reciben un número negativo reservado internamente.
async function liberarNroOrdenInactivo(tx, nroOrden, pedidoActualId = null) {
  const existente = await tx.pedido.findUnique({ where: { nroOrden } });
  if (!existente || existente.id === pedidoActualId) return;

  if (existente.activo) {
    throw { status: 400, message: `Ya existe un pedido activo con el número ${nroOrden}` };
  }

  let nroArchivo = -(1000000 + existente.id);
  while (await tx.pedido.findUnique({ where: { nroOrden: nroArchivo } })) {
    nroArchivo -= 1;
  }

  await tx.pedido.update({
    where: { id: existente.id },
    data: { nroOrden: nroArchivo },
  });
}

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

// GET /api/pedidos/con-stock — IDs de pedidos con artículos que manejan stock
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
  const { clienteId, vendedorId, fecha, items, observaciones, nroOrden: nroOrdenBody } = req.body;
  if (!clienteId || !items?.length) {
    return res.status(400).json({ error: "Cliente e items requeridos" });
  }

  const total  = items.reduce((s, i) => s + (i.precio * i.cantidad), 0);

  // Número de orden: manual si viene en el body, automático si no
  let nroOrden;
  if (nroOrdenBody) {
    nroOrden = Number(nroOrdenBody);
  } else {
    const ultimo = await prisma.pedido.findFirst({ orderBy: { nroOrden: "desc" } });
    nroOrden = (ultimo?.nroOrden || 0) + 1;
  }

  const pedido = await prisma.$transaction(async (tx) => {
    await liberarNroOrdenInactivo(tx, nroOrden);
    const comisionesCliente = await configuracionComisionCliente(tx, clienteId);

    // 1. Crear pedido
    const p = await tx.pedido.create({
      data: {
        nroOrden,
        clienteId:  Number(clienteId),
        vendedorId: vendedorId ? Number(vendedorId) : null,
        fecha: fecha ? new Date(fecha + "T12:00:00") : new Date(),
        total,
        saldo:      total,
        observaciones,
      },
    });

    if (comisionesCliente.length) {
      await tx.pedidoComisionVendedor.createMany({
        data: comisionesCliente.map(c => ({ pedidoId: p.id, vendedorId: c.vendedorId, porcentaje: c.porcentaje })),
      });
    }

    // 2. Crear detalle
    await tx.detallePedido.createMany({
      data: items.map(i => ({
        pedidoId:      p.id,
        articuloId:    Number(i.articuloId),
        cantidad:      Number(i.cantidad),
        precio:        Number(i.precio),
        subtotal:      Number(i.precio) * Number(i.cantidad),
        observaciones: i.observaciones || null,
      })),
    });

    // 3. Descontar stock de artículos que lo manejan
    for (const item of items) {
      const articulo = await tx.articulo.findUnique({
        where: { id: Number(item.articuloId) },
      });
      if (articulo?.manejaStock) {
        if (articulo.stock < Number(item.cantidad)) {
          throw { status: 400, message: `Stock insuficiente para ${articulo.nombre}. Disponible: ${articulo.stock}` };
        }
        await tx.articulo.update({
          where: { id: articulo.id },
          data:  { stock: articulo.stock - Number(item.cantidad) },
        });
      }
    }

    await actualizarComisionPedido(tx, p.id);

    return p;
  });

  const completo = await prisma.pedido.findUnique({
    where:   { id: pedido.id },
    include: { cliente: true, vendedor: true, detalle: { include: { articulo: true } } },
  });

  res.status(201).json(completo);
});

// PATCH editar pedido completo
router.patch("/:id", async (req, res) => {
  const pedidoId = Number(req.params.id);
  const { nroOrden, clienteId, vendedorId, fecha, items, observaciones, activo } = req.body;

  // Mantener compatibilidad con actualizaciones parciales existentes.
  if (!items) {
    const data = await prisma.$transaction(async tx => {
      const actualizado = await tx.pedido.update({
        where: { id: pedidoId },
        data: {
          observaciones,
          vendedorId: vendedorId === null ? null : (vendedorId ? Number(vendedorId) : undefined),
          activo,
        },
      });
      await actualizarComisionPedido(tx, pedidoId);
      return actualizado;
    });
    return res.json(data);
  }

  if (!clienteId || !items.length) {
    return res.status(400).json({ error: "Cliente e items requeridos" });
  }
  if (!Number.isInteger(Number(nroOrden)) || Number(nroOrden) < 1) {
    return res.status(400).json({ error: "Número de orden inválido" });
  }

  const articulosIds = items.map(i => Number(i.articuloId));
  if (new Set(articulosIds).size !== articulosIds.length) {
    return res.status(400).json({ error: "No puede haber artículos repetidos" });
  }

  const itemsNormalizados = items.map(i => {
    const cantidad = Number(i.cantidad);
    const precio = Number(i.precio);
    const cantidadFaltante = Math.min(Math.max(Number(i.cantidadFaltante || 0), 0), cantidad);
    if (!i.articuloId || cantidad < 1 || precio < 0) {
      throw { status: 400, message: "Hay artículos con cantidad o precio inválido" };
    }
    return {
      articuloId: Number(i.articuloId),
      cantidad,
      precio,
      cantidadFaltante,
      subtotal: precio * (cantidad - cantidadFaltante),
      observaciones: i.observaciones || null,
    };
  });

  const total = itemsNormalizados.reduce((s, i) => s + i.subtotal, 0);

  const actualizado = await prisma.$transaction(async (tx) => {
    const anterior = await tx.pedido.findUnique({
      where: { id: pedidoId },
      include: { detalle: { include: { articulo: true } } },
    });
    if (!anterior) throw { status: 404, message: "Pedido no encontrado" };
    const cambiaCliente = Number(clienteId) !== anterior.clienteId;
    const comisionesCliente = cambiaCliente ? await configuracionComisionCliente(tx, clienteId) : null;

    const nuevoNroOrden = Number(nroOrden);
    if (nuevoNroOrden !== anterior.nroOrden) {
      await liberarNroOrdenInactivo(tx, nuevoNroOrden, pedidoId);
    }

    // Devolver primero el stock descontado por el detalle anterior.
    for (const detalle of anterior.detalle) {
      if (detalle.articulo.manejaStock) {
        await tx.articulo.update({
          where: { id: detalle.articuloId },
          data: { stock: { increment: detalle.cantidad } },
        });
      }
    }

    const articulos = await tx.articulo.findMany({ where: { id: { in: articulosIds } } });
    if (articulos.length !== articulosIds.length) {
      throw { status: 400, message: "Uno o más artículos no existen" };
    }

    for (const item of itemsNormalizados) {
      const articulo = articulos.find(a => a.id === item.articuloId);
      if (articulo.manejaStock) {
        const stockActual = await tx.articulo.findUnique({ where: { id: articulo.id } });
        if (stockActual.stock < item.cantidad) {
          throw { status: 400, message: `Stock insuficiente para ${articulo.nombre}. Disponible: ${stockActual.stock}` };
        }
        await tx.articulo.update({
          where: { id: articulo.id },
          data: { stock: { decrement: item.cantidad } },
        });
      }
    }

    await tx.detallePedido.deleteMany({ where: { pedidoId } });
    await tx.detallePedido.createMany({
      data: itemsNormalizados.map(i => ({
        pedidoId,
        ...i,
        faltante: i.cantidadFaltante > 0,
      })),
    });

    const pedido = await tx.pedido.update({
      where: { id: pedidoId },
      data: {
        nroOrden: nuevoNroOrden,
        clienteId: Number(clienteId),
        vendedorId: vendedorId ? Number(vendedorId) : null,
        fecha: fecha ? new Date(fecha + "T12:00:00") : anterior.fecha,
        observaciones: observaciones || null,
        total,
        saldo: Math.max(0, total - anterior.totalPagado),
      },
    });

    if (comisionesCliente !== null) {
      await tx.pedidoComisionVendedor.deleteMany({ where: { pedidoId } });
      if (comisionesCliente.length) {
        await tx.pedidoComisionVendedor.createMany({
          data: comisionesCliente.map(c => ({ pedidoId, vendedorId: c.vendedorId, porcentaje: c.porcentaje })),
        });
      }
    }

    await actualizarComisionPedido(tx, pedidoId);

    return pedido;
  });

  const completo = await prisma.pedido.findUnique({
    where: { id: actualizado.id },
    include: { cliente: true, vendedor: true, detalle: { include: { articulo: true } }, pagos: true, comision: true },
  });
  res.json(completo);
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

    await actualizarComisionPedido(tx, detalle.pedidoId);
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
    await actualizarComisionPedido(tx, detalle.pedidoId);
  });

  res.json({ mensaje: "Artículo eliminado del pedido" });
});

// DELETE físico del pedido completo y de todas sus relaciones.
router.delete("/:id", async (req, res) => {
  const pedidoId = Number(req.params.id);

  await prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { id: pedidoId },
      include: { detalle: { include: { articulo: true } } },
    });
    if (!pedido) throw { status: 404, message: "Pedido no encontrado" };

    // Reponer el stock que fue descontado al crear el pedido.
    for (const detalle of pedido.detalle) {
      if (detalle.articulo.manejaStock) {
        await tx.articulo.update({
          where: { id: detalle.articuloId },
          data: { stock: { increment: detalle.cantidad } },
        });
      }
    }

    await tx.pedidoComisionVendedor.deleteMany({ where: { pedidoId } });
    await tx.comision.deleteMany({ where: { pedidoId } });
    await tx.pago.deleteMany({ where: { pedidoId } });
    await tx.detallePedido.deleteMany({ where: { pedidoId } });
    await tx.pedido.delete({ where: { id: pedidoId } });
  });

  res.json({ mensaje: "Pedido eliminado definitivamente" });
});

module.exports = router;
