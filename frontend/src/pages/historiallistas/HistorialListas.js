import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Layout } from '../../components/Layout';
import { crearListaDesdeHistorial } from '../../utils/listaHistorialPdf';
import { GeneradorListas } from './GeneradorListas';
import '../descartables/Descartables.css';

const fecha = valor => new Date(valor).toLocaleString('es-AR');
const dinero = valor => valor == null ? '—' : Number(valor).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

export function HistorialListas() {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState('todos');
  const [detalle, setDetalle] = useState(null);
  const [abriendo, setAbriendo] = useState(null);
  const [usando, setUsando] = useState(null);
  const { data: listas = [], isLoading, error } = useQuery({ queryKey: ['historial-listas', tipo], queryFn: () => api.get('/historial-listas', { params: { tipo } }).then(r => r.data) });
  const descargar = lista => {
    try { crearListaDesdeHistorial(lista).save(`lista-precios-${lista.tipo}-${lista.id}.pdf`); }
    catch (e) { toast.error(e.message || 'No se pudo descargar la lista'); }
  };
  const ver = async id => {
    setAbriendo(id);
    try {
      const cargada = listas.find(lista => lista.id === id && Array.isArray(lista.items));
      setDetalle(cargada || (await api.get(`/historial-listas/${id}`)).data);
    }
    catch { toast.error('No se pudo abrir la lista'); }
    finally { setAbriendo(null); }
  };
  const usarEnPedido = async lista => {
    setUsando(lista.id);
    try {
      const respuesta = await api.post(`/historial-listas/${lista.id}/precios`);
      toast.success('Precios aplicados únicamente a este pedido nuevo.');
      const predeterminado = lista.tipo === 'mf' ? 'mf' : 'descartables';
      navigate('/pedidos/nuevo', { state: { catalogo: respuesta?.data?.catalogo || predeterminado, preciosLista: respuesta?.data?.precios || [] } });
    } catch (e) { toast.error(e.response?.data?.error || 'No se pudieron cargar los precios en el pedido'); }
    finally { setUsando(null); }
  };
  return <Layout titulo="Listas de precios"><div className="descartables">
    <GeneradorListas />
    <hr className="separador-listas" />
    <h2>Historial de listas guardadas</h2>
    <div className="toolbar"><select aria-label="Tipo de lista" value={tipo} onChange={e => setTipo(e.target.value)}><option value="todos">Todas</option><option value="general">Combinadas</option><option value="descartables">Descartables</option><option value="mf">MF</option></select><span>{listas.length} listas guardadas</span></div>
    {error && <p role="alert">No se pudo cargar el historial</p>}
    <div className="table-wrap"><table><thead><tr><th>N.º</th><th>Fecha</th><th>Tipo</th><th>Artículos</th><th>Recargo unidad</th><th>Recargo bulto</th><th>Acciones</th></tr></thead><tbody>
      {isLoading && <tr><td colSpan="7">Cargando…</td></tr>}
      {!isLoading && !listas.length && <tr><td colSpan="7">Todavía no hay listas guardadas.</td></tr>}
      {listas.map(lista => <tr key={lista.id}><td>#{lista.id}</td><td>{fecha(lista.creadoEn)}</td><td>{lista.tipo === 'general' ? 'Combinada' : lista.tipo === 'mf' ? 'MF' : 'Descartables'}</td><td>{lista.cantidad}</td><td>{lista.tipo === 'general' ? 'Según grupo' : `${lista.recargoUnidad}%`}</td><td>{lista.tipo === 'general' ? 'Según grupo' : `${lista.recargoBulto}%`}</td><td><button className="primary" disabled={abriendo === lista.id} onClick={() => ver(lista.id)}>{abriendo === lista.id ? 'Abriendo…' : 'Ver y descargar'}</button></td></tr>)}
    </tbody></table></div>
    {detalle && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label="Detalle de lista"><h2>Lista #{detalle.id} · {detalle.tipo === 'general' ? 'Combinada' : detalle.tipo === 'mf' ? 'MF' : 'Descartables'}</h2><p>{fecha(detalle.creadoEn)} · {detalle.cantidad} artículos</p><div className="preview"><table><thead><tr><th>Categoría</th><th>Código</th><th>Artículo</th><th>Presentación</th><th>Precio unidad</th><th>Precio bulto</th></tr></thead><tbody>{detalle.items.map((a, i) => <tr key={`${a.codigo}-${i}`}><td>{({ snacks: 'Snacks', descartables: 'Descartables', mf: 'Dietética', frutos_secos: 'Frutos secos' })[a.grupo] || '—'}</td><td>{a.codigo || '—'}</td><td>{a.nombre}</td><td>{a.presentacion || (a.unidadesBulto ? `${a.unidadesBulto} unidades` : '—')}</td><td className="money">{dinero(a.precioUnidad)}</td><td className="money">{dinero(a.precioBulto)}</td></tr>)}</tbody></table></div><p className="hint">“Usar en nuevo pedido” aplica estos valores solamente al pedido que se abre. Los precios base nunca se modifican.</p><div className="toolbar"><button onClick={() => setDetalle(null)}>Cerrar</button><button onClick={() => descargar(detalle)}>Descargar PDF</button><button className="primary" disabled={usando === detalle.id} onClick={() => usarEnPedido(detalle)}>{usando === detalle.id ? 'Cargando…' : 'Usar en nuevo pedido'}</button></div></section></div>}
  </div></Layout>;
}
