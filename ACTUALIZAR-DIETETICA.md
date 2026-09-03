# Instalación de Dietética

Esta sección requiere la migración aditiva `20260902010000_dietetica`. No borra las tablas anteriores ni sus datos. No se aplicó sobre tu base durante el desarrollo.

1. Detener el servidor y hacer un backup de la base instalada `D:\Sistema-Agus\gestion-de-ventas-main\backend\prisma\dev.db` en `D:\Sistema-Agus\backups`.
2. Copiar a las rutas equivalentes de la PC instalada:
   - `backend/src/`
   - `backend/prisma/schema.prisma`
   - `backend/prisma/migrations/`
   - `frontend/build/` completo.
3. No reemplazar `dev.db`, sus archivos auxiliares ni `.env`. No copiar toda la carpeta Prisma ni ejecutar reset, seed o db push.
4. En PowerShell:

```powershell
cd D:\Sistema-Agus\gestion-de-ventas-main\backend
npx prisma migrate deploy
npx prisma generate
```

Si un comando falla, detenerse y revisar el error. Luego iniciar con `iniciar.bat`. No se agregaron dependencias nuevas. El frontend ya está compilado; no hace falta copiar `src` para ejecutarlo.

## Importación y precios

Se admite el formato adjunto `.xlsx`: nombre en A, precio unidad/kg en C, precio mayorista en D, presentación en E. Las categorías se leen de los encabezados. Cada producto se identifica por nombre y presentación; cambiar cualquiera de ellos crea otra entrada. Un nombre repetido en otra categoría con igual presentación y precios se importa una vez. Reimportar actualiza costos sin cambiar pedidos ni precios de venta ya publicados.

El precio suelto se conserva exactamente como viene en C. El bulto se calcula multiplicando D por la cantidad de la presentación, incluidos kilos con decimales. No se calcula IVA. Un precio ausente no se deduce del otro. Los productos sin stock se ven en el catálogo pero no se publican para nuevos pedidos.

El bloque de copos/almohaditas tiene otro encabezado, “PRECIO X BULTO”. La vista previa permite confirmar si ese importe ya es el total o si es por unidad/kg. Hasta elegirlo queda pendiente y no se inventa su precio. Si falta la presentación, tampoco se calcula un total mayorista a partir de ella.

Seleccionar productos, indicar los recargos independientes y descargar la lista PDF. “Usar estos precios en pedidos” habilita las presentaciones con precio disponible. El selector de Pedidos incluye Dietética. Sus ventas aparecen en Dietética y no generan comisiones; en pedidos mixtos solo las papas pueden comisionar.

La cantidad de renglón en Pedidos mantiene el funcionamiento actual de cantidades enteras. La presentación de un bulto sí admite kilos fraccionados (por ejemplo 22,68 kg). No se agregó venta fraccionada por peso en este cambio.
