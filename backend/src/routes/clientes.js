const router = require("express").Router();
const prisma = require("../utils/prisma");

router.get("/", async (_req, res) => {
  const data = await prisma.cliente.findMany({
    include: { vendedor: { select: { id: true, nombre: true } } },
    orderBy: { nombre: "asc" },
  });
  res.json(data);
});

router.post("/", async (req, res) => {
  const { nombre, cuit, email, telefono, direccion, barrio, tipo, vendedorId } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  const data = await prisma.cliente.create({
    data: { nombre, cuit, email, telefono, direccion, barrio, tipo, vendedorId: vendedorId ? Number(vendedorId) : null },
  });
  res.status(201).json(data);
});

router.patch("/:id", async (req, res) => {
  const { nombre, cuit, email, telefono, direccion, barrio, tipo, vendedorId, activo } = req.body;
  const data = await prisma.cliente.update({
    where: { id: Number(req.params.id) },
    data:  { nombre, cuit, email, telefono, direccion, barrio, tipo, vendedorId: vendedorId ? Number(vendedorId) : null, activo },
  });
  res.json(data);
});

router.delete("/:id", async (req, res) => {
  await prisma.cliente.update({
    where: { id: Number(req.params.id) },
    data:  { activo: false },
  });
  res.json({ mensaje: "Cliente desactivado" });
});

module.exports = router;