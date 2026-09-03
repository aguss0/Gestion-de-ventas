const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { unidadesDe, leerLista } = require('../src/utils/descartablesPdf');

test('cantidades explícitas, sin confundir medidas', () => {
  assert.equal(unidadesDe('BENGALA X 12 UNI'), 12);
  assert.equal(unidadesDe('AEROSOL X 120 CC BRILLOS X 6 UNI'), 6);
  assert.equal(unidadesDe('ROLLO X 500 GR'), null);
  assert.equal(unidadesDe('PAQUETE X 12 UNI'), 12);
  for (const [nombre, cantidad] of [
    ['AGITADOR X 5.000 UNID.', 5000], ['MINITENEDOR X 2,000 UNID.', 2000],
    ['BANDEJA PET X 1200', 1200], ['ROCIO 110 ML X 12', 12],
    ['SERVILLETA 33 X 33 X 15 PAQ X 20 U', 300],
    ['BOLSA 45 X 60 X 30 UNI X 30 PAQ', 900],
    ['PAÑUELO 27 PAQ X 6 PACK X 10 U', 1620],
    ['SORBETE X 24 PAQ 200 UNI X 4800 UNID.', 4800],
    ['PVC NEW PACK PROF 300*38 X 6 UNID.', 6],
    ['BOLSA DOY-PACK 1000 ML (16 X 30) X 50 UNI', 50],
    ['PAPEL HIGIENICO 16 PAQ X 4 ROLLO X 30 MTS', 64],
    ['PAPEL HIGIENICO 30 ROLLOS X 30 MTS', 30],
    ['TOALLA 2500 U COD2500', 2500],
    ['CINTA 48 MM X 50 MTS', null], ['BOLSA 30 X 40', null],
    ['DISPENSER P/JABON X 1 L', null], ['BOLSA X 25 PAQ', null],
  ]) assert.equal(unidadesDe(nombre), cantidad, nombre);
});

test('migración aditiva, importación y ventas en una base temporal', { timeout: 240000 }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ventas-descartables-test-'));
  const db = path.join(dir, 'test.db');
  const prisma = new PrismaClient({ datasources: { db: { url: 'file:' + db.replaceAll('\\', '/') } } });
  let server;
  try {
    const migrations = path.join(__dirname, '../prisma/migrations');
    for (const name of fs.readdirSync(migrations).filter(n => fs.statSync(path.join(migrations, n)).isDirectory()).sort()) {
      if (name === '20260902000000_descartables') {
        await prisma.$executeRawUnsafe("INSERT INTO articulos (nombre, precio) VALUES ('Artículo previo', 100)");
      }
      const sql = fs.readFileSync(path.join(migrations, name, 'migration.sql'), 'utf8');
      for (const statement of sql.split(';').filter(s => s.trim())) await prisma.$executeRawUnsafe(statement);
    }
    assert.equal((await prisma.articulo.findFirst()).precio, 100);
    global.__prisma = prisma;
    const express = require('express');
    const app = express(); app.use(express.json());
    app.use('/descartables', require('../src/routes/descartables'));
    app.use('/dietetica', require('../src/routes/dietetica'));
    app.use('/pedidos', require('../src/routes/pedidos'));
    app.use('/estadocuenta', require('../src/routes/estadocuenta'));
    app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message }));
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/descartables`;
    const json = async (url, body, method = 'POST') => {
      const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      return { status: r.status, data: await r.json() };
    };
    const a = await prisma.descartable.create({ data: { codigo: 'AEA', nombre: 'BENGALA X 12 UNI', categoria: 'Cotillón', costoBulto: 16500, unidadesBulto: 12 } });
    const publicar = () => json('/precios', { ids: [a.id], recargoUnidad: 30, recargoBulto: 20 });
    assert.equal((await publicar()).status, 200);
    assert.equal((await publicar()).status, 200);
    const variantes = await prisma.articulo.findMany({ where: { descartableId: a.id } });
    assert.equal(variantes.length, 2);
    assert.equal(variantes.find(v => v.presentacion === 'unidad').precio, 1787.5);
    assert.equal(variantes.find(v => v.presentacion === 'bulto').precio, 19800);
    assert.equal((await json('/precios', { ids: [a.id], recargoUnidad: -1, recargoBulto: 0 })).status, 400);
    const cliente = await prisma.cliente.create({ data: { nombre: 'Prueba' } });
    await prisma.pedido.create({ data: { nroOrden: 1, clienteId: cliente.id, detalle: { create: { articuloId: variantes.find(v => v.presentacion === 'unidad').id, cantidad: 3, cantidadFaltante: 1, precio: 1787.5, subtotal: 3575 } } } });
    await prisma.pedido.create({ data: { nroOrden: 2, clienteId: cliente.id, activo: false, detalle: { create: { articuloId: variantes[0].id, cantidad: 10, precio: 100, subtotal: 1000 } } } });
    const resumen = await (await fetch(base + '/resumen')).json();
    assert.deepEqual(resumen, { ventas: 3575, pedidos: 1, unidades: 2, bultos: 0 });
    assert.equal((await fetch(base + '/resumen?desde=2026-09-02&hasta=2026-01-01')).status, 400);
    if (process.env.TEST_SUPPLIER_PDF) {
      const pdf = fs.readFileSync(process.env.TEST_SUPPLIER_PDF);
      const lista = await leerLista(pdf);
      assert.equal(lista.articulos.length, 2023);
      const importar = async preview => {
        const form = new FormData(); form.append('archivo', new Blob([pdf], { type: 'application/pdf' }), 'lista.pdf');
        const r = await fetch(base + '/importar' + (preview ? '?preview=1' : ''), { method: 'POST', body: form });
        assert.equal(r.status, 200); return r.json();
      };
      await importar(true);
      assert.equal(await prisma.descartable.count(), 1);
      assert.equal((await importar(false)).creados, 2022);
      await json(`/${a.id}/unidades`, { unidadesBulto: 24 }, 'PATCH');
      assert.equal((await importar(false)).creados, 0);
      assert.equal(await prisma.descartable.count(), 2023);
      assert.equal((await prisma.descartable.findUnique({ where: { id: a.id } })).unidadesBulto, 24);
      assert.equal((await prisma.articulo.findUnique({ where: { id: variantes.find(v => v.presentacion === 'unidad').id } })).precio, 1787.5);
      assert.equal((await prisma.detallePedido.findFirst()).subtotal, 3575);
    }
    assert.equal((await prisma.articulo.findFirst({ where: { nombre: 'Artículo previo' } })).precio, 100);
    const pendiente = await prisma.descartable.create({ data: { codigo: 'TEST-AUTO', nombre: 'VASO X 20 PAQ X 50 U', categoria: 'Prueba', costoBulto: 1000 } });
    const ambiguo = await prisma.descartable.create({ data: { codigo: 'TEST-PESO', nombre: 'BOLSA X 1 KG', categoria: 'Prueba', costoBulto: 1000 } });
    await prisma.descartable.update({ where: { id: a.id }, data: { unidadesBulto: 17, unidadesManual: true } });
    assert.equal((await json('/completar-unidades', {})).status, 200);
    assert.equal((await prisma.descartable.findUnique({ where: { id: pendiente.id } })).unidadesBulto, 1000);
    assert.equal((await prisma.descartable.findUnique({ where: { id: ambiguo.id } })).unidadesBulto, null);
    assert.equal((await prisma.descartable.findUnique({ where: { id: a.id } })).unidadesBulto, 17);
    assert.equal((await json('/completar-unidades', {})).data.completados, 0);
    const vendedor = await prisma.vendedor.create({ data: { nombre: 'Miguel' } });
    const papa = await prisma.articulo.findFirst({ where: { nombre: 'Artículo previo' } });
    const pedidoApi = async (suffix, body, method = 'POST') => {
      const r = await fetch(base.replace('/descartables', '/pedidos') + suffix, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const data = await r.json(); assert.ok(r.ok, JSON.stringify(data)); return data;
    };
    const datos = { clienteId: cliente.id, vendedorId: vendedor.id, fecha: '2026-09-02', items: [{ articuloId: variantes[0].id, cantidad: 2, precio: 500 }] };
    const soloDescartables = await pedidoApi('', datos);
    assert.equal(await prisma.comision.count({ where: { pedidoId: soloDescartables.id } }), 0);
    let resumenNuevo = await (await fetch(base + '/resumen')).json();
    assert.equal(resumenNuevo.ventas, 4575);
    const mixto = await pedidoApi('', { ...datos, items: [...datos.items, { articuloId: papa.id, cantidad: 3, precio: 100 }] });
    let comision = await prisma.comision.findUnique({ where: { pedidoId: mixto.id } });
    assert.equal(comision.importe, 300); assert.equal(comision.comisionMiguel, 30);
    const detallePapa = mixto.detalle.find(d => d.articuloId === papa.id);
    await pedidoApi(`/detalle/${detallePapa.id}/faltante`, { cantidadFaltante: 1 }, 'PATCH');
    assert.equal((await prisma.comision.findUnique({ where: { pedidoId: mixto.id } })).importe, 200);
    await pedidoApi(`/${mixto.id}`, { ...datos, nroOrden: mixto.nroOrden }, 'PATCH');
    assert.equal(await prisma.comision.count({ where: { pedidoId: mixto.id } }), 0);
    await pedidoApi(`/${mixto.id}`, { vendedorId: vendedor.id }, 'PATCH');
    assert.equal(await prisma.comision.count({ where: { pedidoId: mixto.id } }), 0);
    await pedidoApi(`/${mixto.id}`, { ...datos, nroOrden: mixto.nroOrden, items: [{ articuloId: papa.id, cantidad: 2, precio: 100 }] }, 'PATCH');
    assert.equal((await prisma.comision.findUnique({ where: { pedidoId: mixto.id } })).comisionMiguel, 20);
    await pedidoApi(`/${soloDescartables.id}`, null, 'DELETE');
    resumenNuevo = await (await fetch(base + '/resumen')).json();
    assert.equal(resumenNuevo.ventas, 3575);
    const diet = await prisma.dietetica.create({ data: { codigo: 'STEVIA', nombre: 'STEVIA', categoria: 'Prueba', costoUnidad: 5580, costoMayorista: 5480, costoBulto: 65760, unidadesBulto: 12, presentacion: '12 UNID' } });
    const dietBase = base.replace('/descartables', '/dietetica');
    const publicarDiet = await fetch(dietBase + '/precios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [diet.id], recargoUnidad: 0, recargoBulto: 0 }) });
    assert.equal(publicarDiet.status, 200);
    const variantesDiet = await prisma.articulo.findMany({ where: { dieteticaId: diet.id } });
    assert.equal(variantesDiet.find(a => a.presentacion === 'unidad').precio, 5580);
    assert.equal(variantesDiet.find(a => a.presentacion === 'bulto').precio, 65760);
    const ventaDiet = await pedidoApi('', { ...datos, items: [{ articuloId: variantesDiet.find(a => a.presentacion === 'unidad').id, cantidad: 6, precio: 5580 }] });
    assert.equal(ventaDiet.total, 33480);
    assert.equal(await prisma.comision.count({ where: { pedidoId: ventaDiet.id } }), 0);
    assert.equal((await (await fetch(dietBase + '/resumen')).json()).ventas, 33480);
    assert.equal((await (await fetch(base + '/resumen')).json()).ventas, 3575);
    const cuentaBase = base.replace('/descartables', '/estadocuenta');
    const mixtoCuenta = await pedidoApi('', { ...datos, items: [
      { articuloId: papa.id, cantidad: 1, precio: 100 },
      { articuloId: variantesDiet[0].id, cantidad: 1, precio: 200 },
    ] });
    await prisma.pedido.update({ where: { id: mixtoCuenta.id }, data: { totalPagado: 90, saldo: 210 } });
    for (const categoria of ['papas', 'mf']) {
      const filas = await (await fetch(cuentaBase + '?categoria=' + categoria)).json();
      const fila = filas.find(p => p.id === mixtoCuenta.id);
      assert.equal(fila.totalVenta, 300); assert.equal(fila.pagado, 90); assert.equal(fila.saldo, 210);
      assert.deepEqual(new Set(fila.categorias), new Set(['papas', 'mf']));
      assert.equal(filas.filter(p => p.id === mixtoCuenta.id).length, 1);
      const resumenCliente = await (await fetch(cuentaBase + `/cliente/${cliente.id}?categoria=${categoria}`)).json();
      assert.equal(resumenCliente.saldoPendiente, filas.filter(p => p.clienteId === cliente.id).reduce((s,p) => s + p.saldo, 0));
    }
    const descartablesCuenta = await (await fetch(cuentaBase + '?categoria=descartables')).json();
    assert.ok(!descartablesCuenta.some(p => p.id === mixtoCuenta.id));
    assert.ok(!descartablesCuenta.some(p => p.nroOrden === 2)); // archivado
    const todosCuenta = await (await fetch(cuentaBase)).json();
    assert.equal(todosCuenta.filter(p => p.id === mixtoCuenta.id).length, 1);
    assert.equal((await fetch(cuentaBase + '?categoria=invalida')).status, 400);
    if (process.env.TEST_DIETETICA_XLSX) {
      const excel = fs.readFileSync(process.env.TEST_DIETETICA_XLSX);
      const { leerExcel } = require('../src/utils/dieteticaExcel');
      for (const [tipo, esperado] of [['pendiente', null], ['unitario', 25248], ['total', 8416]]) {
        const copos = leerExcel(excel, tipo).articulos.find(a => a.nombre === 'COPOS DE MAIZ NATURALES X 3 KG');
        assert.equal(copos.costoBulto, esperado);
      }
      const avenas = leerExcel(excel).articulos.filter(a => a.nombre === 'AVENA INSTANTANEA');
      assert.equal(avenas.length, 2);
      assert.notEqual(avenas[0].codigo, avenas[1].codigo);
      const importarExcel = async preview => {
        const form = new FormData(); form.append('archivo', new Blob([excel]), 'lista.xlsx');
        const r = await fetch(dietBase + '/importar' + (preview ? '?preview=1' : ''), { method: 'POST', body: form });
        const resultado = await r.json(); assert.equal(r.status, 200, JSON.stringify(resultado)); return resultado;
      };
      const vista = await importarExcel(true);
      const stevia = vista.articulos.find(a => a.nombre === 'STEVIA BOLIVIANA X 250GR');
      assert.equal(stevia.costoUnidad, 5580); assert.equal(stevia.costoBulto, 65760);
      assert.equal(await prisma.dietetica.count(), 1);
      assert.equal((await importarExcel(false)).creados, vista.articulos.length);
      assert.equal((await importarExcel(false)).creados, 0);
      assert.equal(await prisma.dietetica.count(), vista.articulos.length + 1);
      assert.equal((await prisma.articulo.findUnique({ where: { id: variantesDiet[0].id } })).precio, variantesDiet[0].precio);
    }
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect();
    delete global.__prisma;
    for (const name of ['test.db', 'test.db-journal', 'test.db-wal', 'test.db-shm']) {
      const file = path.join(dir, name); if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    fs.rmdirSync(dir);
  }
});
