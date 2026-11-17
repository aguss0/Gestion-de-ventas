-- Último descuento general aplicado al cliente, se precarga en sus próximos pedidos.
ALTER TABLE "clientes" ADD COLUMN "descuento_general" REAL NOT NULL DEFAULT 0;
