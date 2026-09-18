const fallo = message => Object.assign(new Error(message), { status: 400 });

function publicacionOnline(body, req) {
  if (req && ['publicarOnline', 'categoriaOnline', 'imagenUrl', 'precioOnline'].some(k => body[k] !== undefined)) {
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
  for (const [campo, limite] of [['categoriaOnline', 120], ['imagenUrl', 2048]]) {
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

module.exports = { publicacionOnline };
