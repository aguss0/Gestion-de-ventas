const router = require("express").Router();
const prisma = require("../utils/prisma");

// GET todas las comisiones
router.get("/", async (_req, res) => {
  const data = await prisma.comision.findMany({
    include: {
      pedido:  { include: { cliente: true } },
      vendedor: true,
    },
    orderBy: { creadoEn: "desc" },
  });
  res.json(data);
});

// GET resumen por vendedor
router.get("/resumen", async (_req, res) => {
  const comisiones = await prisma.comision.findMany({
    include: { vendedor: true },
  });

  const resumen = {};
  for (const c of comisiones) {
    const nombre = c.vendedor?.nombre || "Sin vendedor";
    if (!resumen[nombre]) {
      resumen[nombre] = {
        vendedor:        nombre,
        comisionMiguel:  0,
        comisionGerardo: 0,
        comisionTurko:   0,
        totalCobrado:    0,
        totalPendiente:  0,
      };
    }
    const total = c.comisionMiguel + c.comisionGerardo + c.comisionTurko;
    resumen[nombre].comisionMiguel  += c.comisionMiguel;
    resumen[nombre].comisionGerardo += c.comisionGerardo;
    resumen[nombre].comisionTurko   += c.comisionTurko;
    if (c.cobrado) {
      resumen[nombre].totalCobrado   += total;
    } else {
      resumen[nombre].totalPendiente += total;
    }
  }

  res.json(Object.values(resumen));
});

// PATCH marcar cobrado/pendiente
router.patch("/:id/cobrado", async (req, res) => {
  const { cobrado } = req.body;
  const data = await prisma.comision.update({
    where: { id: Number(req.params.id) },
    data:  {
      cobrado,
      fechaCobro: cobrado ? new Date() : null,
    },
  });
  res.json(data);
});

module.exports = router;