# Actualizar la PC del negocio desde el ZIP de GitHub

Esta versión reúne las listas de precios y la opción Tienda Online. El ZIP contiene el programa, las migraciones y el frontend compilado. No contiene la base del negocio ni las claves de conexión.

## Antes de subir a GitHub

Subir los cambios actuales de backend/src, backend/prisma/schema.prisma, backend/prisma/migrations y frontend/build, además del resto del código y los archivos de dependencias. No subir .env, bases SQLite, node_modules ni backend/data. No subir la carpeta de respaldos o la base de prueba.

La base backend/prisma/dev.db estaba registrada anteriormente en Git. Se quitó del seguimiento actual sin borrar el archivo local. Si existía en commits anteriores, sigue en el historial: esta exclusión no limpia publicaciones pasadas. No publicar un historial que contenga datos reales; revisar el repositorio antes de hacerlo público.

## Instalación

1. En la PC del negocio, cerrar el sistema y detener su servidor. Conservar una copia de toda la instalación anterior, incluyendo backend/prisma/dev.db, sus archivos auxiliares, backend/.env y backend/data. Hacer el respaldo con el servidor detenido.
2. Descargar el ZIP de la versión actualizada de GitHub y extraerlo en una carpeta separada. No iniciar esa copia como una instalación nueva.
3. En la carpeta donde ya funciona el sistema, reemplazar backend/src y frontend/build con las carpetas del ZIP. Reemplazar completamente frontend/build, para evitar mezclar archivos de versiones distintas.
4. Copiar backend/prisma/schema.prisma y las carpetas de backend/prisma/migrations. No reemplazar toda la carpeta backend/prisma. Conservar dev.db y .env, backend/data, archivos de negocio y el iniciador configurado para esta PC.
5. Desde la carpeta backend de la instalación existente, ejecutar:

   npx prisma migrate deploy
   npx prisma generate

   Si falla un comando, detenerse y guardar el error. No ejecutar migrate reset, db push ni seeds. Antes de ejecutar, comprobar que la versión instalada de Prisma coincida con la indicada en backend/package.json; si las dependencias no coinciden, revisar la actualización antes de continuar.
6. Configurar en el backend/.env existente, conservando las demás variables:

   CATALOGO_API_URL=https://tienda-online.tienda-online-agus.workers.dev
   CATALOGO_SYNC_TOKEN=<clave privada de sincronización>

   La clave debe trasladarse de forma privada desde el backend de la PC de prueba. No está en GitHub ni en este documento. No copiar el .env completo de la PC de prueba: conservar la configuración propia de la PC del negocio.
7. Iniciar con el iniciador habitual. Comprobar clientes, pedidos, stock, listas de precios y la opción Tienda Online antes de sincronizar.
8. Elegir los artículos que se publicarán y sincronizar. La primera sincronización desde la base real reemplaza el catálogo público de prueba. Solo se envían los datos públicos de los artículos seleccionados; no se suben clientes, pedidos ni la base completa.

No aplicar estas instrucciones a una base o instalación desconocida sin revisar primero su estado. Si la instalación no tiene historial de migraciones de Prisma, no intentar corregirlo borrando datos: guardar el error para revisarlo.

## Precio distinto para la tienda

En Tienda Online, cada producto permite cargar un Precio en tienda opcional. Si está vacío, se publica el precio vigente del sistema; si está cargado, ese importe se mantiene para la tienda aunque cambie el precio local. Borrar el importe vuelve a usar el precio local. Guardar y luego sincronizar para publicarlo.

Esto no cambia listas de precios, pedidos ni ventas locales. La actualización agrega únicamente la columna opcional precio_online mediante la migración 20260918000000_precio_online. Conservarla junto con las migraciones anteriores en el ZIP.
