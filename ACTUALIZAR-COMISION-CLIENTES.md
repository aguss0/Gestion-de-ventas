# Comisión por cliente

La ficha de cada cliente permite elegir su vendedor y cargar por separado los porcentajes de Miguel, Gerardo y Turko para las ventas Laurens. Los porcentajes no se aplican a Dietética, MF ni Descartables y ninguno se completa automáticamente como resto de otro.

La actualización agrega los tres porcentajes a clientes y guarda una copia de esos valores en cada pedido. Los clientes existentes conservan el reparto anterior: 10% para Miguel en sus clientes; en clientes de Gerardo o Turko, 6% para Miguel y 4% para el vendedor correspondiente. Las comisiones ya generadas no se modifican. Cambiar los porcentajes de un cliente tampoco afecta sus pedidos anteriores, aunque luego se editen o se registren faltantes.

## Actualizar la computadora de uso

1. Cerrar el sistema, detener el servidor y hacer una copia de seguridad de `backend/prisma/dev.db`.
2. Reemplazar `backend/src/` y `frontend/build/` con esta versión.
3. Copiar `backend/prisma/schema.prisma` y las carpetas de migración `20260921000000_comision_cliente`, `20260921010000_comisiones_cliente_por_vendedor` y `20260921020000_porcentajes_comision_pedido`. No reemplazar `dev.db` ni `.env`.
4. Desde la carpeta `backend`, ejecutar:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Si un comando falla, detenerse y conservar el error. No ejecutar `migrate reset`, `db push` ni los seeds.

Al reiniciar, abrir Clientes, editar un cliente y comprobar el vendedor y su porcentaje. El valor se usará al crear nuevos pedidos y cuando un pedido existente vuelva a calcular su comisión por una edición, un faltante o la eliminación de un renglón.
