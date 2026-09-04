CREATE TABLE "historial_listas_precios" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "tipo" TEXT NOT NULL,
  "recargo_unidad" REAL NOT NULL,
  "recargo_bulto" REAL NOT NULL,
  "cantidad" INTEGER NOT NULL,
  "contenido" TEXT NOT NULL,
  "vendedor" TEXT NOT NULL DEFAULT 'Miguel Sanchez',
  "telefono" TEXT NOT NULL DEFAULT '3512590512',
  "email" TEXT NOT NULL DEFAULT 'j.miguel.sanchez.23@gmail.com',
  "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "historial_listas_precios_tipo_creado_en_idx"
ON "historial_listas_precios"("tipo", "creado_en");
