-- Migración aditiva: conserva todos los registros y relaciones existentes.
ALTER TABLE "articulos" ADD COLUMN "publicar_online" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "articulos" ADD COLUMN "categoria_online" TEXT;
ALTER TABLE "articulos" ADD COLUMN "imagen_url" TEXT;
