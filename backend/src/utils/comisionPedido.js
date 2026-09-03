// Las presentaciones vinculadas al catálogo de descartables nunca comisionan.
async function actualizarComisionPedido(tx, pedidoId) {
  const pedido = await tx.pedido.findUnique({ where: { id: pedidoId }, include: { vendedor: true, detalle: { include: { articulo: true } } } });
  const papas = pedido.detalle.filter(d => d.articulo.descartableId == null && d.articulo.dieteticaId == null && !d.articulo.manejaStock);
  const importe = papas.reduce((s, d) => s + d.subtotal, 0);
  if (!pedido.activo || !pedido.vendedorId || importe <= 0) {
    await tx.comision.deleteMany({ where: { pedidoId } });
    return;
  }
  const nombre = pedido.vendedor?.nombre.toLowerCase() || '';
  const data = { vendedorId: pedido.vendedorId, importe, comisionMiguel: 0, comisionGerardo: 0, comisionTurko: 0 };
  if (nombre.includes('miguel')) data.comisionMiguel = importe * 0.10;
  else if (nombre.includes('gerardo')) { data.comisionMiguel = importe * 0.06; data.comisionGerardo = importe * 0.04; }
  else if (nombre.includes('turko')) { data.comisionMiguel = importe * 0.06; data.comisionTurko = importe * 0.04; }
  await tx.comision.upsert({ where: { pedidoId }, create: { pedidoId, ...data }, update: data });
}
module.exports = { actualizarComisionPedido };
