const { test } = require('node:test');
const assert = require('node:assert/strict');
const { actualizarComisionPedido } = require('../src/utils/comisionPedido');

function transaccionPara({ vendedor, comisiones, comisionesPedido, importe = 1000 }) {
  let guardado;
  return {
    tx: {
      pedido: {
        findUnique: async () => ({
          id: 1,
          activo: true,
          vendedorId: vendedor.id,
          vendedor,
          comisionMiguelPct: comisionesPedido?.miguel,
          comisionGerardoPct: comisionesPedido?.gerardo,
          comisionTurkoPct: comisionesPedido?.turko,
          cliente: {
            comisionMiguelPct: comisiones.miguel,
            comisionGerardoPct: comisiones.gerardo,
            comisionTurkoPct: comisiones.turko,
          },
          detalle: [{
            subtotal: importe,
            articulo: { descartableId: null, dieteticaId: null, manejaStock: false },
          }],
        }),
      },
      comision: {
        deleteMany: async () => {},
        upsert: async ({ create }) => { guardado = create; },
      },
    },
    resultado: () => guardado,
  };
}

test('cada comisión usa el porcentaje configurado en el cliente', async () => {
  const prueba = transaccionPara({ vendedor: { id: 2, nombre: 'Gerardo' }, comisiones: { miguel: 5, gerardo: 3, turko: 0 } });
  await actualizarComisionPedido(prueba.tx, 1);
  assert.equal(prueba.resultado().comisionMiguel, 50);
  assert.equal(prueba.resultado().comisionGerardo, 30);
  assert.equal(prueba.resultado().comisionTurko, 0);
});

test('los porcentajes no completan automáticamente un total', async () => {
  const prueba = transaccionPara({ vendedor: { id: 3, nombre: 'Turko' }, comisiones: { miguel: 2, gerardo: 0, turko: 4.5 } });
  await actualizarComisionPedido(prueba.tx, 1);
  assert.equal(prueba.resultado().comisionMiguel, 20);
  assert.equal(prueba.resultado().comisionGerardo, 0);
  assert.equal(prueba.resultado().comisionTurko, 45);
});

test('un pedido conserva sus porcentajes aunque luego cambie el cliente', async () => {
  const prueba = transaccionPara({
    vendedor: { id: 2, nombre: 'Gerardo' },
    comisiones: { miguel: 1, gerardo: 9, turko: 0 },
    comisionesPedido: { miguel: 6, gerardo: 4, turko: 0 },
  });
  await actualizarComisionPedido(prueba.tx, 1);
  assert.equal(prueba.resultado().comisionMiguel, 60);
  assert.equal(prueba.resultado().comisionGerardo, 40);
});
