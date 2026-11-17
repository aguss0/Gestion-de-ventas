# Tienda Online: nombre en tienda y renglones de precio

## Qué cambia

En **Tienda Online → Nombre, precios, categoría e imagen** de cada artículo:

- **Nombre en tienda** (opcional): el producto se publica con ese nombre. Vacío = nombre del sistema. No cambia listas, pedidos ni remitos.
- **Precios en tienda**: un renglón por cada forma de venta (hasta 6):
  - **Por peso**: el precio es por kg. El cliente elige los gramos con – / + (de a "Gramos por paso", ej. 250 g) y el botón dice "Agregar 750 g". Se cobra proporcional al kg.
  - **Por unidad**, **Bulto cerrado**, **Pack cerrado**: con detalle opcional (ej. "10 kg", "x 12").
  - Precio vacío en un renglón = precio base (Precio base en tienda, o el del sistema si ese también está vacío).
  - Sin renglones, la tienda muestra el precio único como antes.

Guardar y después **Sincronizar catálogo** para publicarlo.

## Orden de actualización (importante)

1. **Primero la tienda pública (Cloudflare)**, porque la API vieja rechaza los renglones nuevos. Desde `D:\Proyectos\Tienda online\tienda-publica`:

   npx wrangler d1 migrations apply catalogo-online --remote
   npm run build:cloudflare
   npx wrangler deploy --config dist/server/wrangler.json

   La migración `0001_precios_renglones` sólo agrega la columna `precios`; no borra productos.

2. **Después el sistema (PC del negocio)**, igual que en ACTUALIZAR-TIENDA-ONLINE.md: copiar backend/src, frontend/build, schema.prisma y la carpeta de migraciones, y desde backend:

   npx prisma migrate deploy
   npx prisma generate

   La migración `20261118000000_tienda_nombre_precios` agrega `nombre_online` y `precios_online` a `articulos` (sólo columnas nuevas, vacías).

Mientras ningún artículo tenga renglones cargados, el sistema nuevo sigue funcionando con la tienda vieja.

## Carritos ya guardados

Los carritos de los clientes guardados en el navegador siguen funcionando (se interpretan como el primer renglón).
