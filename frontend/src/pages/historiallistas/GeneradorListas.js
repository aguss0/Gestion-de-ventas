import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { preciosDescartable } from '../../utils/listaDescartablesPdf';
import { preciosDietetica } from '../../utils/listaDieteticaPdf';
import { crearListaDesdeHistorial } from '../../utils/listaHistorialPdf';

const grupos = {
  snacks: { titulo: 'Snacks', catalogo: 'Laurens' },
  descartables: { titulo: 'Descartables', catalogo: 'Descartables' },
  mf: { titulo: 'Dietética', catalogo: 'MF' },
  frutos_secos: { titulo: 'Frutos secos', catalogo: 'Dietética' },
};
const dinero = n => n == null ? '—' : Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
const redondear = n => Math.round((n + Number.EPSILON * Math.max(1, n)) * 100) / 100;
const errorTexto = e => e.response?.data?.error || e.message || 'No se pudo completar la operación';

export function GeneradorListas() {
  const qc = useQueryClient();
  const [grupo, setGrupo] = useState('snacks');
  const [buscar, setBuscar] = useState('');
  const [seleccion, setSeleccion] = useState([]);
  const [aumentoLaurens, setAumentoLaurens] = useState('0');
  const [descUnidad, setDescUnidad] = useState('0'), [descBulto, setDescBulto] = useState('0');
  const [mfUnidad, setMfUnidad] = useState('0'), [mfBulto, setMfBulto] = useState('0');
  const [guardando, setGuardando] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['datos-generador-listas'],
    queryFn: async () => {
      const [articulos, descartables, mf] = await Promise.all([api.get('/articulos'), api.get('/descartables'), api.get('/dietetica')]);
      return { articulos: articulos.data, descartables: descartables.data, mf: mf.data };
    },
  });
  const candidatos = useMemo(() => {
    if (!data) return [];
    const comunes = data.articulos.filter(a => a.activo && a.descartableId == null && a.dieteticaId == null);
    return [
      ...comunes.filter(a => !a.manejaStock).map(a => ({ ...a, grupo: 'snacks', clave: `snacks:${a.id}` })),
      ...data.descartables.map(a => ({ ...a, grupo: 'descartables', clave: `descartables:${a.id}` })),
      ...data.mf.map(a => ({ ...a, grupo: 'mf', clave: `mf:${a.id}` })),
      ...comunes.filter(a => a.manejaStock).map(a => ({ ...a, grupo: 'frutos_secos', clave: `frutos_secos:${a.id}` })),
    ];
  }, [data]);
  const visibles = candidatos.filter(a => a.grupo === grupo && `${a.codigo || ''} ${a.nombre}`.toLowerCase().includes(buscar.toLowerCase()));
  const elegidos = candidatos.filter(a => seleccion.includes(a.clave));
  const porcentajesValidos = [aumentoLaurens, descUnidad, descBulto, mfUnidad, mfBulto].every(v => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 10000);

  function convertir(a) {
    if (a.grupo === 'snacks') return { grupo: a.grupo, articuloId: a.id, codigo: a.codigo, nombre: a.nombre, presentacion: a.unidadCaja, precioUnidad: redondear(Number(a.precio) * (1 + Number(aumentoLaurens) / 100)), precioBulto: null };
    if (a.grupo === 'frutos_secos') return { grupo: a.grupo, articuloId: a.id, codigo: a.codigo, nombre: a.nombre, presentacion: a.unidadCaja, precioUnidad: Number(a.precio), precioBulto: null };
    if (a.grupo === 'descartables') {
      const p = preciosDescartable(a, descUnidad, descBulto);
      return { grupo: a.grupo, codigo: a.codigo, nombre: a.nombre, presentacion: a.unidadesBulto ? `${a.unidadesBulto} unidades` : null, unidadesBulto: a.unidadesBulto, precioUnidad: p.unidad, precioBulto: p.bulto };
    }
    const p = preciosDietetica(a, mfUnidad, mfBulto);
    return { grupo: a.grupo, codigo: a.codigo, nombre: a.nombre, presentacion: a.presentacion, precioUnidad: p.unidad, precioBulto: p.bulto };
  }
  let items = [], errorCalculo = '';
  try { if (porcentajesValidos) items = elegidos.map(convertir); } catch (e) { errorCalculo = e.message; }
  const puedeGenerar = items.length > 0 && !errorCalculo;
  const lista = () => ({ tipo: 'general', creadoEn: new Date().toISOString(), recargoUnidad: 0, recargoBulto: 0, items });
  const descargar = () => { try { crearListaDesdeHistorial(lista()).save('lista-de-precios.pdf'); toast.success('Lista descargada'); } catch (e) { toast.error(errorTexto(e)); } };
  const guardar = async () => {
    setGuardando(true);
    try { await api.post('/historial-listas', lista()); qc.invalidateQueries({ queryKey: ['historial-listas'] }); toast.success('Lista guardada en el historial'); }
    catch (e) { toast.error(errorTexto(e)); } finally { setGuardando(false); }
  };
  const toggle = clave => setSeleccion(s => s.includes(clave) ? s.filter(x => x !== clave) : [...s, clave]);
  return <section className="generador-listas">
    <h2>Generar lista de precios</h2>
    <p className="hint">Seleccioná productos de uno o varios catálogos. El PDF los separará en Snacks, Descartables, Dietética y Frutos secos.</p>
    <div className="cards compactas">
      <label className="card">Laurens - aumento general (%)<input type="number" min="0" max="10000" value={aumentoLaurens} onChange={e => setAumentoLaurens(e.target.value)} /></label>
      <label className="card">Descartables - aumento unidad / bulto<div><input aria-label="Descartables unidad" type="number" min="0" value={descUnidad} onChange={e => setDescUnidad(e.target.value)} /><input aria-label="Descartables bulto" type="number" min="0" value={descBulto} onChange={e => setDescBulto(e.target.value)} /></div></label>
      <label className="card">MF - aumento unidad / bulto<div><input aria-label="MF unidad" type="number" min="0" value={mfUnidad} onChange={e => setMfUnidad(e.target.value)} /><input aria-label="MF bulto" type="number" min="0" value={mfBulto} onChange={e => setMfBulto(e.target.value)} /></div></label>
      <div className="card"><span>Dietética</span><strong>Precio de venta actual</strong></div>
    </div>
    <div className="toolbar">{Object.entries(grupos).map(([id, g]) => <button key={id} className={grupo === id ? 'primary' : ''} onClick={() => { setGrupo(id); setBuscar(''); }}>{g.titulo} <small>({candidatos.filter(a => a.grupo === id && seleccion.includes(a.clave)).length})</small></button>)}<input aria-label="Buscar productos para la lista" placeholder={`Buscar en ${grupos[grupo].catalogo}…`} value={buscar} onChange={e => setBuscar(e.target.value)} /></div>
    {error && <p role="alert">No se pudieron cargar los productos.</p>}
    <div className="table-wrap selector"><table><thead><tr><th><input aria-label="Seleccionar productos visibles" type="checkbox" checked={visibles.length > 0 && visibles.every(a => seleccion.includes(a.clave))} onChange={e => setSeleccion(s => e.target.checked ? [...new Set([...s, ...visibles.map(a => a.clave)])] : s.filter(k => !visibles.some(a => a.clave === k)))} /></th><th>Código</th><th>Artículo</th><th>Precio en la lista</th></tr></thead><tbody>
      {isLoading && <tr><td colSpan="4">Cargando…</td></tr>}
      {!isLoading && !visibles.length && <tr><td colSpan="4">No hay productos para mostrar.</td></tr>}
      {visibles.map(a => { let p; try { p = convertir(a); } catch (_) {} return <tr key={a.clave}><td><input aria-label={`Seleccionar ${a.nombre}`} type="checkbox" checked={seleccion.includes(a.clave)} onChange={() => toggle(a.clave)} /></td><td>{a.codigo || '—'}</td><td>{a.nombre}</td><td>{p ? `${dinero(p.precioUnidad)}${p.precioBulto != null ? ` / ${dinero(p.precioBulto)} bulto` : ''}` : 'Revisar datos'}</td></tr>; })}
    </tbody></table></div>
    {!porcentajesValidos && <p className="warning">Ingresá porcentajes válidos.</p>}{errorCalculo && <p className="warning">{errorCalculo}</p>}
    <div className="toolbar acciones-lista"><strong>{seleccion.length} productos seleccionados</strong><button disabled={!seleccion.length} onClick={() => setSeleccion([])}>Limpiar</button><button className="primary" disabled={!puedeGenerar} onClick={descargar}>Descargar PDF</button><button disabled={!puedeGenerar || guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar en historial'}</button></div>
  </section>;
}
