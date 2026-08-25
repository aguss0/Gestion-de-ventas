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
    "maneja_stock" BOOLEAN NOT NULL DEFAULT false,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stock_minimo" INTEGER NOT NULL DEFAULT 0,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_articulos" ("activo", "codigo", "creado_en", "descripcion", "id", "nombre", "precio", "unidad_caja") SELECT "activo", "codigo", "creado_en", "descripcion", "id", "nombre", "precio", "unidad_caja" FROM "articulos";
DROP TABLE "articulos";
ALTER TABLE "new_articulos" RENAME TO "articulos";
CREATE UNIQUE INDEX "articulos_codigo_key" ON "articulos"("codigo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
