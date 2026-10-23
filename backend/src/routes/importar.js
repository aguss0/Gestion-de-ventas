const router = require("express").Router();
const multer = require("multer");
const XLSX   = require("xlsx");
const prisma = require("../utils/prisma");
const { PdfReader } = require("pdfreader");

const upload = multer({ storage: multer.memoryStorage() });

// Devuelve un número > 0, o null si el valor no es un precio válido
function parsearPrecio(valor) {
  if (typeof valor === "number") return valor > 0 ? valor : null;
  if (typeof valor !== "string") return null;
  const limpio = valor.trim().replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null; // "SIN STOCK", "-", encabezados
  const n = parseFloat(limpio);
  return n > 0 ? n : null;
}

// Para comparar nombres sin importar mayúsculas, tildes ni espacios de más
function normalizar(txt) {
  return String(txt || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\s+/g, " ").trim();
}

// POST /api/importar/precios (Excel)
router.post("/precios", upload.single("archivo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se subió ningún archivo" });

  try {
    const wb   = XLSX.read(req.file.buffer, { type: "buffer" });
    const hoja = wb.Sheets[wb.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: null, raw: true });

    const articulos = await prisma.articulo.findMany();
    const porNombre = new Map(articulos.map(a => [normalizar(a.nombre), a]));

    const resultados = { actualizados: 0, creados: 0, errores: [] };

    for (let idx = 0; idx < filas.length; idx++) {
      const fila   = filas[idx];
      const nroFila = idx + 1;
      const nombre = typeof fila[0] === "string" ? fila[0].trim() : "";
      const celdaPrecio = fila[2];

      if (!nombre || celdaPrecio === null || celdaPrecio === undefined) continue; // títulos / descripciones

      const precio = parsearPrecio(celdaPrecio);

      if (precio === null) {
        // Encabezados repetidos ("PRECIO X UNIDAD / KG"): se ignoran sin avisar
        if (typeof celdaPrecio === "string" && /^precio/i.test(celdaPrecio.trim())) continue;
        resultados.errores.push(`Fila ${nroFila}: ${nombre} → sin precio válido ("${celdaPrecio}")`);
        continue;
      }

      const articulo = porNombre.get(normalizar(nombre));
      if (!articulo) {
        resultados.errores.push(`Fila ${nroFila}: ${nombre} → no existe un artículo con ese nombre`);
        continue;
      }

      await prisma.articulo.update({
        where: { codigo: articulo.codigo },
        data:  { precio },
      });
      resultados.actualizados++;
    }

    res.json({
      mensaje: `${resultados.actualizados} precio(s) actualizado(s) · ${resultados.errores.length} fila(s) omitida(s)`,
      ...resultados,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al procesar el Excel" });
  }
});

// POST /api/importar/precios-pdf (PDF)
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

        if (i >= items.length) break;
        const nombre = items[i];
        i++;

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
          await prisma.articulo.create({
            data: { codigo: codigoRaw, nombre, precio },
          });
          resultados.creados++;
        } else {
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