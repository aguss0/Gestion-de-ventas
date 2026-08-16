-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_comisiones" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedido_id" INTEGER NOT NULL,
    "vendedor_id" INTEGER NOT NULL,
    "importe" REAL NOT NULL,
    "comision_miguel" REAL NOT NULL DEFAULT 0,
    "comision_gerardo" REAL NOT NULL DEFAULT 0,
    "comision_turko" REAL NOT NULL DEFAULT 0,
    "plus_turko" REAL NOT NULL DEFAULT 0,
    "metodo" TEXT,
    "cobrado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_cobro" DATETIME,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comisiones_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "comisiones_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendedores" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_comisiones" ("comision_gerardo", "comision_miguel", "comision_turko", "creado_en", "id", "importe", "metodo", "pedido_id", "plus_turko", "vendedor_id") SELECT "comision_gerardo", "comision_miguel", "comision_turko", "creado_en", "id", "importe", "metodo", "pedido_id", "plus_turko", "vendedor_id" FROM "comisiones";
DROP TABLE "comisiones";
ALTER TABLE "new_comisiones" RENAME TO "comisiones";
CREATE UNIQUE INDEX "comisiones_pedido_id_key" ON "comisiones"("pedido_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
