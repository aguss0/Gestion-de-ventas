const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cantidadPresentacion } = require('../src/utils/dieteticaExcel');
test('presentaciones de dietética admiten kilos fraccionados y unidades', () => {
  for (const [texto, esperado] of [['12 UNID', 12], ['22,68 KG', 22.68], ['2.5 KG', 2.5], ['1/2 KG', .5], ['', null], ['SIN STOCK', null]]) assert.equal(cantidadPresentacion(texto), esperado);
});
