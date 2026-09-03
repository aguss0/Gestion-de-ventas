/** @jest-environment node */
import fs from 'fs';
import path from 'path';
import { crearListaDescartables } from './listaDescartablesPdf';
import { crearListaDietetica } from './listaDieteticaPdf';

test.each(['Descartables', 'MF'])('contacto y título en todas las páginas de %s', tipo => {
  const articulos = Array.from({ length: 70 }, (_, i) => ({
    codigo: `A${String(i + 1).padStart(3, '0')}`, nombre: tipo === 'MF' ? `Almendras naturales - presentación ${i + 1}` : `Vasos descartables - presentación ${i + 1}`,
    categoria: 'Ejemplo', costoBulto: 12000, costoUnidad: 1100, unidadesBulto: 12, presentacion: '12 UNID',
  }));
  const doc = tipo === 'MF' ? crearListaDietetica(articulos, 20, 10) : crearListaDescartables(articulos, 20, 10);
  const pdf = doc.output();
  const paginas = doc.getNumberOfPages();
  expect(paginas).toBeGreaterThan(1);
  expect(pdf.split('Miguel Sanchez').length - 1).toBe(paginas);
  expect(pdf.split('VENTAS POR MAYOR Y MENOR').length - 1).toBe(paginas);
  expect(pdf.split('(Lista de precios) Tj').length - 1).toBe(paginas);
  expect(pdf).not.toContain('Vendedor:');
  expect(pdf).not.toContain('VENTA Y ASESORAMIENTO');
  expect(pdf.split('Tel: 3512590512').length - 1).toBe(paginas);
  expect(pdf).toContain('mailto:j.miguel.sanchez.23@gmail.com');
  expect(pdf).toContain(`Lista de precios - ${tipo}`);
  if (process.env.PDF_PREVIEW_DIR) {
    fs.mkdirSync(process.env.PDF_PREVIEW_DIR, { recursive: true });
    fs.writeFileSync(path.join(process.env.PDF_PREVIEW_DIR, `${tipo}.pdf`), Buffer.from(doc.output('arraybuffer')));
  }
});
