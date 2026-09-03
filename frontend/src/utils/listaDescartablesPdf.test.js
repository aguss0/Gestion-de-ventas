/** @jest-environment node */
import { crearListaDescartables, preciosDescartable } from './listaDescartablesPdf';

const articulo = { codigo: 'AEA', nombre: 'BENGALA X 12 UNI', categoria: 'Cotillón', costoBulto: 16500, unidadesBulto: 12 };
test('calcula recargos independientes sin IVA', () => {
  expect(preciosDescartable(articulo, 30, 20)).toEqual({ unidad: 1787.5, bulto: 19800 });
  expect(preciosDescartable(articulo, 0, 0).unidad).toBe(1375);
});
test('impide exportar cantidades desconocidas y selecciones vacías', () => {
  expect(() => preciosDescartable({ ...articulo, unidadesBulto: null }, 30, 20)).toThrow();
  expect(() => preciosDescartable(articulo, -1, 20)).toThrow();
  expect(() => crearListaDescartables([], 0, 0)).toThrow();
});
