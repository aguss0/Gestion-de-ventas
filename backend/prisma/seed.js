const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // ─── VENDEDORES ───────────────────────────────────────────
  const miguel  = await prisma.vendedor.upsert({ where: { email: "miguel@empresa.com"  }, update: {}, create: { nombre: "Miguel",  email: "miguel@empresa.com",  comisionPct: 6 } });
  const gerardo = await prisma.vendedor.upsert({ where: { email: "gerardo@empresa.com" }, update: {}, create: { nombre: "Gerardo", email: "gerardo@empresa.com", comisionPct: 6 } });
  const turko   = await prisma.vendedor.upsert({ where: { email: "turko@empresa.com"   }, update: {}, create: { nombre: "Turko",   email: "turko@empresa.com",   comisionPct: 6 } });

  console.log("✅ Vendedores creados");

  // ─── CLIENTES ─────────────────────────────────────────────
  const laQueseria        = await prisma.cliente.upsert({ where: { email: "laQueseria@mail.com"        }, update: {}, create: { nombre: "La Queseria",                   email: "laQueseria@mail.com",        vendedorId: turko.id   } });
  const mariel            = await prisma.cliente.upsert({ where: { email: "mariel@mail.com"            }, update: {}, create: { nombre: "Mariel - Cole Peña",             email: "mariel@mail.com",            vendedorId: miguel.id  } });
  const verdeLimon        = await prisma.cliente.upsert({ where: { email: "verdeLimon@mail.com"        }, update: {}, create: { nombre: "Verde Limon - Urca",             email: "verdeLimon@mail.com",        vendedorId: miguel.id  } });
  const masi              = await prisma.cliente.upsert({ where: { email: "masi@mail.com"              }, update: {}, create: { nombre: "Distribuidora Masi S.A.",        email: "masi@mail.com",        cuit: "30712232257", direccion: "Pasaje 2 de Abril 92", barrio: "San Guillermo", vendedorId: turko.id   } });
  const casonas           = await prisma.cliente.upsert({ where: { email: "casonas@mail.com"           }, update: {}, create: { nombre: "Autoservicio Casonas de Norte",  email: "casonas@mail.com",     cuit: "30-71668567-1", vendedorId: turko.id   } });
  const feli              = await prisma.cliente.upsert({ where: { email: "feli@mail.com"              }, update: {}, create: { nombre: "Establecimiento Feli S.A.",       email: "feli@mail.com",        direccion: "Republica de Israel 66", vendedorId: gerardo.id } });
  const dietetica         = await prisma.cliente.upsert({ where: { email: "dieteticaNvaCba@mail.com"   }, update: {}, create: { nombre: "Dietetica Nva Cba",               email: "dieteticaNvaCba@mail.com",   vendedorId: miguel.id  } });
  const gda               = await prisma.cliente.upsert({ where: { email: "gda@mail.com"               }, update: {}, create: { nombre: "GDA",                            email: "gda@mail.com",               vendedorId: gerardo.id } });
  const sanGuillermo      = await prisma.cliente.upsert({ where: { email: "sanGuillermo@mail.com"      }, update: {}, create: { nombre: "Distribuidora San Guillermo",     email: "sanGuillermo@mail.com",      vendedorId: turko.id   } });

  console.log("✅ Clientes creados");

  // ─── ARTÍCULOS ────────────────────────────────────────────
  const arts = [
    { codigo: "1",   nombre: "PAPAS RUFFLES X 800",          unidadCaja: "8 UNID",  precio: 7830  },
    { codigo: "280", nombre: "PAPAS PAY X 800",               unidadCaja: "10 UNID", precio: 8972  },
    { codigo: "281", nombre: "PAPAS PAY X 400",               unidadCaja: "16 UNID", precio: 4536  },
    { codigo: "10",  nombre: "PAPAS CLASICAS X 800",          unidadCaja: "8 UNID",  precio: 7830  },
    { codigo: "3",   nombre: "PAPAS CLASICAS X 400",          unidadCaja: "10 UNID", precio: 4385  },
    { codigo: "231", nombre: "PAPAS CLASICAS X 160",          unidadCaja: "20 UNID", precio: 2284  },
    { codigo: "121", nombre: "PAPAS CLASICAS X 80",           unidadCaja: "30 UNID", precio: 1307  },
    { codigo: "308", nombre: "PAPAS CHEDDAR X 400",           unidadCaja: "10 UNID", precio: 5347  },
    { codigo: "309", nombre: "PAPAS CHEDDAR X 160",           unidadCaja: "16 UNID", precio: 2636  },
    { codigo: "310", nombre: "PAPAS JAMON SERR X 400",        unidadCaja: "10 UNID", precio: 5347  },
    { codigo: "311", nombre: "PAPAS JAMON SERR X 160",        unidadCaja: "16 UNID", precio: 2636  },
    { codigo: "11",  nombre: "PALOS SALADOS X 1",             unidadCaja: "20 UNID", precio: 4062  },
    { codigo: "12",  nombre: "PALOS SALADOS X 500",           unidadCaja: "25 UNID", precio: 2200  },
    { codigo: "13",  nombre: "PALOS S X 200",                 unidadCaja: "50 UNID", precio: 1244  },
    { codigo: "14",  nombre: "PALOS S X 100",                 unidadCaja: "100 UNID",precio: 798   },
    { codigo: "94",  nombre: "CHIZITOS X 700",                unidadCaja: "8 UNID",  precio: 3487  },
    { codigo: "19",  nombre: "CHIZITOS X 400",                unidadCaja: "10 UNID", precio: 2133  },
    { codigo: "220", nombre: "CHIZITOS X 160",                unidadCaja: "16 UNID", precio: 1277  },
    { codigo: "122", nombre: "CHIZITOS X 80",                 unidadCaja: "30 UNID", precio: 887   },
    { codigo: "30",  nombre: "MANI SALADO X 1 KG",            unidadCaja: "25 UNID", precio: 5369  },
    { codigo: "34",  nombre: "MANI PELADO X 1 KG",            unidadCaja: "25 UNID", precio: 5856  },
    { codigo: "31",  nombre: "MANI SALADO X 500",             unidadCaja: "25 UNID", precio: 3018  },
    { codigo: "32",  nombre: "MANI SALADO X 200",             unidadCaja: "50 UNID", precio: 1562  },
    { codigo: "35",  nombre: "MANI PELADO X 200",             unidadCaja: "50 UNID", precio: 1764  },
    { codigo: "106", nombre: "BOLITAS X 700",                 unidadCaja: "8 UNID",  precio: 3825  },
    { codigo: "102", nombre: "DULCITAS X 700",                unidadCaja: "8 UNID",  precio: 3825  },
    { codigo: "243", nombre: "CONITOS X 500",                 unidadCaja: "8 UNID",  precio: 7588  },
    { codigo: "244", nombre: "CONITOS X 160",                 unidadCaja: "16 UNID", precio: 2567  },
    { codigo: "20",  nombre: "CASCARON X 400",                unidadCaja: "8 UNID",  precio: 4295  },
    { codigo: "302", nombre: "ARITOS CEBOLLA CREMA X 400",    unidadCaja: "8 UNID",  precio: 5237  },
    { codigo: "206", nombre: "ALMOHADITAS CHOC-FRUTILLA X 800",unidadCaja:"10 UNID", precio: 7316  },
    { codigo: "264", nombre: "ARITOS FRUT X 2.5 KG",          unidadCaja: "",        precio: 18330 },
  ];

  for (const a of arts) {
    await prisma.articulo.upsert({
      where:  { codigo: a.codigo },
      update: { nombre: a.nombre, unidadCaja: a.unidadCaja, precio: a.precio },
      create: a,
    });
  }

  console.log("✅ Artículos creados");

  // ─── PEDIDOS CON DETALLE ──────────────────────────────────
  // Helper para buscar artículo por código
  const art = async (codigo) => prisma.articulo.findUnique({ where: { codigo } });

  const pedidosData = [
    {
      nroOrden: 1, clienteId: laQueseria.id, vendedorId: turko.id,
      fecha: new Date("2026-04-07"),
      items: [
        { codigo: "3",  cantidad: 35, precio: 3772 },
        { codigo: "12", cantidad: 25, precio: 1893 },
        { codigo: "19", cantidad: 5,  precio: 1835 },
        { codigo: "20", cantidad: 8,  precio: 3695 },
      ],
    },
    {
      nroOrden: 2, clienteId: mariel.id, vendedorId: miguel.id,
      fecha: new Date("2026-04-07"),
      items: [{ codigo: "280", cantidad: 2, precio: 7718 }],
    },
    {
      nroOrden: 3, clienteId: verdeLimon.id, vendedorId: miguel.id,
      fecha: new Date("2026-04-07"),
      items: [{ codigo: "1", cantidad: 2, precio: 6735 }],
    },
    {
      nroOrden: 4, clienteId: mariel.id, vendedorId: miguel.id,
      fecha: new Date("2026-04-28"),
      items: [
        { codigo: "121", cantidad: 60, precio: 1124 },
        { codigo: "122", cantidad: 20, precio: 763  },
      ],
    },
    {
      nroOrden: 5, clienteId: sanGuillermo.id, vendedorId: turko.id,
      fecha: new Date("2026-05-02"),
      items: [
        { codigo: "121", cantidad: 60,  precio: 1124  },
        { codigo: "231", cantidad: 20,  precio: 1965  },
        { codigo: "3",   cantidad: 10,  precio: 3772  },
        { codigo: "1",   cantidad: 8,   precio: 6735  },
        { codigo: "311", cantidad: 32,  precio: 2268  },
        { codigo: "309", cantidad: 16,  precio: 2268  },
        { codigo: "302", cantidad: 8,   precio: 4505  },
        { codigo: "32",  cantidad: 100, precio: 791   },
        { codigo: "35",  cantidad: 50,  precio: 1517  },
        { codigo: "30",  cantidad: 25,  precio: 4618  },
        { codigo: "34",  cantidad: 25,  precio: 5038  },
        { codigo: "14",  cantidad: 100, precio: 686   },
        { codigo: "12",  cantidad: 25,  precio: 1893  },
        { codigo: "122", cantidad: 30,  precio: 763   },
        { codigo: "19",  cantidad: 10,  precio: 1835  },
        { codigo: "244", cantidad: 16,  precio: 2208  },
        { codigo: "20",  cantidad: 8,   precio: 3695  },
        { codigo: "206", cantidad: 10,  precio: 6294  },
        { codigo: "264", cantidad: 1,   precio: 15767 },
        { codigo: "106", cantidad: 8,   precio: 3291  },
        { codigo: "102", cantidad: 8,   precio: 3291  },
      ],
    },
    {
      nroOrden: 7, clienteId: masi.id, vendedorId: turko.id,
      fecha: new Date("2026-05-19"),
      items: [
        { codigo: "302", cantidad: 8,   precio: 4663  },
        { codigo: "20",  cantidad: 8,   precio: 3824  },
        { codigo: "19",  cantidad: 20,  precio: 1899  },
        { codigo: "102", cantidad: 8,   precio: 3406  },
        { codigo: "206", cantidad: 10,  precio: 6514  },
        { codigo: "32",  cantidad: 100, precio: 819   },
        { codigo: "14",  cantidad: 100, precio: 710   },
        { codigo: "244", cantidad: 80,  precio: 2285  },
        { codigo: "231", cantidad: 100, precio: 2034  },
        { codigo: "121", cantidad: 60,  precio: 1163  },
        { codigo: "309", cantidad: 64,  precio: 2345  },
        { codigo: "311", cantidad: 64,  precio: 2345  },
        { codigo: "122", cantidad: 120, precio: 790   },
        { codigo: "220", cantidad: 32,  precio: 1137  },
      ],
    },
    {
      nroOrden: 11, clienteId: masi.id, vendedorId: turko.id,
      fecha: new Date("2026-06-11"),
      items: [
        { codigo: "106", cantidad: 8,   precio: 3406  },
        { codigo: "302", cantidad: 16,  precio: 4663  },
        { codigo: "20",  cantidad: 8,   precio: 3824  },
        { codigo: "19",  cantidad: 30,  precio: 1899  },
        { codigo: "220", cantidad: 48,  precio: 1137  },
        { codigo: "244", cantidad: 16,  precio: 2285  },
        { codigo: "311", cantidad: 16,  precio: 2345  },
        { codigo: "309", cantidad: 32,  precio: 2347  },
        { codigo: "121", cantidad: 90,  precio: 1163  },
        { codigo: "3",   cantidad: 20,  precio: 3904  },
        { codigo: "10",  cantidad: 16,  precio: 6970  },
      ],
    },
    {
      nroOrden: 12, clienteId: laQueseria.id, vendedorId: turko.id,
      fecha: new Date("2026-06-30"),
      items: [
        { codigo: "12", cantidad: 25, precio: 2116 },
        { codigo: "3",  cantidad: 10, precio: 4060 },
      ],
    },
    {
      nroOrden: 13, clienteId: casonas.id, vendedorId: turko.id,
      fecha: new Date("2026-07-05"),
      items: [{ codigo: "121", cantidad: 30, precio: 1210 }],
    },
    {
      nroOrden: 14, clienteId: feli.id, vendedorId: gerardo.id,
      fecha: new Date("2026-07-06"),
      items: [
        { codigo: "94", cantidad: 16, precio: 3353 },
        { codigo: "11", cantidad: 40, precio: 3906 },
        { codigo: "308",cantidad: 10, precio: 4951 },
      ],
    },
    {
      nroOrden: 15, clienteId: dietetica.id, vendedorId: miguel.id,
      fecha: new Date("2026-07-08"),
      items: [
        { codigo: "1",  cantidad: 8, precio: 7250 },
        { codigo: "11", cantidad: 3, precio: 3906 },
      ],
    },
    {
      nroOrden: 16, clienteId: gda.id, vendedorId: gerardo.id,
      fecha: new Date("2026-07-13"),
      items: [
        { codigo: "10",  cantidad: 48, precio: 7250 },
        { codigo: "280", cantidad: 10, precio: 8307 },
      ],
    },
    {
      nroOrden: 17, clienteId: feli.id, vendedorId: gerardo.id,
      fecha: new Date("2026-07-15"),
      items: [
        { codigo: "94", cantidad: 8,  precio: 3487 },
        { codigo: "1",  cantidad: 8,  precio: 7830 },
        { codigo: "3",  cantidad: 10, precio: 4385 },
      ],
    },
    {
      nroOrden: 18, clienteId: feli.id, vendedorId: gerardo.id,
      fecha: new Date("2026-07-21"),
      items: [
        { codigo: "10", cantidad: 32, precio: 7830 },
        { codigo: "94", cantidad: 16, precio: 3487 },
      ],
    },
    {
      nroOrden: 19, clienteId: laQueseria.id, vendedorId: turko.id,
      fecha: new Date("2026-07-21"),
      observaciones: "Hacer NC por devolucion de 35 palitos y 4 chizitos",
      items: [
        { codigo: "281", cantidad: 32, precio: 4536  },
        { codigo: "13",  cantidad: 50, precio: 1244  },
        { codigo: "220", cantidad: 16, precio: 1277  },
      ],
    },
    {
      nroOrden: 20, clienteId: laQueseria.id, vendedorId: turko.id,
      fecha: new Date("2026-07-23"),
      items: [{ codigo: "3", cantidad: 20, precio: 4385 }],
    },
    {
      nroOrden: 21, clienteId: feli.id, vendedorId: gerardo.id,
      fecha: new Date("2026-07-27"),
      items: [
        { codigo: "94", cantidad: 8,  precio: 3487  },
        { codigo: "11", cantidad: 20, precio: 4062  },
        { codigo: "1",  cantidad: 32, precio: 7830  },
      ],
    },
  ];

  for (const p of pedidosData) {
    // Calcular total
    let total = 0;
    const itemsConArticulo = [];
    for (const item of p.items) {
      const articulo = await art(item.codigo);
      if (!articulo) { console.warn(`⚠ Artículo no encontrado: ${item.codigo}`); continue; }
      const subtotal = item.precio * item.cantidad;
      total += subtotal;
      itemsConArticulo.push({ articuloId: articulo.id, cantidad: item.cantidad, precio: item.precio, subtotal });
    }

    const pedido = await prisma.pedido.upsert({
      where:  { nroOrden: p.nroOrden },
      update: {},
      create: {
        nroOrden:    p.nroOrden,
        clienteId:   p.clienteId,
        vendedorId:  p.vendedorId || null,
        fecha:       p.fecha,
        total,
        saldo:       total,
        observaciones: p.observaciones || null,
      },
    });

    // Crear detalle si no existe
    const existeDetalle = await prisma.detallePedido.count({ where: { pedidoId: pedido.id } });
    if (!existeDetalle) {
      await prisma.detallePedido.createMany({ data: itemsConArticulo.map(i => ({ ...i, pedidoId: pedido.id })) });
    }
  }

  console.log("✅ Pedidos creados");

  // ─── PAGOS ────────────────────────────────────────────────
  const pagosData = [
    { nroOrden: 1,  clienteId: laQueseria.id,   metodo: "Transferencia", monto: 218080, fecha: new Date("2026-04-18") },
    { nroOrden: 3,  clienteId: verdeLimon.id,    metodo: "Efectivo",      monto: 13470,  fecha: new Date("2026-04-18") },
    { nroOrden: 2,  clienteId: mariel.id,        metodo: "Efectivo",      monto: 15436,  fecha: new Date("2026-04-28") },
    { nroOrden: 4,  clienteId: mariel.id,        metodo: "Transferencia", monto: 82700,  fecha: new Date("2026-05-07") },
    { nroOrden: 5,  clienteId: sanGuillermo.id,  metodo: "Echeq",         monto: 1155950,fecha: new Date("2026-05-26") },
    { nroOrden: 7,  clienteId: masi.id,          metodo: "Echeq",         monto: 1303884,fecha: new Date("2026-05-26") },
    { nroOrden: 11, clienteId: masi.id,          metodo: "Echeq",         monto: 687480, fecha: new Date("2026-06-15") },
    { nroOrden: 12, clienteId: laQueseria.id,    metodo: "Efectivo",      monto: 93500,  fecha: new Date("2026-07-01") },
    { nroOrden: 13, clienteId: casonas.id,       metodo: "Efectivo",      monto: 36300,  fecha: new Date("2026-07-06") },
    { nroOrden: 14, clienteId: feli.id,          metodo: "Efectivo",      monto: 259398, fecha: new Date("2026-07-08") },
    { nroOrden: 15, clienteId: dietetica.id,     metodo: "Efectivo",      monto: 69718,  fecha: new Date("2026-07-10") },
    { nroOrden: 17, clienteId: feli.id,          metodo: "Efectivo",      monto: 134386, fecha: new Date("2026-07-26") },
    { nroOrden: 18, clienteId: feli.id,          metodo: "Efectivo",      monto: 306352, fecha: new Date("2026-07-26") },
  ];

  for (const p of pagosData) {
    const pedido = await prisma.pedido.findUnique({ where: { nroOrden: p.nroOrden } });
    if (!pedido) { console.warn(`⚠ Pedido no encontrado: OC ${p.nroOrden}`); continue; }

    const yaExiste = await prisma.pago.findFirst({ where: { pedidoId: pedido.id, monto: p.monto } });
    if (yaExiste) continue;

    await prisma.pago.create({
      data: { pedidoId: pedido.id, clienteId: p.clienteId, metodo: p.metodo, monto: p.monto, fecha: p.fecha },
    });

    // Actualizar saldo del pedido
    const nuevoTotalPagado = pedido.totalPagado + p.monto;
    await prisma.pedido.update({
      where: { id: pedido.id },
      data: { totalPagado: nuevoTotalPagado, saldo: Math.max(0, pedido.total - nuevoTotalPagado) },
    });
  }

  console.log("✅ Pagos creados");
  console.log("\n🎉 Seed completado");
}

main()
  .catch(e => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());