const router = require("express").Router();
const prisma = require("../utils/prisma");
const { publicacionOnline } = require("../utils/publicacionOnline");

router.get("/", async (_req, res) => {
  const data = await prisma.articulo.findMany({ orderBy: { nombre: "asc" } });
  res.json(data);
});

router.post("/", async (req, res) => {
  const { codigo, nombre, descripcion, unidadCaja, unidadMedida, precio, manejaStock, stock, stockMinimo } = req.body;
  if (!nombre || !precio) return res.status(400).json({ error: "Nombre y precio requeridos" });
  const data = await prisma.articulo.create({
    data: {
      ...publicacionOnline(req.body, req),
      codigo: codigo === undefined ? undefined : (String(codigo || "").trim() || null), nombre, descripcion, unidadCaja,
      unidadMedida:  unidadMedida  || null,
      precio:        Number(precio),
      manejaStock:   Boolean(manejaStock),
      stock:         Number(stock || 0),
      stockMinimo:   Number(stockMinimo || 0),
    },
  });
  res.status(201).json(data);
});

router.patch("/:id", async (req, res) => {
  const { codigo, nombre, descripcion, unidadCaja, unidadMedida, precio, activo, manejaStock, stock, stockMinimo } = req.body;
  const data = await prisma.articulo.update({
    where: { id: Number(req.params.id) },
    data: {
      ...publicacionOnline(req.body, req),
      codigo: codigo === undefined ? undefined : (String(codigo || "").trim() || null), nombre, descripcion, unidadCaja,
      precio:      precio      ? Number(precio)      : undefined,
      manejaStock: manejaStock !== undefined ? Boolean(manejaStock) : undefined,
      stock:       stock       !== undefined ? Number(stock)        : undefined,
      stockMinimo: stockMinimo !== undefined ? Number(stockMinimo)  : undefined,
      unidadMedida: unidadMedida !== undefined ? unidadMedida : undefined,
      activo,
    },
  });
  res.json(data);
});

// Eliminación definitiva: solo si el artículo no tiene movimientos asociados.
router.delete("/:id/permanente", async (req, res) => {
  const id = Number(req.params.id);
  const articulo = await prisma.articulo.findUnique({
    where: { id },
    include: {
      _count: { select: { detallePedidos: true, compras: true } },
    },
  });

  if (!articulo) return res.status(404).json({ error: "Artículo no encontrado" });

  const pedidos = articulo._count.detallePedidos;
  const compras = articulo._count.compras;
  if (pedidos > 0 || compras > 0) {
    return res.status(409).json({
      error: `No se puede eliminar porque tiene ${pedidos} pedido(s) y ${compras} compra(s) asociados. Podés desactivarlo.`,
    });
  }

  await prisma.articulo.delete({ where: { id } });
  res.json({ mensaje: "Artículo eliminado definitivamente" });
});

router.delete("/:id", async (req, res) => {
  await prisma.articulo.update({
    where: { id: Number(req.params.id) },
    data:  { activo: false },
  });
  res.json({ mensaje: "Artículo desactivado" });
});

module.exports = router;
