const router = require("express").Router();
const prisma = require("../utils/prisma");

router.get("/", async (_req, res) => {
  const data = await prisma.vendedor.findMany({ orderBy: { nombre: "asc" } });
  res.json(data);
});

router.post("/", async (req, res) => {
  const { nombre, email, telefono } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  const data = await prisma.vendedor.create({ data: { nombre, email, telefono } });
  res.status(201).json(data);
});

router.patch("/:id", async (req, res) => {
  const { nombre, email, telefono, activo } = req.body;
  const data = await prisma.vendedor.update({
    where: { id: Number(req.params.id) },
    data:  { nombre, email, telefono, activo },
  });
  res.json(data);
});

router.delete("/:id", async (req, res) => {
  await prisma.vendedor.update({
    where: { id: Number(req.params.id) },
    data:  { activo: false },
  });
  res.json({ mensaje: "Vendedor desactivado" });
});

module.exports = router;