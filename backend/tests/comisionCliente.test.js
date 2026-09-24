const { test } = require('node:test');
const assert = require('node:assert/strict');
const { actualizarComisionPedido } = require('../src/utils/comisionPedido');

function transaccionPara({ configuracionCliente, configuracionPedido = [], importe = 1000 }) {
  const guardadas = [];
  let configuracionCopiada = null;
  return {
    tx: {
      pedido: {
        findUnique: async () => ({
          id: 1,
          activo: true,
          comisionesVendedores: configuracionPedido,
          cliente: { comisionesVendedores: configuracionCliente },
          detalle: [{
            subtotal: importe,
            articulo: { descartableId: null, dieteticaId: null, manejaStock: false },
          }],
        }),
      },
      pedidoComisionVendedor: {
        createMany: async ({ data }) => { configuracionCopiada = data; },
        upsert: async ({ create }) => { guardadas.push(create); },
      },
    },
    guardadas: () => guardadas,
    configuracionCopiada: () => configuracionCopiada,
  };
}

test('calcula comisiones para cualquier vendedor sin depender de su nombre', async () => {
  const prueba = transaccionPara({
    configuracionCliente: [
      { vendedorId: 17, porcentaje: 3.5 },
      { vendedorId: 28, porcentaje: 2 },
    ],
  });
  await actualizarComisionPedido(prueba.tx, 1);
  assert.deepEqual(prueba.guardadas().map(c => [c.vendedorId, c.monto]), [[17, 35], [28, 20]]);
  assert.deepEqual(prueba.configuracionCopiada().map(c => [c.vendedorId, c.porcentaje]), [[17, 3.5], [28, 2]]);
});

test('un pedido conserva su configuración aunque luego cambie el cliente', async () => {
  const prueba = transaccionPara({
    configuracionCliente: [{ vendedorId: 99, porcentaje: 9 }],
    configuracionPedido: [{ vendedorId: 17, porcentaje: 4 }],
  });
  await actualizarComisionPedido(prueba.tx, 1);
  assert.deepEqual(prueba.guardadas().map(c => [c.vendedorId, c.porcentaje, c.monto]), [[17, 4, 40]]);
  assert.equal(prueba.configuracionCopiada(), null);
});

test('solo los artículos Laurens forman la base de comisión', async () => {
  const prueba = transaccionPara({ configuracionCliente: [{ vendedorId: 17, porcentaje: 5 }], importe: 250 });
  prueba.tx.pedido.findUnique = async () => ({
    id: 1,
    activo: true,
    comisionesVendedores: [{ vendedorId: 17, porcentaje: 5 }],
    cliente: { comisionesVendedores: [] },
    detalle: [
      { subtotal: 250, articulo: { descartableId: null, dieteticaId: null, manejaStock: false } },
      { subtotal: 900, articulo: { descartableId: 1, dieteticaId: null, manejaStock: false } },
    ],
  });
  await actualizarComisionPedido(prueba.tx, 1);
  assert.equal(prueba.guardadas()[0].importe, 250);
  assert.equal(prueba.guardadas()[0].monto, 12.5);
});
