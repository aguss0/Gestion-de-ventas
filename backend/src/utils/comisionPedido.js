// Las presentaciones vinculadas al catálogo de descartables nunca comisionan.
async function actualizarComisionPedido(tx, pedidoId) {
  const pedido = await tx.pedido.findUnique({
    where: { id: pedidoId },
    include: {
      detalle: { include: { articulo: true } },
      comisionesVendedores: true,
      cliente: { include: { comisionesVendedores: true } },
    },
  });
  const papas = pedido.detalle.filter(d => d.articulo.descartableId == null && d.articulo.dieteticaId == null && !d.articulo.manejaStock);
  const importe = papas.reduce((s, d) => s + d.subtotal, 0);
  let configuraciones = pedido.comisionesVendedores;

  // Compatibilidad para pedidos sin foto: tomar la configuración una única vez.
  if (!configuraciones.length && pedido.cliente.comisionesVendedores.length) {
    await tx.pedidoComisionVendedor.createMany({
      data: pedido.cliente.comisionesVendedores.map(c => ({
        pedidoId,
        vendedorId: c.vendedorId,
        porcentaje: c.porcentaje,
      })),
    });
    configuraciones = pedido.cliente.comisionesVendedores;
  }

  const base = pedido.activo ? importe : 0;
  for (const configuracion of configuraciones) {
    const monto = base * Number(configuracion.porcentaje) / 100;
    await tx.pedidoComisionVendedor.upsert({
      where: { pedidoId_vendedorId: { pedidoId, vendedorId: configuracion.vendedorId } },
      create: { pedidoId, vendedorId: configuracion.vendedorId, porcentaje: configuracion.porcentaje, importe: base, monto },
      update: { importe: base, monto },
    });
  }
}
module.exports = { actualizarComisionPedido };
