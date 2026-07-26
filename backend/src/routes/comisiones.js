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
      resumen[nombre] = { vendedor: nombre, comisionMiguel: 0, comisionGerardo: 0, comisionTurko: 0, plusTurko: 0, total: 0 };
    }
    resumen[nombre].comisionMiguel  += c.comisionMiguel;
    resumen[nombre].comisionGerardo += c.comisionGerardo;
    resumen[nombre].comisionTurko   += c.comisionTurko;
    resumen[nombre].plusTurko       += c.plusTurko;
    resumen[nombre].total           += c.comisionMiguel + c.comisionGerardo + c.comisionTurko;
  }

  res.json(Object.values(resumen));
});

module.exports = router;