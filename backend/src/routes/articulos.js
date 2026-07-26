const router = require("express").Router();
const prisma = require("../utils/prisma");

router.get("/", async (_req, res) => {
  const data = await prisma.articulo.findMany({ orderBy: { nombre: "asc" } });
  res.json(data);
});

router.post("/", async (req, res) => {
  const { codigo, nombre, descripcion, unidadCaja, precio } = req.body;
  if (!nombre || !precio) return res.status(400).json({ error: "Nombre y precio requeridos" });
  const data = await prisma.articulo.create({
    data: { codigo, nombre, descripcion, unidadCaja, precio: Number(precio) },
  });
  res.status(201).json(data);
});

router.patch("/:id", async (req, res) => {
  const { codigo, nombre, descripcion, unidadCaja, precio, activo } = req.body;
  const data = await prisma.articulo.update({
    where: { id: Number(req.params.id) },
    data:  { codigo, nombre, descripcion, unidadCaja, precio: precio ? Number(precio) : undefined, activo },
  });
  res.json(data);
});

router.delete("/:id", async (req, res) => {
  await prisma.articulo.update({
    where: { id: Number(req.params.id) },
    data:  { activo: false },
  });
  res.json({ mensaje: "Artículo desactivado" });
});

module.exports = router;