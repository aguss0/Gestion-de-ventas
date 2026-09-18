import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Layout } from '../../components/Layout';
import '../descartables/Descartables.css';

const dinero = n => n == null ? '—' : Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const errorTexto = e => e.response?.data?.error || e.message || 'No se pudo completar la operación';

export function Dietetica() {
  const qc = useQueryClient(), archivoRef = useRef();
  const [buscar, setBuscar] = useState(''), [categoria, setCategoria] = useState('');
  const [revisar, setRevisar] = useState(false), [pagina, setPagina] = useState(0);
  const [preview, setPreview] = useState(null);
  const [archivo, setArchivo] = useState(null);
  const [desde, setDesde] = useState(''), [hasta, setHasta] = useState('');
  const [tipoBloqueFinal, setTipoBloqueFinal] = useState('pendiente');
  const { data: articulos = [], isLoading, error } = useQuery({ queryKey: ['dietetica'], queryFn: () => api.get('/dietetica').then(r => r.data) });
  const { data: resumen, error: errorResumen } = useQuery({ queryKey: ['dietetica-resumen', desde, hasta], queryFn: () => api.get('/dietetica/resumen', { params: { desde, hasta } }).then(r => r.data) });
  const importar = useMutation({
    mutationFn: async ({ archivo: file, confirmar, tipo = tipoBloqueFinal }) => {
      const body = new FormData(); body.append('archivo', file);
      body.append('tipoBloqueFinal', tipo);
      return (await api.post(`/dietetica/importar${confirmar ? '' : '?preview=1'}`, body, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 })).data;
    },
    onSuccess: (data, variables) => {
      if (!variables.confirmar) setPreview(data);
      else {
        toast.success(`${data.creados} nuevos; ${data.actualizados} actualizados. ${data.porRevisar} para revisar.`);
        setPreview(null); setArchivo(null); qc.invalidateQueries({ queryKey: ['dietetica'] });
      }
    }, onError: e => toast.error(errorTexto(e)),
  });
  const filtrados = articulos.filter(a => (!categoria || a.categoria === categoria) && (!revisar || (a.costoMayorista != null && a.costoBulto == null)) && `${a.codigo} ${a.nombre}`.toLowerCase().includes(buscar.toLowerCase()));
  const paginas = Math.max(1, Math.ceil(filtrados.length / 50)), paginaActual = Math.min(pagina, paginas - 1);
  return <Layout titulo="MF"><div className="descartables">
    <div className="toolbar"><strong>Resumen de ventas</strong><label>Desde <input type="date" value={desde} onChange={e => setDesde(e.target.value)} /></label><label>Hasta <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></label><button onClick={() => { setDesde(''); setHasta(''); }}>Todo el historial</button></div>
    {errorResumen ? <p role="alert">{errorTexto(errorResumen)}</p> : <div className="cards">{[['Ventas de dietética', resumen ? dinero(resumen.ventas) : '…'], ['Pedidos', resumen?.pedidos ?? '…'], ['Unidades/kg vendidos', resumen?.unidades ?? '…'], ['Bultos vendidos', resumen?.bultos ?? '…']].map(([nombre, valor]) => <div className="card" key={nombre}><span>{nombre}</span><strong>{valor}</strong></div>)}</div>}
    <p className="hint">El resumen incluye únicamente productos de dietética vendidos en pedidos activos, descontando faltantes. Unidad/kg y bultos se muestran por separado.</p>
    <div className="toolbar">
      <input ref={archivoRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{ display: 'none' }} onChange={e => {
        const file = e.target.files[0]; e.target.value = ''; if (!file) return;
        if (file.size > 20 * 1024 * 1024) return toast.error('El Excel supera 20 MB');
        setArchivo(file); importar.mutate({ archivo: file, confirmar: false });
      }} />
      <button className="primary" disabled={importar.isPending} onClick={() => archivoRef.current.click()}>{importar.isPending ? 'Leyendo Excel…' : 'Importar lista Excel'}</button>
    </div>
    {articulos.some(a => a.tipoBulto === "pendiente") && <div className="warning">El bloque con encabezado “PRECIO X BULTO” necesita confirmar si el importe ya es total. Esos precios no se publican automáticamente.</div>}
    <div className="toolbar"><input aria-label="Buscar MF" placeholder="Buscar código o artículo…" value={buscar} onChange={e => { setBuscar(e.target.value); setPagina(0); }} /><select aria-label="Categoría" value={categoria} onChange={e => { setCategoria(e.target.value); setPagina(0); }}><option value="">Todas las categorías</option>{[...new Set(articulos.map(a => a.categoria))].map(c => <option key={c}>{c}</option>)}</select><label><input type="checkbox" checked={revisar} onChange={e => { setRevisar(e.target.checked); setPagina(0); }} />Solo a revisar</label><span>{filtrados.length} artículos</span></div>
    {error && <p role="alert">{errorTexto(error)}</p>}
    <div className="table-wrap"><table><thead><tr><th>Código</th><th>Artículo / categoría</th><th>Presentación</th><th>Costo unidad/kg</th><th>Precio mayorista de origen</th><th>Costo por bulto</th></tr></thead><tbody>
      {isLoading && <tr><td colSpan="6">Cargando…</td></tr>}
      {!isLoading && !filtrados.length && <tr><td colSpan="6">No hay artículos. Importá la lista del proveedor o cambiá los filtros.</td></tr>}
      {filtrados.slice(paginaActual * 50, (paginaActual + 1) * 50).map(a => <tr key={a.id}><td>{a.codigo}</td><td>{a.nombre}<div className="hint">{a.categoria}{a.sinStock ? " · SIN STOCK" : ""}{a.costoMayorista != null && a.costoBulto == null ? " · Total de bulto pendiente" : ""}</div></td><td>{a.presentacion || "No informada"}</td><td className="money">{dinero(a.costoUnidad)}</td><td className="money">{dinero(a.costoMayorista)}</td><td className="money">{dinero(a.costoBulto)}</td></tr>)}
    </tbody></table></div>
    <div className="toolbar" style={{ marginTop: 12 }}><button disabled={!paginaActual} onClick={() => setPagina(paginaActual - 1)}>Anterior</button><span>Página {paginaActual + 1} de {paginas}</span><button disabled={paginaActual + 1 >= paginas} onClick={() => setPagina(paginaActual + 1)}>Siguiente</button></div>

    {preview && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label="Revisar importación"><h2>Revisar importación</h2><div className="warning"><label>Bloque final de copos y almohaditas: <select value={tipoBloqueFinal} disabled={importar.isPending} onChange={e => { const tipo = e.target.value; setTipoBloqueFinal(tipo); importar.mutate({ archivo, confirmar: false, tipo }); }}><option value="pendiente">Dejar pendiente de confirmar</option><option value="total">El importe ya es el total del bulto</option><option value="unitario">El importe es por unidad/kg (multiplicar)</option></select></label><p>Esta elección se aplica únicamente al bloque con encabezado “PRECIO X BULTO”. El resto se calcula por unidad/kg mayorista × presentación.</p></div><p>{preview.articulos.length} artículos detectados en {preview.paginas} hojas.</p><p className="hint">Se identifican los productos por nombre y presentación (el Excel no trae códigos) y se actualizan sus costos. No se borran artículos ausentes ni se cambian ventas o precios de venta anteriores. Los guiones y “SIN STOCK” no se interpretan como cero.</p><p>{preview.advertencias.length} avisos de productos repetidos. Se importa una sola vez cada nombre y presentación.</p><div className="preview"><table><thead><tr><th>Código</th><th>Descripción (muestra)</th><th>Costo bulto</th></tr></thead><tbody>{preview.articulos.slice(0, 10).map(a => <tr key={a.codigo}><td>{a.codigo}</td><td>{a.nombre}</td><td>{dinero(a.costoBulto)}</td></tr>)}</tbody></table></div><div className="toolbar"><button disabled={importar.isPending} onClick={() => { setPreview(null); setArchivo(null); }}>Cancelar</button><button className="primary" disabled={importar.isPending} onClick={() => importar.mutate({ archivo, confirmar: true })}>{importar.isPending ? 'Importando…' : 'Confirmar importación'}</button></div></section></div>}


  </div></Layout>;
}
