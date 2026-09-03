import { useSearchParams } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { Articulos } from '../articulos/Articulos';
import { ComprasStock } from '../comprasstock/ComprasStock';
import { Rentabilidad } from '../comprasstock/Rentabilidad';

export function DieteticaStock() {
  const [params, setParams] = useSearchParams();
  const vistas = { articulos: 'Artículos', compras: 'Compras de stock', rentabilidad: 'Ventas y rentabilidad' };
  const vista = Object.hasOwn(vistas, params.get('vista')) ? params.get('vista') : 'articulos';
  return <Layout titulo="Dietética">
    <p style={{ color: 'var(--muted)', marginTop: 0 }}>Productos propios con stock: cargá los artículos, registrá las compras a proveedores y consultá sus ventas.</p>
    <nav aria-label="Secciones de Dietética" style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
      {Object.entries(vistas).map(([id, label]) => <button key={id} aria-pressed={vista === id} onClick={() => setParams({ vista: id })}
        style={{ padding: '9px 16px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: vista === id ? 'var(--primary)' : '#fff', color: vista === id ? '#fff' : 'inherit' }}>{label}</button>)}
    </nav>
    {vista === 'articulos' && <Articulos conStock embedded />}
    {vista === 'compras' && <ComprasStock embedded />}
    {vista === 'rentabilidad' && <Rentabilidad embedded />}
  </Layout>;
}
