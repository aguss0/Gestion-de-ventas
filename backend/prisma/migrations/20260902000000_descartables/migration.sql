CREATE TABLE "descartables" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "codigo" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "categoria" TEXT NOT NULL,
  "costo_bulto" REAL NOT NULL,
  "unidades_bulto" INTEGER,
  "unidades_manual" BOOLEAN NOT NULL DEFAULT false,
  "actualizado_en" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "descartables_codigo_key" ON "descartables"("codigo");
ALTER TABLE "articulos" ADD COLUMN "descartable_id" INTEGER REFERENCES "descartables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "articulos" ADD COLUMN "presentacion" TEXT;
CREATE UNIQUE INDEX "articulos_descartable_id_presentacion_key" ON "articulos"("descartable_id", "presentacion");
