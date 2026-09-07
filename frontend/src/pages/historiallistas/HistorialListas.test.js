import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HistorialListas } from './HistorialListas';
import api from '../../services/api';
const mockNavigate = jest.fn();
jest.mock('../../components/Layout', () => ({ Layout: ({ children }) => <div>{children}</div> }));
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));
jest.mock('../../services/api', () => ({ get: jest.fn(() => Promise.resolve({ data: { id: 7, tipo: 'descartables', creadoEn: '2026-09-03T12:00:00.000Z', cantidad: 1, recargoUnidad: 30, recargoBulto: 20, items: [{ codigo: 'AEA', nombre: 'Bengala', unidadesBulto: 12, precioUnidad: 2097.99, precioBulto: 23239.26 }] } })), post: jest.fn(() => Promise.resolve({ data: { precios: [{ articuloId: 11, precio: 2097.99 }], catalogo: 'descartables' } })) }));
jest.mock('../../utils/listaHistorialPdf', () => ({ crearListaDesdeHistorial: jest.fn() }));
jest.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }) => queryKey[0] === 'datos-generador-listas'
    ? ({ data: { articulos: [], descartables: [], mf: [] } })
    : ({ data: [{ id: 7, tipo: 'descartables', creadoEn: '2026-09-03T12:00:00.000Z', cantidad: 1, recargoUnidad: 30, recargoBulto: 20, items: [{ codigo: 'AEA', nombre: 'Bengala', unidadesBulto: 12, precioUnidad: 2097.99, precioBulto: 23239.26 }] }] }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

test('consulta la fotografía de una lista guardada', async () => {
  render(<HistorialListas />);
  expect(screen.getByText('#7')).toBeTruthy();
  expect(screen.getByText('30%')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Ver y descargar' }));
  await waitFor(() => expect(screen.getByText('Bengala')).toBeTruthy());
  expect(screen.getByText(/2\.097,99/)).toBeTruthy();
  expect(screen.getByText(/23\.239,26/)).toBeTruthy();
});

test('carga los precios históricos y abre un pedido nuevo', async () => {
  api.post.mockResolvedValueOnce({ data: { precios: [{ articuloId: 11, precio: 2097.99 }], catalogo: 'descartables' } });
  render(<HistorialListas />);
  fireEvent.click(screen.getByRole('button', { name: 'Ver y descargar' }));
  await waitFor(() => screen.getByRole('button', { name: 'Usar en nuevo pedido' }));
  fireEvent.click(screen.getByRole('button', { name: 'Usar en nuevo pedido' }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/pedidos/nuevo', { state: { catalogo: 'descartables', preciosLista: [{ articuloId: 11, precio: 2097.99 }] } }));
});
