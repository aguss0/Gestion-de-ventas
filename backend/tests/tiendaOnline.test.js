const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

test('La API local lista las cuatro líneas, valida publicación y bloquea orígenes externos', async () => {
  const cambios=[];let imagenLocal=null;
  global.__prisma={ articulo: {
    findMany: async () => [
      { id:1,nombre:'Laurens',manejaStock:false }, { id:2,nombre:'Dietética',manejaStock:true },
      { id:3,nombre:'MF',dietetica:{ categoria:'Semillas' } }, { id:4,nombre:'Vasos',descartable:{ categoria:'Vasos' } },
    ],
    findUnique: async () => ({imagenLocal}), update: async q => { cambios.push(q);if(Object.hasOwn(q.data,'imagenLocal'))imagenLocal=q.data.imagenLocal;return { id:q.where.id,...q.data }; }, count: async () => 0,
  } };
  const app=express();app.use(express.json());app.use('/tienda',require('../src/routes/tiendaOnline'));
  app.use((e,req,res,next)=>res.status(e.status||500).json({ error:e.message }));
  const server=app.listen(0,'127.0.0.1'); await new Promise(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+server.address().port+'/tienda';
  try {
    const respuesta=await fetch(base+'/productos'); assert.equal(respuesta.status,200);
    assert.deepEqual((await respuesta.json()).map(p=>p.linea),['Laurens','Dietética','MF','Descartables']);
    const enviar=(body,headers={})=>fetch(base+'/productos/1',{method:'PATCH',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
    assert.equal((await enviar({publicarOnline:'false'})).status,400);
    assert.equal((await enviar({publicarOnline:true},{Origin:'https://externo.example.com'})).status,403);
    assert.equal(cambios.length,0);
    const valido=await enviar({publicarOnline:true,precio:1,costo:0});assert.equal(valido.status,200);
    assert.deepEqual(cambios[0].data,{publicarOnline:true});
    const custom=await enviar({precioOnline:123.45,precio:1});assert.equal(custom.status,200);
    assert.deepEqual(cambios[1].data,{precioOnline:123.45});
    assert.equal((await enviar({precioOnline:null})).status,200);
    assert.deepEqual(cambios[2].data,{precioOnline:null});
    assert.equal((await enviar({precioOnline:-1})).status,400);
    assert.equal((await enviar({precioOnline:20},{Origin:'https://externo.example.com'})).status,403);
    const form=new FormData();form.append('imagen',new Blob([Buffer.from([137,80,78,71,13,10,26,10,0])],{type:'image/png'}),'producto.png');
    const image=await fetch(base+'/productos/1/imagen',{method:'POST',body:form});const imageText=await image.text();assert.equal(image.status,200,imageText);assert.ok(imagenLocal.endsWith('.png'));
    assert.equal((await fetch(base+'/productos/1/imagen')).status,200);
    assert.equal((await fetch(base+'/productos/1/imagen',{method:'DELETE'})).status,200);assert.equal(imagenLocal,null);
    assert.equal((await fetch(base+'/estado')).status,200);
  } finally { await new Promise(r=>server.close(r));delete global.__prisma; }
});
