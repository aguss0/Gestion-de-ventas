import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Layout } from '../../components/Layout';
import './Descartables.css';
import { costosFinalesDescartable } from '../../utils/costosDescartables';

const dinero = n => Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const errorTexto = e => e.response?.data?.error || e.message || 'No se pudo completar la operación';

function Unidades({ articulo, onGuardar, pendiente }) {
  const [valor, setValor] = useState(articulo.unidadesBulto ?? '');
  return <div style={{ display: 'flex', gap: 4 }}>
    <input aria-label={`Unidades por bulto ${articulo.codigo}`} type="number" min="1" step="1" value={valor} onChange={e => setValor(e.target.value)} style={{ width: 80 }} placeholder="Revisar" />
    {String(valor) !== String(articulo.unidadesBulto ?? '') && <button disabled={pendiente || !Number.isInteger(Number(valor)) || Number(valor) < 1} onClick={() => onGuardar({ id: articulo.id, unidadesBulto: Number(valor) })}>Guardar</button>}
  </div>;
}

export function Descartables() {
  const qc = useQueryClient(), archivoRef = useRef();
  const [buscar, setBuscar] = useState(''), [categoria, setCategoria] = useState('');
  const [revisar, setRevisar] = useState(false), [pagina, setPagina] = useState(0);
  const [preview, setPreview] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [desde, setDesde] = useState(''), [hasta, setHasta] = useState('');
  const { data: articulos = [], isLoading, error } = useQuery({ queryKey: ['descartables'], queryFn: () => api.get('/descartables').then(r => r.data) });
  const { data: resumen, error: errorResumen } = useQuery({ queryKey: ['descartables-resumen', desde, hasta], queryFn: () => api.get('/descartables/resumen', { params: { desde, hasta } }).then(r => r.data) });
  const importar = useMutation({
    mutationFn: async ({ archivo: file, confirmar }) => {
      const body = new FormData(); body.append('archivo', file);
      return (await api.post(`/descartables/importar${confirmar ? '' : '?preview=1'}`, body, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 })).data;
    },
    onSuccess: (data, variables) => {
      if (!variables.confirmar) setPreview(data);
      else {
        toast.success(`${data.creados} nuevos; ${data.actualizados} actualizados. ${data.porRevisar} para revisar.`);
        setPreview(null); setArchivo(null); qc.invalidateQueries({ queryKey: ['descartables'] });
      }
    }, onError: e => toast.error(errorTexto(e)),
  });
  const guardarUnidades = useMutation({ mutationFn: ({ id, unidadesBulto }) => api.patch(`/descartables/${id}/unidades`, { unidadesBulto }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['descartables'] }); toast.success('Cantidad actualizada'); }, onError: e => toast.error(errorTexto(e)) });
  const completar = useMutation({ mutationFn: () => api.post('/descartables/completar-unidades', {}, { timeout: 180000 }),
    onSuccess: ({ data }) => { qc.invalidateQueries({ queryKey: ['descartables'] }); toast.success(`${data.completados} cantidades completadas. ${data.pendientes} pendientes sin cantidad clara en la descripción.`); },
    onError: e => toast.error(errorTexto(e)) });
  const filtrados = articulos.filter(a => (!categoria || a.categoria === categoria) && (!revisar || !a.unidadesBulto) && `${a.codigo} ${a.nombre}`.toLowerCase().includes(buscar.toLowerCase()));
  const paginas = Math.max(1, Math.ceil(filtrados.length / 50)), paginaActual = Math.min(pagina, paginas - 1);
  return <Layout titulo="Descartables"><div className="descartables">
    <div className="toolbar"><strong>Resumen de ventas</strong><label>Desde <input type="date" value={desde} onChange={e => setDesde(e.target.value)} /></label><label>Hasta <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></label><button onClick={() => { setDesde(''); setHasta(''); }}>Todo el historial</button></div>
    {errorResumen ? <p role="alert">{errorTexto(errorResumen)}</p> : <div className="cards">{[['Ventas de descartables', resumen ? dinero(resumen.ventas) : '…'], ['Pedidos', resumen?.pedidos ?? '…'], ['Unidades vendidas', resumen?.unidades ?? '…'], ['Bultos vendidos', resumen?.bultos ?? '…']].map(([nombre, valor]) => <div className="card" key={nombre}><span>{nombre}</span><strong>{valor}</strong></div>)}</div>}
    <p className="hint">El resumen incluye únicamente descartables vendidos en pedidos activos, descontando faltantes. Unidades y bultos se muestran por separado.</p>
    <div className="toolbar">
      <input ref={archivoRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={e => {
        const file = e.target.files[0]; e.target.value = ''; if (!file) return;
        if (file.size > 20 * 1024 * 1024) return toast.error('El PDF supera 20 MB');
        setArchivo(file); importar.mutate({ archivo: file, confirmar: false });
      }} />
      <button className="primary" disabled={importar.isPending} onClick={() => archivoRef.current.click()}>{importar.isPending ? 'Leyendo PDF…' : 'Importar lista PDF'}</button>
      <button disabled={completar.isPending || importar.isPending || !articulos.some(a => !a.unidadesBulto)} onClick={() => completar.mutate()}>{completar.isPending ? 'Completando…' : 'Completar cantidades automáticamente'}</button>
    </div>
    {!!articulos.filter(a => !a.unidadesBulto).length && <div className="warning">{articulos.filter(a => !a.unidadesBulto).length} artículos requieren revisar las unidades por bulto antes de calcular su precio unitario.</div>}
    <div className="toolbar"><input aria-label="Buscar descartables" placeholder="Buscar código o artículo…" value={buscar} onChange={e => { setBuscar(e.target.value); setPagina(0); }} /><select aria-label="Categoría" value={categoria} onChange={e => { setCategoria(e.target.value); setPagina(0); }}><option value="">Todas las categorías</option>{[...new Set(articulos.map(a => a.categoria))].map(c => <option key={c}>{c}</option>)}</select><label><input type="checkbox" checked={revisar} onChange={e => { setRevisar(e.target.checked); setPagina(0); }} />Solo a revisar</label><span>{filtrados.length} artículos</span></div>
    {error && <p role="alert">{errorTexto(error)}</p>}
    <p className="hint">Costos finales: categoría 100 = +21%; 50 = +10,5%; 0 = sin recargo. Luego se descuenta el 3% en todos los casos. El porcentaje de venta del PDF se aplica sobre estos costos finales. Los pedidos existentes no cambian.</p>
    <div className="table-wrap"><table><thead><tr><th>Código</th><th>Artículo / categoría</th><th>Unidades por bulto</th><th>Costo por unidad</th><th>Costo por bulto</th><th>Precio Venta unidad</th><th>Precio venta bulto</th></tr></thead><tbody>
      {isLoading && <tr><td colSpan="7">Cargando…</td></tr>}
      {!isLoading && !filtrados.length && <tr><td colSpan="7">No hay artículos. Importá la lista del proveedor o cambiá los filtros.</td></tr>}
      {filtrados.slice(paginaActual * 50, (paginaActual + 1) * 50).map(a => {
        const finales = costosFinalesDescartable(a);
        return <tr key={a.id}><td>{a.codigo}</td><td>{a.nombre}<div className="hint">{a.categoria}</div></td><td><Unidades key={`${a.id}-${a.unidadesBulto}`} articulo={a} onGuardar={guardarUnidades.mutate} pendiente={guardarUnidades.isPending} /></td><td className="money">{a.unidadesBulto ? dinero(a.costoBulto / a.unidadesBulto) : 'A revisar'}</td><td className="money">{dinero(a.costoBulto)}</td><td className="money">{finales.unidad == null ? finales.motivo : dinero(finales.unidad)}</td><td className="money">{finales.bulto == null ? finales.motivo : dinero(finales.bulto)}</td></tr>;
      })}
    </tbody></table></div>
    <div className="toolbar" style={{ marginTop: 12 }}><button disabled={!paginaActual} onClick={() => setPagina(paginaActual - 1)}>Anterior</button><span>Página {paginaActual + 1} de {paginas}</span><button disabled={paginaActual + 1 >= paginas} onClick={() => setPagina(paginaActual + 1)}>Siguiente</button></div>

    {preview && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label="Revisar importación"><h2>Revisar importación</h2><p>{preview.articulos.length} artículos detectados en {preview.paginas} páginas.</p><p className="hint">Se agregan códigos nuevos y se actualizan costos y descripciones de los existentes. No se borran artículos ausentes ni se cambian ventas o precios de venta anteriores. Las cantidades corregidas manualmente se conservan.</p><p>{preview.articulos.filter(a => !a.unidadesBulto).length} cantidades no pudieron interpretarse y requerirán revisión.</p><div className="preview"><table><thead><tr><th>Código</th><th>Descripción (muestra)</th><th>Costo bulto</th></tr></thead><tbody>{preview.articulos.slice(0, 10).map(a => <tr key={a.codigo}><td>{a.codigo}</td><td>{a.nombre}</td><td>{dinero(a.costoBulto)}</td></tr>)}</tbody></table></div><div className="toolbar"><button disabled={importar.isPending} onClick={() => { setPreview(null); setArchivo(null); }}>Cancelar</button><button className="primary" disabled={importar.isPending} onClick={() => importar.mutate({ archivo, confirmar: true })}>{importar.isPending ? 'Importando…' : 'Confirmar importación'}</button></div></section></div>}


  </div></Layout>;
}
