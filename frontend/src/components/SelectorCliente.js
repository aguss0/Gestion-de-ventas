import { useId, useState } from 'react';

const normalizar = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function SelectorCliente({ clientes, value, onChange, style }) {
  const listaId = useId();
  const [abierto, setAbierto] = useState(false);
  const [buscar, setBuscar] = useState('');
  const [activo, setActivo] = useState(-1);
  const seleccionado = clientes.find(c => String(c.id) === String(value));
  const opciones = buscar.trim()
    ? clientes.filter(c => normalizar(c.nombre).includes(normalizar(buscar.trim())))
    : [{ id: '', nombre: 'Todos los clientes' }, ...clientes];
  const abrir = () => { if (!abierto) { setAbierto(true); setBuscar(''); setActivo(-1); } };
  const elegir = c => { onChange(String(c.id)); setAbierto(false); setBuscar(''); setActivo(-1); };

  return <div style={{ position: 'relative', width: 240, maxWidth: '100%' }}>
    <input
      role="combobox" aria-label="Cliente" aria-expanded={abierto} aria-controls={listaId}
      aria-autocomplete="list" aria-activedescendant={abierto && opciones[activo] ? `${listaId}-${activo}` : undefined}
      autoComplete="off" placeholder="Buscar o seleccionar cliente…"
      style={{ ...style, width: '100%', boxSizing: 'border-box', paddingRight: 28 }}
      value={abierto ? buscar : seleccionado?.nombre || ''}
      onFocus={abrir} onClick={abrir} onBlur={() => setAbierto(false)}
      onChange={e => { setBuscar(e.target.value); setAbierto(true); setActivo(0); }}
      onKeyDown={e => {
        if (e.key === 'Escape') { setAbierto(false); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); abrir();
          setActivo(n => Math.max(0, Math.min(opciones.length - 1, n + (e.key === 'ArrowDown' ? 1 : -1))));
        }
        if (e.key === 'Enter' && abierto) { e.preventDefault(); if (opciones[activo]) elegir(opciones[activo]); }
      }}
    />
    <span aria-hidden="true" style={{ position: 'absolute', right: 10, top: 8, pointerEvents: 'none', color: 'var(--muted)' }}>▾</span>
    {abierto && <div id={listaId} role="listbox" aria-label="Clientes" style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: 240, overflowY: 'auto', background: '#fff', border: '1px solid var(--border)', borderRadius: 6, zIndex: 50, boxShadow: '0 4px 12px #0002' }}>
      {!opciones.length && <div style={{ padding: 10, fontSize: 13 }}>No se encontraron clientes</div>}
      {opciones.map((c, i) => <div key={c.id} id={`${listaId}-${i}`} role="option" aria-selected={String(c.id) === String(value)}
        onMouseDown={e => e.preventDefault()} onMouseEnter={() => setActivo(i)} onClick={() => elegir(c)}
        style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', background: activo === i ? '#eff6ff' : '#fff' }}>
        {c.nombre}
      </div>)}
    </div>}
  </div>;
}
