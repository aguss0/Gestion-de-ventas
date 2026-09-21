-- Cada cliente define la comisión de su vendedor para los productos Laurens.
ALTER TABLE "clientes" ADD COLUMN "comision_pct" REAL;

-- Mantener el comportamiento anterior para los clientes ya cargados.
-- Miguel cobraba 10% y Gerardo/Turko 4% (además del 6% de Miguel).
UPDATE "clientes"
SET "comision_pct" = 10
WHERE "vendedor_id" IN (
  SELECT "id" FROM "vendedores" WHERE lower("nombre") LIKE '%miguel%'
);

UPDATE "clientes"
SET "comision_pct" = 4
WHERE "comision_pct" IS NULL;
