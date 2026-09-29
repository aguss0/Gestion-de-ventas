const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const directorio=path.join(__dirname,'../../data/tienda-online-imagenes');
const formatos={
 'image/jpeg':{ext:'.jpg',firma:b=>b.length>=3&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff},
 'image/png':{ext:'.png',firma:b=>b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))},
 'image/webp':{ext:'.webp',firma:b=>b.length>=12&&b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP'},
};
function seguro(nombre){return typeof nombre==='string'&&/^\d+-[a-f0-9]{16}\.(?:jpg|png|webp)$/.test(nombre);}
async function guardar(id,archivo){const formato=formatos[archivo?.mimetype];if(!formato||!Buffer.isBuffer(archivo.buffer)||!formato.firma(archivo.buffer))throw Object.assign(new Error('Elegí una imagen JPG, PNG o WebP válida.'),{status:400});if(!archivo.buffer.length||archivo.buffer.length>2*1024*1024)throw Object.assign(new Error('La imagen debe pesar como máximo 2 MB.'),{status:400});await fs.mkdir(directorio,{recursive:true});const hash=crypto.createHash('sha256').update(archivo.buffer).digest('hex'),nombre=id+'-'+hash.slice(0,16)+formato.ext,temporal=path.join(directorio,'.'+nombre+'.tmp');await fs.writeFile(temporal,archivo.buffer,{mode:0o600});const destino=path.join(directorio,nombre);try{await fs.access(destino);await fs.rm(temporal,{force:true});}catch{await fs.rename(temporal,destino);}return {nombre,hash,mimetype:archivo.mimetype};}
async function borrar(nombre){if(seguro(nombre))await fs.rm(path.join(directorio,nombre),{force:true});}
async function leer(nombre){if(!seguro(nombre))throw new Error('Referencia de imagen local inválida.');const buffer=await fs.readFile(path.join(directorio,nombre));const ext=path.extname(nombre);return {buffer,mimetype:ext==='.jpg'?'image/jpeg':ext==='.png'?'image/png':'image/webp',hash:crypto.createHash('sha256').update(buffer).digest('hex')};}
function ruta(nombre){if(!seguro(nombre))return null;return path.join(directorio,nombre);}
module.exports={guardar,borrar,leer,ruta};
