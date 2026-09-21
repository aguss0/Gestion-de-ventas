-- Porcentajes independientes por vendedor para cada cliente.
ALTER TABLE "clientes" ADD COLUMN "comision_miguel_pct" REAL NOT NULL DEFAULT 0;
ALTER TABLE "clientes" ADD COLUMN "comision_gerardo_pct" REAL NOT NULL DEFAULT 0;
ALTER TABLE "clientes" ADD COLUMN "comision_turko_pct" REAL NOT NULL DEFAULT 0;

-- Conservar el reparto vigente antes de esta actualización.
UPDATE "clientes"
SET "comision_miguel_pct" = CASE
  WHEN "vendedor_id" IN (SELECT "id" FROM "vendedores" WHERE lower("nombre") LIKE '%miguel%')
    THEN COALESCE("comision_pct", 10)
  WHEN "vendedor_id" IN (SELECT "id" FROM "vendedores" WHERE lower("nombre") LIKE '%gerardo%' OR lower("nombre") LIKE '%turko%')
    THEN 6
  ELSE 0
END;

UPDATE "clientes"
SET "comision_gerardo_pct" = COALESCE("comision_pct", 4)
WHERE "vendedor_id" IN (
  SELECT "id" FROM "vendedores" WHERE lower("nombre") LIKE '%gerardo%'
);

UPDATE "clientes"
SET "comision_turko_pct" = COALESCE("comision_pct", 4)
WHERE "vendedor_id" IN (
  SELECT "id" FROM "vendedores" WHERE lower("nombre") LIKE '%turko%'
);
