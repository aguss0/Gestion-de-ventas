import { render, screen, fireEvent } from '@testing-library/react';
import { Descartables } from './Descartables';
jest.mock('../../components/Layout', () => ({ Layout: ({ children }) => <div>{children}</div> }));
jest.mock('../../services/api', () => ({}));
jest.mock('../../utils/listaDescartablesPdf', () => ({ crearListaDescartables: jest.fn(), preciosDescartable: jest.fn() }));
jest.mock('../../utils/listaHistorialPdf', () => ({ crearListaDesdeHistorial: jest.fn() }));
jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }) => ({ data: queryKey[0] === 'descartables' ? [
    { id: 1, codigo: 'AEA', nombre: 'Bengala', categoria: 'AEROCOR / 100- LINEA', costoBulto: 16500, unidadesBulto: 12 },
    { id: 2, codigo: 'OTRO', nombre: 'Sin categoría reconocida', categoria: 'Otros', costoBulto: 100, unidadesBulto: 10 },
  ] : { ventas: 0, pedidos: 0, unidades: 0, bultos: 0 } }),
  useMutation: () => ({ mutate: jest.fn() }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
test('muestra costos originales y dos finales sin asumir tasa cero para categorías desconocidas', () => {
  render(<Descartables />);
  expect(screen.getByRole('columnheader', { name: 'Costo por unidad' })).toBeTruthy();
  expect(screen.getByRole('columnheader', { name: 'Costo por bulto' })).toBeTruthy();
  expect(screen.getByRole('columnheader', { name: /Precio venta unidad/i })).toBeTruthy();
  expect(screen.getByRole('columnheader', { name: /Precio venta bulto/i })).toBeTruthy();
  expect(screen.getByText(/19\.366,05/)).toBeTruthy();
  expect(screen.getByText(/1\.613,84/)).toBeTruthy();
  expect(screen.getByText(/16\.500,00/)).toBeTruthy();
  expect(screen.getAllByText('Revisar categoría')).toHaveLength(2);
});
test('una categoría desconocida impide descargar o publicar sin romper la vista previa', () => {
  render(<Descartables />);
  fireEvent.click(screen.getByLabelText('Seleccionar OTRO'));
  fireEvent.click(screen.getByRole('button', { name: 'Generar lista PDF (1)' }));
  expect(screen.getByRole('button', { name: 'Descargar PDF' }).disabled).toBe(true);
  expect(screen.getByRole('button', { name: 'Usar estos precios en pedidos' }).disabled).toBe(true);
});
