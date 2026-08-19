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
    data: {
      nombre,
      cuit:       cuit       || null,
      email:      email      || null,
      telefono:   telefono   || null,
      direccion:  direccion  || null,
      barrio:     barrio     || null,
      tipo:       tipo       || null,
      vendedorId: vendedorId ? Number(vendedorId) : null,
    },
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

// GET /api/clientes/:id/estadisticas
router.get("/:id/estadisticas", async (req, res) => {
  const clienteId = Number(req.params.id);

  const pedidos = await prisma.pedido.findMany({
    where:   { clienteId, activo: true },
    include: { detalle: { include: { articulo: true } } },
    orderBy: { fecha: "desc" },
  });

  if (!pedidos.length) {
    return res.json({
      totalPedidos:    0,
      totalComprado:   0,
      ticketPromedio:  0,
      ultimaCompra:    null,
      primeraCompra:   null,
      mesesActivo:     0,
      frecuenciaDias:  null,
      productoTop:     null,
      topProductos:    [],
      compraPorMes:    [],
    });
  }

  // Totales generales
  const totalComprado  = pedidos.reduce((s, p) => s + p.total, 0);
  const ticketPromedio = totalComprado / pedidos.length;
  const ultimaCompra   = pedidos[0].fecha;
  const primeraCompra  = pedidos[pedidos.length - 1].fecha;

  // Meses activo
  const meses = Math.max(1, Math.round(
    (new Date(ultimaCompra) - new Date(primeraCompra)) / (1000 * 60 * 60 * 24 * 30)
  ));

  // Frecuencia promedio en días
  let frecuenciaDias = null;
  if (pedidos.length > 1) {
    const diasTotal = (new Date(ultimaCompra) - new Date(primeraCompra)) / (1000 * 60 * 60 * 24);
    frecuenciaDias = Math.round(diasTotal / (pedidos.length - 1));
  }

  // Productos más comprados
  const conteoProductos = {};
  for (const pedido of pedidos) {
    for (const d of pedido.detalle) {
      const nombre = d.articulo?.nombre || "Desconocido";
      if (!conteoProductos[nombre]) conteoProductos[nombre] = { nombre, cantidad: 0, subtotal: 0 };
      conteoProductos[nombre].cantidad += d.cantidad;
      conteoProductos[nombre].subtotal += d.subtotal;
    }
  }
  const topProductos = Object.values(conteoProductos)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  // Compras por mes
  const porMes = {};
  for (const p of pedidos) {
    const key = new Date(p.fecha).toLocaleDateString("es-AR", { month: "short", year: "numeric" });
    if (!porMes[key]) porMes[key] = 0;
    porMes[key] += p.total;
  }
  const compraPorMes = Object.entries(porMes)
    .map(([mes, total]) => ({ mes, total }))
    .reverse();

  res.json({
    totalPedidos:   pedidos.length,
    totalComprado,
    ticketPromedio,
    ultimaCompra,
    primeraCompra,
    mesesActivo:    meses,
    frecuenciaDias,
    productoTop:    topProductos[0] || null,
    topProductos,
    compraPorMes,
  });
});

module.exports = router;