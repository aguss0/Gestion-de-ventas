# Comisión por cliente

La ficha de cada cliente permite elegir su vendedor principal y cargar porcentajes para cualquier vendedor activo. Los porcentajes no se aplican a Dietética, MF ni Descartables y ninguno se completa automáticamente como resto de otro. Al crear un vendedor, aparece automáticamente en la próxima apertura de la ficha de un cliente y en los informes cuando tenga comisiones.

La actualización guarda una lista dinámica de vendedores por cliente y una copia de esa lista en cada pedido. Los clientes existentes conservan el reparto anterior: 10% para Miguel en sus clientes; en clientes de Gerardo o Turko, 6% para Miguel y 4% para el vendedor correspondiente. Las comisiones, importes y estados de cobro ya generados se migran sin cambios. Cambiar los porcentajes de un cliente tampoco afecta sus pedidos anteriores, aunque luego se editen o se registren faltantes.

## Actualizar la computadora de uso

1. Cerrar el sistema, detener el servidor y hacer una copia de seguridad de `backend/prisma/dev.db`.
2. Reemplazar `backend/src/` y `frontend/build/` con esta versión.
3. Copiar `backend/prisma/schema.prisma` y las carpetas de migración `20260921000000_comision_cliente`, `20260921010000_comisiones_cliente_por_vendedor`, `20260921020000_porcentajes_comision_pedido` y `20260924000000_comisiones_vendedores_dinamicos`. No reemplazar `dev.db` ni `.env`.
4. Desde la carpeta `backend`, ejecutar:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Si un comando falla, detenerse y conservar el error. No ejecutar `migrate reset`, `db push` ni los seeds.

Al reiniciar, abrir Clientes, editar un cliente y comprobar sus vendedores y porcentajes. La configuración se usará en pedidos nuevos. Cada pedido anterior mantiene su propia configuración aunque después cambie la ficha del cliente.
