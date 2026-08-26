-- CreateTable
CREATE TABLE "compras_stock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "articulo_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" REAL NOT NULL,
    "total" REAL NOT NULL,
    "proveedor" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "compras_stock_articulo_id_fkey" FOREIGN KEY ("articulo_id") REFERENCES "articulos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
