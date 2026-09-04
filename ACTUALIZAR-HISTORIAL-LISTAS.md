# Historial de listas de precios

Esta actualización agrega un historial permanente para las listas PDF de Descartables y MF. Al descargar una lista se guarda una fotografía de sus artículos, precios finales, porcentajes y fecha. Desde “Historial listas” se puede consultar y volver a descargar sin recalcular con los costos actuales.

Requiere la migración aditiva `20260903000000_historial_listas_precios`. La migración crea una tabla nueva y no elimina ni modifica los datos existentes.

En la PC instalada: cerrar el sistema, respaldar `backend/prisma/dev.db`, copiar `backend/src`, `backend/prisma/schema.prisma`, `backend/prisma/migrations` y `frontend/build`. Nunca reemplazar `dev.db`, `.env` ni toda la carpeta Prisma. Luego ejecutar desde `backend`:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Si algún comando falla, detenerse. No ejecutar `migrate reset`, `db push` ni seeds.
