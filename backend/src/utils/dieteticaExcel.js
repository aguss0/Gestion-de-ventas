const XLSX = require('xlsx');
const { createHash } = require('node:crypto');
const normalizar = s => String(s ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
function precio(valor, fila) {
  if (valor == null || ['', '-', '_', 'SIN STOCK'].includes(normalizar(valor))) return null;
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) throw new Error(`Precio inválido en fila ${fila}. No se importó nada.`);
  return valor;
}
function cantidadPresentacion(texto) {
  const m = normalizar(texto).match(/^(\d+(?:[.,]\d+)?|\d+\/\d+)\s*(?:KG|KGS|UNIDADES|UNIDAD|UNID|UN|U)$/);
  if (!m) return null;
  const n = m[1].includes('/') ? m[1].split('/').map(Number).reduce((a,b) => a/b) : Number(m[1].replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}
function leerExcel(buffer, tipoBloqueFinal = 'pendiente') {
  if (!['pendiente', 'unitario', 'total'].includes(tipoBloqueFinal)) throw new Error('Interpretación de precio no válida');
  const w = XLSX.read(buffer, { type: 'buffer' });
  const catalogo = new Map(), advertencias = [];
  let filasPrecio = 0, reconocido = false;
  for (const hoja of w.SheetNames) {
    const filas = XLSX.utils.sheet_to_json(w.Sheets[hoja], { header: 1, defval: null });
    let categoria = 'Nuevos ingresos', tipoBulto = 'unitario';
    for (let i = 0; i < filas.length; i++) {
      const [rawNombre, , c, d, e] = filas[i];
      const nombre = normalizar(rawNombre), cabecera = normalizar(c);
      if (cabecera.includes('PRECIO')) {
        reconocido = true;
        tipoBulto = cabecera === 'PRECIO X BULTO' && !d ? tipoBloqueFinal : 'unitario';
        if (nombre && nombre !== 'PRODUCTO') categoria = nombre;
        continue;
      }
      if (!reconocido || !nombre) continue;
      if (c == null && d == null && e == null) {
        if (!nombre.includes(',') && !/FECHA|BAJA.*PRECIO|AUMENTO.*PRECIO/.test(nombre)) categoria = nombre;
        continue;
      }
      const costoUnidad = precio(c, i + 1), costoMayorista = precio(d, i + 1);
      const sinStock = [c, d].some(v => normalizar(v) === 'SIN STOCK');
      if (costoUnidad == null && costoMayorista == null && !sinStock) continue;
      filasPrecio++;
      const presentacion = normalizar(e), unidadesBulto = cantidadPresentacion(presentacion);
      const costoBulto = tipoBulto === 'total' ? costoMayorista : tipoBulto === 'unitario' && costoMayorista != null && unidadesBulto != null ? Math.round(costoMayorista * unidadesBulto * 100) / 100 : null;
      // Una misma avena aparece en bolsas de 25 y 30 kg: son presentaciones distintas.
      const identidadPresentacion = unidadesBulto == null ? presentacion : String(unidadesBulto) + (/KG/.test(presentacion) ? 'KG' : 'UN');
      const codigo = 'D-' + createHash('sha256').update(nombre + '|' + identidadPresentacion).digest('hex').slice(0, 16);
      const a = { codigo, nombre, categoria, costoUnidad, costoMayorista, costoBulto, unidadesBulto, presentacion, tipoBulto, sinStock };
      const previo = catalogo.get(codigo);
      if (previo) {
        if (['costoUnidad', 'costoMayorista', 'presentacion', 'tipoBulto', 'sinStock'].some(k => previo[k] !== a[k])) throw new Error(`El producto ${nombre} aparece con datos diferentes. Revisá el Excel.`);
        advertencias.push(`${nombre}: repetido; se importará una vez.`);
      }
      catalogo.set(codigo, a);
    }
  }
  if (!catalogo.size) throw new Error('No se reconoció el formato: Producto en A, precios en C/D y presentación en E.');
  return { articulos: [...catalogo.values()], paginas: w.SheetNames.length, filasPrecio, advertencias };
}
module.exports = { leerExcel, cantidadPresentacion };
