-- Descuentos con los que se armó el pedido, para mostrarlos en el detalle.
-- Los precios guardados ya los incluyen; estos campos son informativos.
ALTER TABLE "pedidos" ADD COLUMN "descuento_general" REAL NOT NULL DEFAULT 0;
ALTER TABLE "detalle_pedidos" ADD COLUMN "precio_lista" REAL;
ALTER TABLE "detalle_pedidos" ADD COLUMN "descuento_pct" REAL NOT NULL DEFAULT 0;
