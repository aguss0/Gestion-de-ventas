-- Nombre alternativo y renglones de precio (JSON) sólo para la tienda online; no modifica datos existentes.
ALTER TABLE "articulos" ADD COLUMN "nombre_online" TEXT;
ALTER TABLE "articulos" ADD COLUMN "precios_online" TEXT;
