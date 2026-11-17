const fallo = message => Object.assign(new Error(message), { status: 400 });
const TIPOS_PRECIO = ['unidad', 'peso', 'bulto', 'pack'];
const importeValido = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1000000000 && Math.abs(n * 100 - Math.round(n * 100)) <= 0.00001;

// Renglones de precio para la tienda: [{ tipo, detalle, precio (null = precio base), pasoGramos (sólo peso) }].
function validarPreciosOnline(lista) {
  if (lista === null) return null;
  if (!Array.isArray(lista) || lista.length > 6) throw fallo('Cargá hasta 6 renglones de precio para la tienda.');
  if (!lista.length) return null;
  return JSON.stringify(lista.map((r, i) => {
    const n = 'Renglón ' + (i + 1) + ': ';
    if (!r || typeof r !== 'object' || Array.isArray(r)) throw fallo(n + 'formato inválido.');
    if (!TIPOS_PRECIO.includes(r.tipo)) throw fallo(n + 'elegí por peso, unidad, bulto o pack.');
    if (r.detalle != null && typeof r.detalle !== 'string') throw fallo(n + 'el detalle debe ser texto.');
    const detalle = r.detalle?.trim() || null;
    if (detalle && detalle.length > 60) throw fallo(n + 'el detalle supera 60 caracteres.');
    if (r.precio != null && !importeValido(r.precio)) throw fallo(n + 'el precio debe ser un importe entre 0 y 1.000.000.000, con hasta dos decimales.');
    let pasoGramos = null;
    if (r.tipo === 'peso') {
      if (!Number.isSafeInteger(r.pasoGramos) || r.pasoGramos < 10 || r.pasoGramos > 10000) throw fallo(n + 'los gramos por paso deben ser un entero entre 10 y 10000.');
      pasoGramos = r.pasoGramos;
    }
    return { tipo: r.tipo, detalle, precio: r.precio == null ? null : Math.round(r.precio * 100) / 100, pasoGramos };
  }));
}

function publicacionOnline(body, req) {
  if (req && ['publicarOnline', 'categoriaOnline', 'imagenUrl', 'precioOnline', 'nombreOnline', 'preciosOnline'].some(k => body[k] !== undefined)) {
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) throw Object.assign(new Error('La publicación se administra desde la computadora local.'), { status: 403 });
    const origin = req.get('origin');
    if (origin) {
      let host;
      try { host = new URL(origin).host; } catch { throw Object.assign(new Error('Origen no permitido.'), { status: 403 }); }
      if (host !== req.get('host')) throw Object.assign(new Error('Origen no permitido.'), { status: 403 });
    }
  }
  const data = {};
  if (body.precioOnline !== undefined) {
    const precio = body.precioOnline;
    if (precio !== null && (typeof precio !== 'number' || !Number.isFinite(precio) || precio < 0 || precio > 1000000000 || Math.abs(precio * 100 - Math.round(precio * 100)) > 0.00001)) {
      throw fallo('El precio de tienda debe ser un importe entre 0 y 1.000.000.000, con hasta dos decimales.');
    }
    data.precioOnline = precio === null ? null : Math.round(precio * 100) / 100;
  }
  if (body.publicarOnline !== undefined) {
    if (typeof body.publicarOnline !== 'boolean') throw fallo('Publicar online debe ser verdadero o falso.');
    data.publicarOnline = body.publicarOnline;
  }
  if (body.preciosOnline !== undefined) data.preciosOnline = validarPreciosOnline(body.preciosOnline);
  for (const [campo, limite] of [['nombreOnline', 240], ['categoriaOnline', 120], ['imagenUrl', 2048]]) {
    if (body[campo] === undefined) continue;
    if (body[campo] !== null && typeof body[campo] !== 'string') throw fallo(`El campo ${campo} debe ser texto.`);
    const valor = body[campo]?.trim() || null;
    if (valor && valor.length > limite) throw fallo(`El campo ${campo} supera ${limite} caracteres.`);
    if (campo === 'imagenUrl' && valor) {
      let url;
      try { url = new URL(valor); } catch { throw fallo('La imagen debe tener una URL HTTPS válida.'); }
      if (url.protocol !== 'https:' || url.username || url.password) throw fallo('La imagen debe tener una URL HTTPS sin credenciales.');
    }
    data[campo] = valor;
  }
  return data;
}

module.exports = { publicacionOnline, validarPreciosOnline };
