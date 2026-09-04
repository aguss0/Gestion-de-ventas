import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dibujarEncabezadoLista } from './encabezadoListaPrecios';

export function crearListaDesdeHistorial(lista) {
  if (!lista?.items?.length) throw new Error('La lista no contiene artículos');
  const dinero = n => n == null ? '—' : '$ ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const descartables = lista.tipo === 'descartables';
  const filas = lista.items.map(a => descartables
    ? [a.codigo || '—', a.nombre, String(a.unidadesBulto ?? '—'), dinero(a.precioUnidad), dinero(a.precioBulto)]
    : [a.nombre, a.presentacion || '—', dinero(a.precioUnidad), dinero(a.precioBulto)]);
  const doc = new jsPDF();
  const fecha = new Date(lista.creadoEn || Date.now()).toLocaleDateString('es-AR');
  doc.setProperties({ title: 'Lista de precios', creator: 'Sistema ventas' });
  autoTable(doc, {
    head: [descartables ? ['Código', 'Artículo', 'Unid. / bulto', 'Por unidad', 'Por bulto'] : ['Artículo', 'Presentación', 'Unidad / kg', 'Por bulto']],
    body: filas,
    margin: { top: 70, bottom: 20, left: 14, right: 14 },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [25, 38, 54], textColor: 255 },
    columnStyles: descartables
      ? { 0: { cellWidth: 22 }, 1: { cellWidth: 74 }, 2: { cellWidth: 22, halign: 'right' }, 3: { cellWidth: 32, halign: 'right' }, 4: { cellWidth: 32, halign: 'right' } }
      : { 0: { cellWidth: 90 }, 1: { cellWidth: 28 }, 2: { cellWidth: 32, halign: 'right' }, 3: { cellWidth: 32, halign: 'right' } },
    rowPageBreak: 'avoid', didDrawPage: () => dibujarEncabezadoLista(doc, fecha, {
      vendedor: lista.vendedor || 'Miguel Sanchez', telefono: lista.telefono || '3512590512', email: lista.email || 'j.miguel.sanchez.23@gmail.com',
    }),
  });
  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90);
    doc.text(`Página ${p} de ${doc.getNumberOfPages()}`, 196, 287, { align: 'right' });
  }
  return doc;
}
