-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_detalle_pedidos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedido_id" INTEGER NOT NULL,
    "articulo_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    "faltante" BOOLEAN NOT NULL DEFAULT false,
    "cantidad_faltante" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "detalle_pedidos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "detalle_pedidos_articulo_id_fkey" FOREIGN KEY ("articulo_id") REFERENCES "articulos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_detalle_pedidos" ("articulo_id", "cantidad", "id", "pedido_id", "precio", "subtotal") SELECT "articulo_id", "cantidad", "id", "pedido_id", "precio", "subtotal" FROM "detalle_pedidos";
DROP TABLE "detalle_pedidos";
ALTER TABLE "new_detalle_pedidos" RENAME TO "detalle_pedidos";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
