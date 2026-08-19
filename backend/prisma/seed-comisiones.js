const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Generando comisiones para pedidos existentes...");

  // Traer todos los pedidos con vendedor que NO tienen comisión
  const pedidos = await prisma.pedido.findMany({
    where: {
      activo:    true,
      vendedorId: { not: null },
      comision:  null,
    },
    include: { vendedor: true },
  });

  console.log(`📦 ${pedidos.length} pedido(s) sin comisión encontrados`);

  let creadas = 0;

  for (const pedido of pedidos) {
    const nombre = pedido.vendedor?.nombre?.toLowerCase() || "";
    const total  = pedido.total;

    let comisionMiguel  = 0;
    let comisionGerardo = 0;
    let comisionTurko   = 0;

    if (nombre.includes("miguel")) {
      comisionMiguel = total * 0.06;
    } else if (nombre.includes("gerardo")) {
      comisionMiguel  = total * 0.06;
      comisionGerardo = total * 0.04;
    } else if (nombre.includes("turko")) {
      comisionMiguel = total * 0.06;
      comisionTurko  = total * 0.04;
    }

    await prisma.comision.create({
      data: {
        pedidoId:   pedido.id,
        vendedorId: pedido.vendedorId,
        importe:    total,
        comisionMiguel,
        comisionGerardo,
        comisionTurko,
      },
    });

    console.log(`  ✅ OC #${pedido.nroOrden} — ${pedido.vendedor?.nombre} — ${fmt(total)}`);
    creadas++;
  }

  console.log(`\n🎉 ${creadas} comisión(es) generadas`);
}

function fmt(n) { return "$" + Number(n || 0).toLocaleString("es-AR"); }

main()
  .catch(e => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());