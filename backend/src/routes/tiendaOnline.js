const router = require('express').Router();
const prisma = require('../utils/prisma');
const { publicacionOnline } = require('../utils/publicacionOnline');
const multer = require('multer');
const imagenes = require('../services/imagenTiendaService');
const { crearCatalogoSyncService } = require('../services/catalogoSyncService');
const servicio = crearCatalogoSyncService({ prisma });
const recibirImagen=multer({storage:multer.memoryStorage(),limits:{fileSize:2*1024*1024,files:1}}).single('imagen');
const cargar=(req,res,next)=>recibirImagen(req,res,e=>e?res.status(e.code==='LIMIT_FILE_SIZE'?413:400).json({error:e.code==='LIMIT_FILE_SIZE'?'La imagen debe pesar como máximo 2 MB.':'No se pudo leer la imagen.'}):next());

// Esta sección sólo se administra desde la computadora local.
router.use((req, res, next) => {
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) {
    return res.status(403).json({ error: 'Tienda Online se administra desde la computadora local.' });
  }
  const origin = req.get('origin');
  if (origin) {
    let host;
    try { host = new URL(origin).host; } catch { return res.status(403).json({ error: 'Origen no permitido.' }); }
    if (host !== req.get('host')) return res.status(403).json({ error: 'Origen no permitido.' });
  }
  next();
});

router.get('/estado', async (_req, res) => res.json(await servicio.resumen()));
router.get('/productos', async (_req, res) => {
  const articulos = await prisma.articulo.findMany({ orderBy: { nombre: 'asc' },
    select: { id: true, nombre: true, codigo: true, precio: true, precioOnline: true, activo: true, publicarOnline: true,
      categoriaOnline: true, imagenUrl: true, imagenLocal: true, presentacion: true, manejaStock: true,
      dietetica: { select: { categoria: true } }, descartable: { select: { categoria: true } } } });
  res.json(articulos.map(({ dietetica, descartable, ...a }) => ({ ...a,
    linea: descartable ? 'Descartables' : dietetica ? 'MF' : a.manejaStock ? 'Dietética' : 'Laurens',
    categoria: a.categoriaOnline || dietetica?.categoria || descartable?.categoria || null })));
});
router.get('/productos/:id/imagen', async (req,res)=>{const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Artículo inválido.'});const articulo=await prisma.articulo.findUnique({where:{id},select:{imagenLocal:true}});const archivo=imagenes.ruta(articulo?.imagenLocal);if(!archivo)return res.status(404).json({error:'Imagen no encontrada.'});res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.sendFile(archivo);});
router.post('/productos/:id/imagen',cargar,async(req,res)=>{const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Artículo inválido.'});if(!req.file)return res.status(400).json({error:'Elegí una imagen.'});const actual=await prisma.articulo.findUnique({where:{id},select:{imagenLocal:true}});if(!actual)return res.status(404).json({error:'Artículo no encontrado.'});const nueva=await imagenes.guardar(id,req.file);try{const articulo=await prisma.articulo.update({where:{id},data:{imagenLocal:nueva.nombre,imagenUrl:null}});await imagenes.borrar(actual.imagenLocal);res.json(articulo);}catch(e){await imagenes.borrar(nueva.nombre);throw e;}});
router.delete('/productos/:id/imagen',async(req,res)=>{const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'Artículo inválido.'});try{const actual=await prisma.articulo.findUnique({where:{id},select:{imagenLocal:true}});const articulo=await prisma.articulo.update({where:{id},data:{imagenLocal:null,imagenUrl:null}});await imagenes.borrar(actual?.imagenLocal);res.json(articulo);}catch(e){if(e.code==='P2025')return res.status(404).json({error:'Artículo no encontrado.'});throw e;}});
router.patch('/productos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Artículo inválido.' });
  const data = publicacionOnline(req.body, req);
  if (!Object.keys(data).length) return res.status(400).json({ error: 'Indicá una propiedad de publicación.' });
  try { res.json(await prisma.articulo.update({ where: { id }, data })); }
  catch (e) { if (e.code === 'P2025') return res.status(404).json({ error: 'Artículo no encontrado.' }); throw e; }
});
router.post('/sincronizar', async (_req, res) => {
  const resultado = await servicio.sincronizar();
  res.status(resultado.exitoso ? 200 : 502).json(resultado);
});

module.exports = router;
