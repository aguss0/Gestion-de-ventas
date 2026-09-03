import { costosFinalesDescartable } from './costosDescartables';

test.each([
  ['100', 19366.05, 1613.84],
  ['50', 17685.525, 1473.79],
  ['0', 16005, 1333.75],
])('aplica recargo %s y luego descuento del 3%%', (codigo, total, unidad) => {
  const resultado = costosFinalesDescartable({ categoria: `AEROCOR AEROSOLES / ${codigo}- LINEA COTILLON`, costoBulto: 16500, unidadesBulto: 12 });
  expect(resultado.bulto).toBe(Math.round(total * 100) / 100);
  expect(resultado.unidad).toBe(unidad);
});
test('no supone tasa cero para categorías desconocidas o códigos de artículo', () => {
  for (const categoria of ['', 'Sin categoría', '1000- OTROS', '100- GRUPO / SIN CODIGO']) {
    expect(costosFinalesDescartable({ categoria, costoBulto: 100, unidadesBulto: 2 }).motivo).toBe('Revisar categoría');
  }
});
test('calcula el bulto aunque falten las unidades y conserva el costo original', () => {
  const articulo = { categoria: '0 - ALUMINIO', costoBulto: 100, unidadesBulto: null };
  expect(costosFinalesDescartable(articulo)).toEqual({ bulto: 97, unidad: null, motivo: 'Revisar unidades' });
  expect(articulo.costoBulto).toBe(100);
});
test('redondea al final y valida costos', () => {
  expect(costosFinalesDescartable({ categoria: '50- LINEA', costoBulto: 100, unidadesBulto: 3 }).unidad).toBe(35.73);
  expect(costosFinalesDescartable({ categoria: '100- LINEA', costoBulto: null }).motivo).toBe('Revisar costo');
});
