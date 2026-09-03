const { PdfReader } = require('pdfreader');

function unidadesDe(nombre) {
  const texto = nombre.toUpperCase().replace(/×/g, 'X');
  const numero = '(?:\\d{1,3}(?:[.,]\\d{3})+|\\d+)';
  const entero = s => Number(s.replace(/[.,]/g, ''));
  const valido = n => Number.isSafeInteger(n) && n > 0 && n <= 10000000 ? n : null;
  const unidad = '(?:UNIDADES|UNID(?:ADES)?|UNI|UN|U)';
  const paquete = '(?:PAQUETES?|PAQ|PACKS?|BOLSAS?|BLS|BOB)';
  // Multiplicar los niveles explícitos del embalaje, en ambos órdenes.
  // Ej.: 20 PAQ X 50 U; 10 U X 25 PAQ; 27 PAQ X 6 PACK X 10 U.
  const tokens = [...texto.matchAll(new RegExp(`(${numero})\\s*(${paquete}|${unidad}|ROLLOS?|HOJAS)\\b`, 'g'))];
  if (tokens.length) {
    let cadena = [tokens[0]];
    const cadenas = [];
    for (const token of tokens.slice(1)) {
      const previo = cadena[cadena.length - 1];
      const separador = texto.slice(previo.index + previo[0].length, token.index);
      if (/^\s*(?:X\s*)?$/.test(separador)) cadena.push(token);
      else { cadenas.push(cadena); cadena = [token]; }
    }
    cadenas.push(cadena);
    const embalaje = cadenas.find(c => c.length > 1 && c.some(t => new RegExp(`^${paquete}$`).test(t[2])));
    if (embalaje) {
      let producto = 1;
      for (const [i, token] of embalaje.entries()) {
        const n = entero(token[1]);
        // Algunos renglones repiten el total: 24 PAQ 200 UNI X 4800 UNID.
        if (i > 1 && n === producto && new RegExp(`^${unidad}$`).test(token[2])) continue;
        producto *= n;
      }
      return valido(producto);
    }
    // Rollo es la pieza vendible; metros y paños describen su contenido.
    const rollos = tokens.find(t => /^ROLLOS?$/.test(t[2]));
    if (rollos) return valido(entero(rollos[1]));
    const explicita = tokens.filter(t => new RegExp(`^${unidad}$|^HOJAS$`).test(t[2])).pop();
    if (explicita && !/APROX\s*$/.test(texto.slice(0, explicita.index))) return valido(entero(explicita[1]));
    const paquetes = tokens.filter(t => new RegExp(`^${paquete}$`).test(t[2])).pop();
    if (paquetes) return null; // Sin piezas por paquete, no suponer una cantidad.
  }
  // Cantidad sin abreviatura al final. No interpretar pares de dimensiones.
  const final = texto.match(new RegExp(`\\bX\\s*(${numero})\\s*(?:APROX\\.?|BCA|NEGRO|FLUOR)?\\s*[.)]*$`));
  if (final && !/\d\s*$/.test(texto.slice(0, final.index))) return valido(entero(final[1]));
  return null;
}

function extraerFilas(paginas) {
  const catalogo = new Map();
  let categoria = 'Sin categoría';
  let grupo = '';
  let filasPrecio = 0;
  const advertencias = [];
  for (const [pagina, items] of paginas.entries()) {
    const filas = [];
    for (const item of items.sort((a, b) => a.y - b.y || a.x - b.x)) {
      if (item.y < 11 || item.y > 47.8) continue;
      let fila = filas.find(f => Math.abs(f.y - item.y) < 0.07);
      if (!fila) { fila = { y: item.y, items: [] }; filas.push(fila); }
      fila.items.push(item);
    }
    for (const fila of filas) {
      const precioTexto = fila.items.filter(i => i.x > 30).map(i => i.text).join('').trim();
      if (!precioTexto.startsWith('$')) {
        const encabezado = fila.items.filter(i => i.x < 3).map(i => i.text).join(' ').trim();
        if (/^\d+\s*-/.test(encabezado)) grupo = encabezado;
        else if (encabezado.length > 2 && fila.items.length === 1) { categoria = encabezado; grupo = ''; }
        continue;
      }
      filasPrecio += 1;
      const codigo = fila.items.filter(i => i.x < 4).map(i => i.text).join('').trim();
      const nombre = fila.items.filter(i => i.x >= 4 && i.x <= 30).map(i => i.text).join(' ').trim();
      const costoBulto = Number(precioTexto.replace(/[$\s.]/g, '').replace(',', '.'));
      if (!codigo || !nombre || !Number.isFinite(costoBulto) || costoBulto <= 0) {
        throw new Error(`Fila inválida en página ${pagina + 1}. No se importó ningún artículo.`);
      }
      const producto = { codigo, nombre, costoBulto, categoria: [categoria, grupo].filter(Boolean).join(' / '), unidadesBulto: unidadesDe(nombre) };
      const anterior = catalogo.get(codigo);
      if (anterior && (anterior.costoBulto !== costoBulto || anterior.nombre !== nombre)) {
        throw new Error(`Código duplicado con datos diferentes: ${codigo}. Revisá el PDF antes de importar.`);
      }
      if (anterior) advertencias.push(`Código repetido ${codigo}: se importará una sola vez.`);
      catalogo.set(codigo, producto);
    }
  }
  if (!catalogo.size) throw new Error('No se reconocieron artículos. Usá el PDF de texto del proveedor, no una foto o escaneo.');
  return { articulos: [...catalogo.values()], paginas: paginas.length, filasPrecio, advertencias };
}

function leerLista(buffer) {
  return new Promise((resolve, reject) => {
    const paginas = [];
    let actual;
    new PdfReader().parseBuffer(buffer, (error, item) => {
      if (error) return reject(new Error('No se pudo leer el PDF. Verificá que no esté dañado o protegido.'));
      if (!item) {
        try { resolve(extraerFilas(paginas)); } catch (e) { reject(e); }
      } else if (item.page) {
        actual = []; paginas.push(actual);
      } else if (item.text && actual) actual.push(item);
    });
  });
}

module.exports = { leerLista, unidadesDe, extraerFilas };
