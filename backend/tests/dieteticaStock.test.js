const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

test('Dietética: carga manual, compra, venta, cuentas y rentabilidad sin comisiones', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ventas-stock-test-'));
  const prisma = new PrismaClient({ datasources: { db: { url: 'file:' + path.join(dir, 'test.db').replaceAll('\\', '/') } } });
  let server;
  try {
    const migrations = path.join(__dirname, '../prisma/migrations');
    for (const name of fs.readdirSync(migrations).filter(n => fs.statSync(path.join(migrations, n)).isDirectory()).sort()) {
      const sql = fs.readFileSync(path.join(migrations, name, 'migration.sql'), 'utf8').replace(/--.*$/gm, '');
      for (const statement of sql.split(';').filter(s => s.trim())) await prisma.$executeRawUnsafe(statement);
    }
    global.__prisma = prisma;
    const app = require('express')(); app.use(require('express').json());
    for (const route of ['articulos', 'comprasstock', 'pedidos', 'estadocuenta']) app.use('/' + route, require('../src/routes/' + route));
    app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.message }));
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const api = async (url, body, method = body ? 'POST' : 'GET') => {
      const r = await fetch(`http://127.0.0.1:${server.address().port}${url}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      const data = await r.json(); assert.ok(r.ok, JSON.stringify(data)); return data;
    };
    const articulo = await api('/articulos', { codigo: '', nombre: 'Almendras', precio: 200, manejaStock: true });
    const papa = await api('/articulos', { codigo: '', nombre: 'Laurens', precio: 100, manejaStock: false });
    assert.equal(articulo.codigo, null); assert.equal(papa.codigo, null);
    const compra = await api('/comprasstock', { articuloId: articulo.id, cantidad: 10, precioUnitario: 100, proveedor: 'Proveedor de prueba' });
    assert.equal(compra.stockNuevo, 10);
    const cliente = await prisma.cliente.create({ data: { nombre: 'Cliente prueba' } });
    const vendedor = await prisma.vendedor.create({ data: { nombre: 'Miguel' } });
    await prisma.clienteComision.create({ data: { clienteId: cliente.id, vendedorId: vendedor.id, porcentaje: 10 } });
    const datos = { clienteId: cliente.id, vendedorId: vendedor.id, fecha: '2026-09-03' };
    const venta = await api('/pedidos', { ...datos, items: [{ articuloId: articulo.id, cantidad: 3, precio: 200 }] });
    assert.equal((await prisma.articulo.findUnique({ where: { id: articulo.id } })).stock, 7);
    assert.equal(await prisma.pedidoComisionVendedor.count({ where: { monto: { gt: 0 } } }), 0);
    const rentabilidad = (await api('/comprasstock/rentabilidad'))[0];
    assert.equal(rentabilidad.totalInvertido, 1000);
    assert.equal(rentabilidad.totalVendido, 600);
    assert.equal(rentabilidad.ganancia, 300);
    assert.equal((await api('/estadocuenta?categoria=dietetica'))[0].id, venta.id);
    assert.deepEqual((await api('/estadocuenta?categoria=dietetica'))[0].categorias, ['dietetica']);
    assert.deepEqual(await api('/estadocuenta?categoria=mf'), []);
    assert.deepEqual(await api('/estadocuenta?categoria=papas'), []);
    const mixto = await api('/pedidos', { ...datos, items: [{ articuloId: articulo.id, cantidad: 1, precio: 200 }, { articuloId: papa.id, cantidad: 1, precio: 100 }] });
    assert.equal((await prisma.pedidoComisionVendedor.findUnique({ where: { pedidoId_vendedorId: { pedidoId: mixto.id, vendedorId: vendedor.id } } })).importe, 100);
    await api('/pedidos/' + venta.id, null, 'DELETE');
    assert.equal((await prisma.articulo.findUnique({ where: { id: articulo.id } })).stock, 9);
    assert.equal((await api('/comprasstock/rentabilidad'))[0].totalVendido, 200);
    assert.equal((await api('/comprasstock'))[0].proveedor, 'Proveedor de prueba');
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await prisma.$disconnect(); delete global.__prisma;
    for (const name of ['test.db', 'test.db-journal', 'test.db-wal', 'test.db-shm']) {
      const file = path.join(dir, name); if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    fs.rmdirSync(dir);
  }
});
