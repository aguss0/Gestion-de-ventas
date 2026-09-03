import { render, screen, fireEvent } from '@testing-library/react';
import { Articulos } from './Articulos';
jest.mock('../../components/Layout', () => ({ Layout: ({ children }) => <div>{children}</div> }));
jest.mock('../../services/api', () => ({ get: jest.fn(), post: jest.fn(), patch: jest.fn() }));
jest.mock('../../services/clienteService', () => ({ importarService: {}, importarPDFService: {} }));
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [
    { id: 1, nombre: 'Papas Laurens', precio: 100, activo: true, manejaStock: false },
    { id: 2, nombre: 'Almendras propias', precio: 200, activo: true, manejaStock: true, stock: 10, stockMinimo: 2 },
    { id: 3, nombre: 'Stevia MF', precio: 300, activo: true, dieteticaId: 1 },
    { id: 4, nombre: 'Vasos', precio: 400, activo: true, descartableId: 1 },
  ] }), useMutation: () => ({ mutate: jest.fn() }), useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
test('Laurens no mezcla productos con stock ni catálogos importados', () => {
  render(<Articulos />);
  expect(screen.getByText('Papas Laurens')).toBeTruthy();
  expect(screen.queryByText('Almendras propias')).toBeNull();
  expect(screen.queryByText('Stevia MF')).toBeNull();
  expect(screen.queryByText('Vasos')).toBeNull();
});
test('Dietética usa carga manual y stock obligatorio', () => {
  render(<Articulos conStock embedded />);
  expect(screen.queryByText('Solo con stock')).toBeNull();
  expect(screen.queryByText('Ver solo con stock')).toBeNull();
  expect(screen.getByText('Almendras propias')).toBeTruthy();
  expect(screen.queryByText('Papas Laurens')).toBeNull();
  expect(screen.queryByText('📥 Excel')).toBeNull();
  fireEvent.click(screen.getByText('+ Nuevo artículo'));
  const stock = screen.getByRole('checkbox', { name: 'Manejar stock para este artículo' });
  expect(stock.checked).toBe(true);
  expect(stock.disabled).toBe(true);
  expect(screen.getByText('Stock actual')).toBeTruthy();
});
