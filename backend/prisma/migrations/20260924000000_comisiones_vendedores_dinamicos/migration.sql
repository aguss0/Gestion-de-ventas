CREATE TABLE "cliente_comisiones" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "cliente_id" INTEGER NOT NULL,
  "vendedor_id" INTEGER NOT NULL,
  "porcentaje" REAL NOT NULL,
  CONSTRAINT "cliente_comisiones_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "cliente_comisiones_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "cliente_comisiones_cliente_id_vendedor_id_key" ON "cliente_comisiones"("cliente_id", "vendedor_id");

CREATE TABLE "pedido_comisiones_vendedores" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "pedido_id" INTEGER NOT NULL,
  "vendedor_id" INTEGER NOT NULL,
  "porcentaje" REAL NOT NULL,
  "importe" REAL NOT NULL DEFAULT 0,
  "monto" REAL NOT NULL DEFAULT 0,
  "cobrado" BOOLEAN NOT NULL DEFAULT false,
  "fecha_cobro" DATETIME,
  "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pedido_comisiones_vendedores_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pedido_comisiones_vendedores_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "pedido_comisiones_vendedores_pedido_id_vendedor_id_key" ON "pedido_comisiones_vendedores"("pedido_id", "vendedor_id");

-- Convertir la configuración vigente de cada cliente.
INSERT OR IGNORE INTO "cliente_comisiones" ("cliente_id", "vendedor_id", "porcentaje")
SELECT c."id", v."id", c."comision_miguel_pct"
FROM "clientes" c JOIN "vendedores" v ON lower(v."nombre") LIKE '%miguel%'
WHERE c."comision_miguel_pct" > 0;

INSERT OR IGNORE INTO "cliente_comisiones" ("cliente_id", "vendedor_id", "porcentaje")
SELECT c."id", v."id", c."comision_gerardo_pct"
FROM "clientes" c JOIN "vendedores" v ON lower(v."nombre") LIKE '%gerardo%'
WHERE c."comision_gerardo_pct" > 0;

INSERT OR IGNORE INTO "cliente_comisiones" ("cliente_id", "vendedor_id", "porcentaje")
SELECT c."id", v."id", c."comision_turko_pct"
FROM "clientes" c JOIN "vendedores" v ON lower(v."nombre") LIKE '%turko%'
WHERE c."comision_turko_pct" > 0;

-- Convertir las comisiones históricas y conservar la foto de cada pedido.
INSERT OR IGNORE INTO "pedido_comisiones_vendedores" ("pedido_id", "vendedor_id", "porcentaje", "importe", "monto", "cobrado", "fecha_cobro", "creado_en")
SELECT p."id", v."id", COALESCE(p."comision_miguel_pct", 0), COALESCE(c."importe", 0), COALESCE(c."comision_miguel", 0), COALESCE(c."cobrado", false), c."fecha_cobro", COALESCE(c."creado_en", p."creado_en")
FROM "pedidos" p
JOIN "vendedores" v ON lower(v."nombre") LIKE '%miguel%'
LEFT JOIN "comisiones" c ON c."pedido_id" = p."id"
WHERE COALESCE(p."comision_miguel_pct", 0) > 0 OR COALESCE(c."comision_miguel", 0) > 0;

INSERT OR IGNORE INTO "pedido_comisiones_vendedores" ("pedido_id", "vendedor_id", "porcentaje", "importe", "monto", "cobrado", "fecha_cobro", "creado_en")
SELECT p."id", v."id", COALESCE(p."comision_gerardo_pct", 0), COALESCE(c."importe", 0), COALESCE(c."comision_gerardo", 0), COALESCE(c."cobrado", false), c."fecha_cobro", COALESCE(c."creado_en", p."creado_en")
FROM "pedidos" p
JOIN "vendedores" v ON lower(v."nombre") LIKE '%gerardo%'
LEFT JOIN "comisiones" c ON c."pedido_id" = p."id"
WHERE COALESCE(p."comision_gerardo_pct", 0) > 0 OR COALESCE(c."comision_gerardo", 0) > 0;

INSERT OR IGNORE INTO "pedido_comisiones_vendedores" ("pedido_id", "vendedor_id", "porcentaje", "importe", "monto", "cobrado", "fecha_cobro", "creado_en")
SELECT p."id", v."id", COALESCE(p."comision_turko_pct", 0), COALESCE(c."importe", 0), COALESCE(c."comision_turko", 0), COALESCE(c."cobrado", false), c."fecha_cobro", COALESCE(c."creado_en", p."creado_en")
FROM "pedidos" p
JOIN "vendedores" v ON lower(v."nombre") LIKE '%turko%'
LEFT JOIN "comisiones" c ON c."pedido_id" = p."id"
WHERE COALESCE(p."comision_turko_pct", 0) > 0 OR COALESCE(c."comision_turko", 0) > 0;
