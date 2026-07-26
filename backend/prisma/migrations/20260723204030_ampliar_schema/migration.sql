/*
  Warnings:

  - You are about to drop the column `stock` on the `articulos` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "pedidos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nro_orden" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cliente_id" INTEGER NOT NULL,
    "vendedor_id" INTEGER,
    "total" REAL NOT NULL DEFAULT 0,
    "total_pagado" REAL NOT NULL DEFAULT 0,
    "saldo" REAL NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pedidos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "pedidos_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "detalle_pedidos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedido_id" INTEGER NOT NULL,
    "articulo_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    CONSTRAINT "detalle_pedidos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "detalle_pedidos_articulo_id_fkey" FOREIGN KEY ("articulo_id") REFERENCES "articulos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedido_id" INTEGER NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo" TEXT NOT NULL,
    "monto" REAL NOT NULL,
    "observaciones" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pagos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "comisiones" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedido_id" INTEGER NOT NULL,
    "vendedor_id" INTEGER NOT NULL,
    "importe" REAL NOT NULL,
    "comision_miguel" REAL NOT NULL DEFAULT 0,
    "comision_gerardo" REAL NOT NULL DEFAULT 0,
    "comision_turko" REAL NOT NULL DEFAULT 0,
    "plus_turko" REAL NOT NULL DEFAULT 0,
    "metodo" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comisiones_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "comisiones_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_articulos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "unidad_caja" TEXT,
    "precio" REAL NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_articulos" ("activo", "creado_en", "descripcion", "id", "nombre", "precio") SELECT "activo", "creado_en", "descripcion", "id", "nombre", "precio" FROM "articulos";
DROP TABLE "articulos";
ALTER TABLE "new_articulos" RENAME TO "articulos";
CREATE UNIQUE INDEX "articulos_codigo_key" ON "articulos"("codigo");
CREATE TABLE "new_clientes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "cuit" TEXT,
    "direccion" TEXT,
    "barrio" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "tipo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vendedor_id" INTEGER,
    CONSTRAINT "clientes_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_clientes" ("activo", "creado_en", "direccion", "email", "id", "nombre", "telefono") SELECT "activo", "creado_en", "direccion", "email", "id", "nombre", "telefono" FROM "clientes";
DROP TABLE "clientes";
ALTER TABLE "new_clientes" RENAME TO "clientes";
CREATE UNIQUE INDEX "clientes_email_key" ON "clientes"("email");
CREATE TABLE "new_vendedores" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "comision_pct" REAL NOT NULL DEFAULT 6,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_vendedores" ("activo", "creado_en", "email", "id", "nombre", "telefono") SELECT "activo", "creado_en", "email", "id", "nombre", "telefono" FROM "vendedores";
DROP TABLE "vendedores";
ALTER TABLE "new_vendedores" RENAME TO "vendedores";
CREATE UNIQUE INDEX "vendedores_email_key" ON "vendedores"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_nro_orden_key" ON "pedidos"("nro_orden");

-- CreateIndex
CREATE UNIQUE INDEX "comisiones_pedido_id_key" ON "comisiones"("pedido_id");
