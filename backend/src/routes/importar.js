const router   = require("express").Router();
const multer   = require("multer");
const XLSX     = require("xlsx");
const prisma   = require("../utils/prisma");
const { PdfReader } = require("pdfreader");

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/importar/precios (Excel)
router.post("/precios-pdf", upload.single("archivo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se subió ningún archivo" });

  try {
    const items = await new Promise((resolve, reject) => {
      const result = [];
      new PdfReader().parseBuffer(req.file.buffer, (err, item) => {
        if (err) return reject(err);
        if (!item) return resolve(result);
        if (item.text) result.push(item.text.trim());
      });
    });

    const resultados = { actualizados: 0, creados: 0, errores: [] };

    let i = 0;
    while (i < items.length) {
      const item = items[i];

      if (/^\d{2,4}$/.test(item)) {
        const codigoRaw = item;
        const codigo    = item.replace(/^0+/, "") || item;
        i++;

        // Guardar nombre
        if (i >= items.length) break;
        const nombre = items[i];
        i++;

        // Buscar precio saltando unidad
        let precio = null;
        while (i < items.length) {
          const siguiente = items[i];
          if (/^[\d]+([.,]\d{1,2})?$/.test(siguiente)) {
            precio = parseFloat(siguiente.replace(",", "."));
            i++;
            break;
          }
          if (/^\d{2,4}$/.test(siguiente)) break;
          i++;
        }

        if (!precio || precio <= 0) continue;

        const articuloBuscado = await prisma.articulo.findFirst({
          where: { codigo: { in: [codigo, codigoRaw, codigo.padStart(3, "0")] } }
        });

        if (!articuloBuscado) {
          // Crear artículo nuevo automáticamente
          await prisma.articulo.create({
            data: {
              codigo: codigoRaw,
              nombre,
              precio,
            },
          });
          resultados.creados++;
        } else {
          // Actualizar precio del existente
          await prisma.articulo.update({
            where: { codigo: articuloBuscado.codigo },
            data:  { precio },
          });
          resultados.actualizados++;
        }
      } else {
        i++;
      }
    }

    res.json({
      mensaje: `${resultados.actualizados} precio(s) actualizado(s) · ${resultados.creados} artículo(s) nuevo(s) creado(s)`,
      ...resultados,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al procesar el PDF" });
  }
});

module.exports = router;