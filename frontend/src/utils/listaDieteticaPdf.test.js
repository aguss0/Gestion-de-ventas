/** @jest-environment node */
import { preciosDietetica } from './listaDieteticaPdf';
test('precios independientes para venta suelta y bulto', () => {
  expect(preciosDietetica({ costoUnidad: 5580, costoBulto: 65760 }, 0, 0)).toEqual({ unidad: 5580, bulto: 65760 });
  expect(preciosDietetica({ costoUnidad: 5580, costoBulto: 65760 }, 10, 20)).toEqual({ unidad: 6138, bulto: 78912 });
});
test('no inventa precios faltantes ni vende productos sin stock', () => {
  expect(preciosDietetica({ costoUnidad: null, costoBulto: 1000 }, 0, 0)).toEqual({ unidad: null, bulto: 1000 });
  expect(preciosDietetica({ costoUnidad: 100, costoBulto: 1000, sinStock: true }, 0, 0)).toEqual({ unidad: null, bulto: null });
});
