CREATE TABLE "dietetica" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "codigo" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "costo_unidad" REAL,
  "costo_mayorista" REAL,
  "costo_bulto" REAL,
  "unidades_bulto" REAL,
  "presentacion" TEXT NOT NULL,
  "tipo_bulto" TEXT NOT NULL DEFAULT 'unitario',
  "sin_stock" BOOLEAN NOT NULL DEFAULT false,
  "actualizado_en" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "dietetica_codigo_key" ON "dietetica"("codigo");
ALTER TABLE "articulos" ADD COLUMN "dietetica_id" INTEGER REFERENCES "dietetica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "articulos_dietetica_id_presentacion_key" ON "articulos"("dietetica_id", "presentacion");
