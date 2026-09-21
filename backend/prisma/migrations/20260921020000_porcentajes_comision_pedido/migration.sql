-- Guardar en cada pedido los porcentajes vigentes al momento de su creación.
ALTER TABLE "pedidos" ADD COLUMN "comision_miguel_pct" REAL;
ALTER TABLE "pedidos" ADD COLUMN "comision_gerardo_pct" REAL;
ALTER TABLE "pedidos" ADD COLUMN "comision_turko_pct" REAL;

-- Para pedidos con comisión, recuperar el porcentaje exacto ya calculado.
-- Para los demás, tomar la configuración migrada de su cliente.
UPDATE "pedidos"
SET
  "comision_miguel_pct" = COALESCE(
    (SELECT 100.0 * "comision_miguel" / NULLIF("importe", 0) FROM "comisiones" WHERE "pedido_id" = "pedidos"."id"),
    (SELECT "comision_miguel_pct" FROM "clientes" WHERE "id" = "pedidos"."cliente_id"),
    0
  ),
  "comision_gerardo_pct" = COALESCE(
    (SELECT 100.0 * "comision_gerardo" / NULLIF("importe", 0) FROM "comisiones" WHERE "pedido_id" = "pedidos"."id"),
    (SELECT "comision_gerardo_pct" FROM "clientes" WHERE "id" = "pedidos"."cliente_id"),
    0
  ),
  "comision_turko_pct" = COALESCE(
    (SELECT 100.0 * "comision_turko" / NULLIF("importe", 0) FROM "comisiones" WHERE "pedido_id" = "pedidos"."id"),
    (SELECT "comision_turko_pct" FROM "clientes" WHERE "id" = "pedidos"."cliente_id"),
    0
  );
