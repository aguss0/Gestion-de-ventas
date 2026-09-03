import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dibujarEncabezadoLista } from './encabezadoListaPrecios';

export function preciosDietetica(a, unidad, bulto) {
  const ru = Number(unidad), rb = Number(bulto);
  if ([ru, rb].some(n => !Number.isFinite(n) || n < 0 || n > 10000)) throw new Error('Ingresá recargos válidos entre 0 y 10000%');
  const venta = (c, r) => a.sinStock || c == null ? null : Math.round(c * (1 + r / 100) * 100) / 100;
  return { unidad: venta(a.costoUnidad, ru), bulto: venta(a.costoBulto, rb) };
}

export function crearListaDietetica(articulos, recargoUnidad, recargoBulto) {
  if (!articulos.length) throw new Error('Seleccioná al menos un artículo');
  const dinero = n => n == null ? '—' : '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const filas = [...articulos].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre)).map(a => {
    const precios = preciosDietetica(a, recargoUnidad, recargoBulto);
    return [a.nombre, a.presentacion || '—', dinero(precios.unidad), dinero(precios.bulto)];
  });
  const doc = new jsPDF();
  const fecha = new Date().toLocaleDateString('es-AR');
  doc.setProperties({ title: 'Lista de precios - MF', creator: 'Sistema ventas' });
  autoTable(doc, {
    head: [['Artículo', 'Presentación', 'Unidad / kg', 'Por bulto']], body: filas,
    margin: { top: 70, bottom: 20, left: 14, right: 14 },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [25, 38, 54], textColor: 255 },
    columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 28 }, 2: { cellWidth: 32, halign: 'right' }, 3: { cellWidth: 32, halign: 'right' } },
    rowPageBreak: 'avoid',
    didDrawPage: () => dibujarEncabezadoLista(doc, fecha),
  });
  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90);
    doc.text(`Página ${p} de ${doc.getNumberOfPages()}`, 196, 287, { align: 'right' });
  }
  return doc;
}
