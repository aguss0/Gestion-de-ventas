/** @jest-environment node */
import { crearListaDescartables, preciosDescartable } from './listaDescartablesPdf';

const articulo = { codigo: 'AEA', nombre: 'BENGALA X 12 UNI', categoria: 'AEROCOR / 100- LINEA COTILLON', costoBulto: 16500, unidadesBulto: 12 };
test('calcula recargos sobre los costos finales con IVA y descuento', () => {
  expect(preciosDescartable(articulo, 30, 20)).toEqual({ unidad: 2097.99, bulto: 23239.26 });
  expect(preciosDescartable(articulo, 0, 0).unidad).toBe(1613.84);
});
test('impide exportar cantidades desconocidas y selecciones vacías', () => {
  expect(() => preciosDescartable({ ...articulo, unidadesBulto: null }, 30, 20)).toThrow();
  expect(() => preciosDescartable(articulo, -1, 20)).toThrow();
  expect(() => crearListaDescartables([], 0, 0)).toThrow();
});
test.each(['100', '50', '0'])('PDF y publicación coinciden para categoría %s', codigo => {
  const { preciosVentaDescartable } = require('../../../backend/src/utils/costosDescartables');
  const a = { ...articulo, categoria: codigo + '- LINEA' };
  expect(preciosDescartable(a, 30, 20)).toEqual(preciosVentaDescartable(a, 30, 20));
});
test('bloquea categorías desconocidas en lugar de exportar sin IVA', () => {
  expect(() => crearListaDescartables([{ ...articulo, categoria: 'Desconocida' }], 30, 20)).toThrow('Revisar categoría');
});
