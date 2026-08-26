const router = require("express").Router();
const prisma  = require("../utils/prisma");

// GET todas las compras
router.get("/", async (_req, res) => {
  const data = await prisma.compraStock.findMany({
    include: { articulo: true },
    orderBy: { fecha: "desc" },
  });
  res.json(data);
});

// POST registrar compra e incrementar stock
router.post("/", async (req, res) => {
  const { articuloId, cantidad, precioUnitario, proveedor, fecha, observaciones } = req.body;
  if (!articuloId || !cantidad || !precioUnitario) {
    return res.status(400).json({ error: "Artículo, cantidad y precio requeridos" });
  }

  const resultado = await prisma.$transaction(async (tx) => {
    const articulo = await tx.articulo.findUnique({ where: { id: Number(articuloId) } });
    if (!articulo) throw { status: 404, message: "Artículo no encontrado" };
    if (!articulo.manejaStock) throw { status: 400, message: "Este artículo no maneja stock" };

    const total = Number(cantidad) * Number(precioUnitario);

    // Registrar compra
    const compra = await tx.compraStock.create({
      data: {
        articuloId:     Number(articuloId),
        cantidad:       Number(cantidad),
        precioUnitario: Number(precioUnitario),
        total,
        proveedor:      proveedor || null,
        fecha:          fecha ? new Date(fecha + "T12:00:00") : new Date(),
        observaciones:  observaciones || null,
      },
    });

    // Incrementar stock
    await tx.articulo.update({
      where: { id: Number(articuloId) },
      data:  { stock: articulo.stock + Number(cantidad) },
    });

    return { compra, stockNuevo: articulo.stock + Number(cantidad) };
  });

  res.status(201).json({
    mensaje:    "Compra registrada y stock actualizado",
    compra:     resultado.compra,
    stockNuevo: resultado.stockNuevo,
  });
});

// DELETE eliminar compra y revertir stock
router.delete("/:id", async (req, res) => {
  await prisma.$transaction(async (tx) => {
    const compra = await tx.compraStock.findUnique({ where: { id: Number(req.params.id) } });
    if (!compra) throw { status: 404, message: "Compra no encontrada" };

    const articulo = await tx.articulo.findUnique({ where: { id: compra.articuloId } });

    await tx.compraStock.delete({ where: { id: compra.id } });
    await tx.articulo.update({
      where: { id: compra.articuloId },
      data:  { stock: Math.max(0, articulo.stock - compra.cantidad) },
    });
  });
  res.json({ mensaje: "Compra eliminada y stock revertido" });
});

module.exports = router;

// GET /api/comprasstock/rentabilidad
router.get("/rentabilidad", async (_req, res) => {
  // Traer todos los artículos que manejan stock
  const articulos = await prisma.articulo.findMany({
    where: { manejaStock: true },
    include: {
      compras: true,
      detallePedidos: {
        include: { pedido: { select: { activo: true } } }
      },
    },
  });

  const resultado = articulos.map(a => {
    // Total invertido en compras
    const totalInvertido = a.compras.reduce((s, c) => s + c.total, 0);
    const unidadesCompradas = a.compras.reduce((s, c) => s + c.cantidad, 0);

    // Total vendido
    const ventasActivas = a.detallePedidos.filter(d => d.pedido?.activo !== false);
    const unidadesVendidas = ventasActivas.reduce((s, d) => s + d.cantidad, 0);
    const totalVendido    = ventasActivas.reduce((s, d) => s + d.subtotal, 0);

    // Costo de lo vendido (precio promedio de compra * unidades vendidas)
    const precioPromedioCompra = unidadesCompradas > 0 ? totalInvertido / unidadesCompradas : 0;
    const costoVendido         = precioPromedioCompra * unidadesVendidas;
    const ganancia             = totalVendido - costoVendido;
    const margen               = totalVendido > 0 ? (ganancia / totalVendido) * 100 : 0;

    return {
      id:                a.id,
      nombre:            a.nombre,
      unidadMedida:      a.unidadMedida,
      stockActual:       a.stockActual || a.stock,
      unidadesCompradas,
      totalInvertido,
      precioPromedioCompra,
      unidadesVendidas,
      totalVendido,
      costoVendido,
      ganancia,
      margen:            Math.round(margen * 10) / 10,
    };
  });

  res.json(resultado.filter(r => r.unidadesCompradas > 0 || r.unidadesVendidas > 0));
});