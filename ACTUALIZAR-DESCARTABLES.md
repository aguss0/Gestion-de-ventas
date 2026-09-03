# Actualización de Descartables

Esta funcionalidad **sí necesita una migración de Prisma**: agrega el catálogo de descartables y dos campos opcionales en artículos. No elimina datos existentes.

## En la computadora donde se utiliza el sistema

1. Cerrá el sistema y detené el servidor. Hacé un backup de `D:\Sistema-Agus\gestion-de-ventas-main\backend\prisma\dev.db` en `D:\Sistema-Agus\backups` antes de continuar. Conservá también una copia de la versión anterior del programa.
2. Copiá desde la versión actualizada estas carpetas/archivos a sus equivalentes dentro de `D:\Sistema-Agus\gestion-de-ventas-main`:
   - `backend/src/`
   - `backend/prisma/schema.prisma`
   - `backend/prisma/migrations/` (incluye `20260902000000_descartables`)
   - `frontend/build/` completo, generado con esta versión.
3. **Nunca reemplaces `dev.db`, sus archivos auxiliares ni `.env`. No copies toda la carpeta `backend/prisma`. No ejecutes reset, seed ni `db push`.**
4. En PowerShell:

```powershell
cd D:\Sistema-Agus\gestion-de-ventas-main\backend
npx prisma migrate deploy
npx prisma generate
```

Si alguno falla, no sigas ni restablezcas la base: conservá el error para revisarlo.

5. Iniciá con `iniciar.bat` y abrí Descartables. Importá el PDF y revisá la vista previa antes de confirmar.

No se agregaron dependencias nuevas. Si se usa `frontend/build`, no hace falta copiar `frontend/src` ni compilar en la PC de uso. Si querés mantener allí también el código fuente, podés copiar `frontend/src`, pero eso no reemplaza el build.

## Funcionamiento

- El importe del proveedor es por bulto. Las cantidades explícitas permiten calcular el costo unitario; las ambiguas quedan para revisión manual.
- Reimportar actualiza por código sin duplicar ni borrar productos ausentes. Conserva cantidades corregidas manualmente.
- “Completar cantidades automáticamente” aplica las nuevas reglas a los artículos ya cargados que todavía no tienen cantidad. No requiere reimportar el PDF y no toca cantidades manuales, precios de venta ni pedidos. Reconoce miles, cantidades sin “UNI” y niveles de paquetes (por ejemplo, 20 PAQ X 50 U = 1000). Peso, capacidad y dimensiones por sí solos no permiten deducir piezas y siguen pendientes. Esta mejora no necesita migraciones adicionales; actualizar `backend/src/` y `frontend/build/` y reiniciar.
- Seleccioná artículos y elegí un recargo general para unidad y otro para bulto. El PDF incluye solo los seleccionados y sus precios de venta, sin IVA, costos ni porcentajes.
- “Usar estos precios en pedidos” crea/actualiza las presentaciones unidad y bulto en Artículos. No cambia pedidos anteriores. El resumen cuenta ventas de esas presentaciones en pedidos activos, descontando faltantes.
- En Nuevo pedido y Editar pedido, el selector junto a “Agregar artículo” separa Papas y Descartables. Cambiarlo no elimina artículos ya agregados.
- Los descartables no generan comisiones. En pedidos mixtos, solo se calcula sobre papas (conservando la exclusión de artículos de papas que manejan stock). La comisión se actualiza al editar el pedido, cambiar faltantes o quitar renglones.
- Este selector y la exclusión de comisiones no requieren otra migración adicional a `20260902000000_descartables`. Para actualizar desde la primera versión de Descartables, copiar `backend/src/` y el nuevo `frontend/build/` y reiniciar. No se ejecuta una limpieza masiva de comisiones históricas.
- La lectura está adaptada al formato del PDF de VASA suministrado; otro diseño o un escaneo puede requerir adaptación.

## Desarrollo

La migración debe aplicarse también en la PC de desarrollo antes de usar esta pantalla; no se aplica automáticamente al iniciar.

Pruebas del backend: `node --test tests/descartables.test.js` desde `backend`. Siempre crean una base temporal independiente. Para probar además el PDF real, definir `TEST_SUPPLIER_PDF` con su ruta antes de ejecutarlas.
