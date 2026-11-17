# Descuento general por cliente

Al crear un pedido se puede cargar un descuento general (%) que se aplica al precio de todos los artículos. Ese porcentaje queda guardado en el cliente y se precarga automáticamente en sus próximos pedidos; si se cambia o se pone en 0, el nuevo valor reemplaza al anterior. También se puede ver y modificar desde la ficha del cliente (Clientes → Editar → "Descuento general (%)").

Editar un pedido existente no cambia el descuento guardado del cliente. Los clientes existentes arrancan con 0%.

En el detalle de cada pedido nuevo se muestra el descuento general aplicado (con su monto) y el total de descuentos por artículo; en cada artículo se ve el precio de lista tachado y su % de descuento. Los pedidos anteriores a esta versión no tienen esa información y se ven como antes.

## Actualizar la computadora de uso

1. Cerrar el sistema, detener el servidor y hacer una copia de seguridad de `backend/prisma/dev.db`.
2. Reemplazar `backend/src/` y `frontend/build/` con esta versión.
3. Copiar `backend/prisma/schema.prisma` y las carpetas de migración `20261117000000_descuento_general_cliente` y `20261117010000_descuentos_pedido`. No reemplazar `dev.db` ni `.env`.
4. Desde la carpeta `backend`, ejecutar:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Si un comando falla, detenerse y conservar el error. No ejecutar `migrate reset`, `db push` ni los seeds.

Al reiniciar, crear un pedido con descuento general para un cliente y comprobar que al iniciar otro pedido para el mismo cliente el porcentaje aparece cargado.
