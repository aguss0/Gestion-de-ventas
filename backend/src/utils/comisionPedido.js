// Las presentaciones vinculadas al catálogo de descartables nunca comisionan.
async function actualizarComisionPedido(tx, pedidoId) {
  const pedido = await tx.pedido.findUnique({ where: { id: pedidoId }, include: { cliente: true, vendedor: true, detalle: { include: { articulo: true } } } });
  const papas = pedido.detalle.filter(d => d.articulo.descartableId == null && d.articulo.dieteticaId == null && !d.articulo.manejaStock);
  const importe = papas.reduce((s, d) => s + d.subtotal, 0);
  if (!pedido.activo || !pedido.vendedorId || importe <= 0) {
    await tx.comision.deleteMany({ where: { pedidoId } });
    return;
  }
  const pct = valor => Number.isFinite(Number(valor)) ? Number(valor) / 100 : 0;
  const data = {
    vendedorId: pedido.vendedorId,
    importe,
    comisionMiguel: importe * pct(pedido.comisionMiguelPct ?? pedido.cliente.comisionMiguelPct),
    comisionGerardo: importe * pct(pedido.comisionGerardoPct ?? pedido.cliente.comisionGerardoPct),
    comisionTurko: importe * pct(pedido.comisionTurkoPct ?? pedido.cliente.comisionTurkoPct),
  };
  await tx.comision.upsert({ where: { pedidoId }, create: { pedidoId, ...data }, update: data });
}
module.exports = { actualizarComisionPedido };
