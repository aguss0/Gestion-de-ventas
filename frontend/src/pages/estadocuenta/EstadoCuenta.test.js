import { render, screen, fireEvent } from '@testing-library/react';
import { EstadoCuenta } from './EstadoCuenta';
jest.mock('../../components/Layout', () => ({ Layout: ({ children }) => <div>{children}</div> }));
jest.mock('../../services/pedidoService', () => ({ estadoCuentaService: { listar: jest.fn() } }));
jest.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [
  { id: 1, nroOrden: 1, clienteId: 1, cliente: 'Ana', categorias: ['papas'], totalVenta: 100, pagado: 0, saldo: 100 },
  { id: 2, nroOrden: 2, clienteId: 1, cliente: 'Ana', categorias: ['papas', 'dietetica'], totalVenta: 300, pagado: 90, saldo: 210 },
  { id: 3, nroOrden: 3, clienteId: 2, cliente: 'Luis', categorias: ['dietetica'], totalVenta: 400, pagado: 0, saldo: 400 },
] }) }));
test('combina cliente y categoría conservando los importes del pedido mixto', () => {
  render(<EstadoCuenta />);
  fireEvent.focus(screen.getByLabelText('Cliente'));
  fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'an' } });
  fireEvent.click(screen.getByRole('option', { name: 'Ana' }));
  fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: 'dietetica' } });
  expect(screen.queryByText('#1')).toBeNull();
  expect(screen.queryByText('#3')).toBeNull();
  expect(screen.getByText('#2')).toBeTruthy();
  expect(screen.getByText('Mixto: Laurens / Dietética')).toBeTruthy();
  expect(screen.getAllByText('$300').length).toBe(2);
  expect(screen.getAllByText('$90').length).toBe(2);
  expect(screen.getAllByText('$210').length).toBe(2);
  fireEvent.click(screen.getByText('Limpiar filtros'));
  expect(screen.getByText('#1')).toBeTruthy();
  expect(screen.getByText('#3')).toBeTruthy();
});
test('un único buscador permite elegir con teclado y volver a todos', () => {
  render(<EstadoCuenta />);
  const input = screen.getByRole('combobox', { name: 'Cliente' });
  expect(screen.queryByPlaceholderText('Buscar cliente o vendedor...')).toBeNull();
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'lu' } });
  expect(screen.queryByRole('option', { name: 'Ana' })).toBeNull();
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(input.value).toBe('Luis');
  expect(screen.queryByText('#1')).toBeNull();
  fireEvent.click(input);
  fireEvent.change(input, { target: { value: 'inexistente' } });
  expect(screen.getByText('No se encontraron clientes')).toBeTruthy();
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(input.value).toBe('Luis');
  fireEvent.click(input);
  fireEvent.click(screen.getByRole('option', { name: 'Todos los clientes' }));
  expect(input.value).toBe('');
  expect(screen.getByText('#1')).toBeTruthy();
});
