# Laurens, MF y Dietética con stock

Artículos ahora se llama Laurens. El catálogo Excel anterior se llama MF y conserva sus datos y su importación. Dietética reúne artículos manuales con stock, compras a proveedores y ventas/rentabilidad.

Los artículos manuales con manejo de stock se muestran en Dietética; los manuales sin stock en Laurens. Los catálogos importados MF y Descartables permanecen separados. No se trasladan ni borran registros. Las cuentas siguen calculándose por pedido completo, también para pedidos mixtos.

Este cambio no agrega migraciones ni modifica el esquema. Si la instalación ya tiene las migraciones anteriores de Descartables y del catálogo Excel, no necesita nuevas migraciones por esta reorganización.

Para actualizar la otra PC, detener el sistema y hacer un backup. Reemplazar backend/src y frontend/build con las versiones actualizadas; luego reiniciar con iniciar.bat. Conservar dev.db, .env y la configuración local. No copiar la base de desarrollo ni ejecutar prisma migrate reset o db push.

Para desarrollo se actualiza también frontend/src. El build se genera con npm run build dentro de frontend.

La rentabilidad usa el precio promedio de las compras registradas. Un stock inicial cargado manualmente no tiene costo de compra asociado: registrar las compras para obtener costos representativos, sin duplicar esas cantidades en el stock inicial.
