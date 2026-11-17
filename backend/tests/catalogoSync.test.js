const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { crearCatalogoSyncService, productoPublico } = require('../src/services/catalogoSyncService');
const { publicacionOnline } = require('../src/utils/publicacionOnline');
const articulo = { id: 1, nombre: 'Almendras', precio: 85.5, activo: true, manejaStock: true, stock: 2, costoUnidad: 5, cliente: { nombre: 'Privado' }, dietetica: { categoria: 'Frutos secos', sinStock: false } };
async function contexto(fetchImpl, env = { CATALOGO_API_URL: 'https://catalogo.example.com', CATALOGO_SYNC_TOKEN: 'x'.repeat(40) }) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'catalogo-sync-'));
  const consultas = [];
  const prisma = { articulo: { findMany: async query => { consultas.push(query); return [articulo]; }, count: async () => 1 } };
  return { servicio: crearCatalogoSyncService({ prisma, fetchImpl, env, estadoPath: path.join(dir,'estado.json') }), consultas, limpiar: () => fs.rm(dir, { recursive: true, force: true }) };
}
test('Envía un catálogo completo con precios en centavos y sin costos, clientes ni stock exacto', async () => {
  const ctx = await contexto(async (url, options) => {
    assert.equal(url, 'https://catalogo.example.com/api/catalogo/sincronizar');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer ' + 'x'.repeat(40));
    const body = JSON.parse(options.body);
    assert.equal(body.tipo, 'catalogo-completo');
    assert.equal(body.productos[0].precioCentavos, 8550);
    for (const campo of ['stock','costoUnidad','cliente','pedidos']) assert.equal(campo in body.productos[0],false);
    return { ok: true, json: async () => ({ ok: true, sincronizacionId: body.sincronizacionId, productosProcesados: 1 }) };
  });
  try {
    const result = await ctx.servicio.sincronizar(); assert.equal(result.exitoso,true);
    assert.deepEqual(ctx.consultas[0].where,{ publicarOnline: true, activo: true });
    assert.equal((await ctx.servicio.resumen()).ultimaSincronizacion.exitoso,true);
  } finally { await ctx.limpiar(); }
});
test('Errores de conexión y credencial se registran sin filtrar secretos', async () => {
  for (const impl of [async () => { throw Error('secreto'); }, async () => ({ ok: false, status: 401 })]) {
    const ctx = await contexto(impl);
    try { const r = await ctx.servicio.sincronizar(); assert.equal(r.exitoso,false); assert.ok(!r.mensaje.includes('secreto')); assert.equal((await ctx.servicio.resumen()).ultimaSincronizacion.exitoso,false); }
    finally { await ctx.limpiar(); }
  }
});
test('No acepta respuestas incompletas ni una API sin HTTPS', async () => {
  const ctx = await contexto(async () => ({ ok: true, json: async () => ({ ok: true }) }));
  try { assert.equal((await ctx.servicio.sincronizar()).exitoso,false); } finally { await ctx.limpiar(); }
  const inseguro = await contexto(() => { throw Error('No debería enviar'); },{ CATALOGO_API_URL:'http://example.com', CATALOGO_SYNC_TOKEN:'x'.repeat(40) });
  try { assert.equal((await inseguro.servicio.sincronizar()).exitoso,false); assert.equal(inseguro.consultas.length,0); } finally { await inseguro.limpiar(); }
});
test('La disponibilidad respeta stock y MF sin stock; admite artículos sin imagen', () => {
  assert.equal(productoPublico({ ...articulo, stock: 0 }).disponible,false);
  assert.equal(productoPublico({ ...articulo, manejaStock: false, stock: 0 }).disponible,true);
  assert.equal(productoPublico({ ...articulo, dietetica: { sinStock: true } }).disponible,false);
  assert.equal(productoPublico(articulo).imagenUrl,null);
  assert.throws(() => productoPublico({ ...articulo, precio: NaN }), /artículo 1/);
});
test('Valida publicación e imágenes y rechaza valores booleanos de texto', () => {
  assert.throws(() => publicacionOnline({ publicarOnline:'false' }), /verdadero o falso/);
  assert.throws(() => publicacionOnline({ imagenUrl:'javascript:alert(1)' }), /HTTPS/);
  assert.deepEqual(publicacionOnline({ publicarOnline:false, categoriaOnline:' ', imagenUrl:'' }), { publicarOnline:false, categoriaOnline:null, imagenUrl:null });
});
test('Impide sincronizaciones simultáneas y libera el bloqueo después del envío', async () => {
  let completar;
  const ctx = await contexto((url, options) => new Promise(resolve => { completar = () => { const b = JSON.parse(options.body); resolve({ ok:true, json: async () => ({ ok:true, sincronizacionId:b.sincronizacionId, productosProcesados:1 }) }); }; }));
  try {
    const primera = ctx.servicio.sincronizar();
    await new Promise(resolve => setImmediate(resolve));
    await assert.rejects(ctx.servicio.sincronizar(), e => e.status === 409);
    completar(); await primera;
    assert.equal((await ctx.servicio.resumen()).ejecutando,false);
  } finally { await ctx.limpiar(); }
});

test('Precio de tienda independiente, retorno al precio local y cero explícito', () => {
  const custom = { ...articulo, precioOnline: 99.99 };
  assert.equal(productoPublico(custom).precioCentavos,9999);
  assert.equal(custom.precio,85.5);
  assert.equal(productoPublico({ ...custom, precioOnline:null }).precioCentavos,8550);
  assert.equal(productoPublico({ ...custom, precioOnline:0 }).precioCentavos,0);
  assert.deepEqual(publicacionOnline({precioOnline:99.99,precio:1}),{precioOnline:99.99});
  assert.deepEqual(publicacionOnline({precioOnline:null}),{precioOnline:null});
  for(const precioOnline of [-1,Infinity,NaN,'50',1.001,1000000001]) assert.throws(()=>publicacionOnline({precioOnline}));
});

test('Sube la imagen local antes del catálogo y publica su dirección de Cloudflare', async()=>{
 const llamadas=[];const dir=await fs.mkdtemp(path.join(os.tmpdir(),'catalogo-image-'));const prisma={articulo:{findMany:async()=>[{...articulo,imagenLocal:'1-hash.png',imagenUrl:null}],count:async()=>1}};
 const fetchImpl=async(url,options)=>{llamadas.push({url:String(url),options});if(options.method==='PUT')return {ok:true,status:200};const body=JSON.parse(options.body);assert.equal(body.productos[0].imagenUrl,'https://catalogo.example.com/api/imagenes/1');return {ok:true,json:async()=>({ok:true,sincronizacionId:body.sincronizacionId,productosProcesados:1})};};
 const servicio=crearCatalogoSyncService({prisma,fetchImpl,env:{CATALOGO_API_URL:'https://catalogo.example.com',CATALOGO_SYNC_TOKEN:'x'.repeat(40)},imagenesImpl:{leer:async()=>({buffer:Buffer.from([1,2,3]),mimetype:'image/png',hash:'a'.repeat(64)})},estadoPath:path.join(dir,'estado.json')});
 try{assert.equal((await servicio.sincronizar()).exitoso,true);assert.equal(llamadas[0].url,'https://catalogo.example.com/api/catalogo/imagenes/1');assert.equal(llamadas[0].options.headers['X-Content-Sha256'],'a'.repeat(64));assert.equal(llamadas[1].url,'https://catalogo.example.com/api/catalogo/sincronizar');}finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('Nombre en tienda y renglones de precio: se validan, se guardan como JSON y se publican', () => {
  const { validarPreciosOnline } = require('../src/utils/publicacionOnline');
  assert.deepEqual(publicacionOnline({ nombreOnline: '  Almendra Non Pareil ' }), { nombreOnline: 'Almendra Non Pareil' });
  assert.deepEqual(publicacionOnline({ nombreOnline: '' }), { nombreOnline: null });
  assert.equal(validarPreciosOnline([]), null);
  const guardado = validarPreciosOnline([{ tipo: 'peso', detalle: ' ', precio: null, pasoGramos: 250 }, { tipo: 'bulto', detalle: '10 kg', precio: 289000, pasoGramos: 99 }]);
  assert.deepEqual(JSON.parse(guardado), [{ tipo: 'peso', detalle: null, precio: null, pasoGramos: 250 }, { tipo: 'bulto', detalle: '10 kg', precio: 289000, pasoGramos: null }]);
  for (const malo of [[{ tipo: 'litro' }], [{ tipo: 'peso', pasoGramos: 5 }], [{ tipo: 'unidad', precio: -1 }], [{ tipo: 'pack', detalle: 'x'.repeat(61) }], Array(7).fill({ tipo: 'unidad' }), 'texto'])
    assert.throws(() => validarPreciosOnline(malo), undefined, JSON.stringify(malo));
  const conRenglones = { ...articulo, nombreOnline: 'Almendra Non Pareil', precioOnline: 294, preciosOnline: guardado };
  const publico = productoPublico(conRenglones);
  assert.equal(publico.nombre, 'Almendra Non Pareil');
  assert.equal(publico.precioCentavos, 29400);
  assert.deepEqual(publico.precios, [{ tipo: 'peso', detalle: null, precioCentavos: 29400, pasoGramos: 250 }, { tipo: 'bulto', detalle: '10 kg', precioCentavos: 28900000, pasoGramos: null }]);
  assert.equal('precios' in productoPublico(articulo), false);
  assert.equal(productoPublico({ ...articulo, nombreOnline: '  ' }).nombre, 'Almendras');
});
