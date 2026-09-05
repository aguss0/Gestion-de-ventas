import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dibujarEncabezadoLista } from './encabezadoListaPrecios';

export function crearListaDesdeHistorial(lista) {
  if (!lista?.items?.length) throw new Error('La lista no contiene artículos');
  const dinero = n => n == null ? '—' : '$ ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const doc = new jsPDF();
  const fecha = new Date(lista.creadoEn || Date.now()).toLocaleDateString('es-AR');
  doc.setProperties({ title: 'Lista de precios', creator: 'Sistema ventas' });
  const nombres = { snacks: 'SNACKS', descartables: 'DESCARTABLES', mf: 'DIETÉTICA', frutos_secos: 'FRUTOS SECOS' };
  const orden = ['snacks', 'descartables', 'mf', 'frutos_secos'];
  const grupoPredeterminado = lista.tipo === 'mf' ? 'mf' : 'descartables';
  const agrupados = orden.map(grupo => [grupo, lista.items.filter(a => (a.grupo || grupoPredeterminado) === grupo)]).filter(([, items]) => items.length);
  agrupados.forEach(([grupo, items], indice) => {
    const startY = indice === 0 ? 70 : (doc.lastAutoTable?.finalY || 70) + 8;
    if (startY > 255) doc.addPage();
    autoTable(doc, {
      startY: startY > 255 ? 70 : startY,
      head: [[{ content: nombres[grupo], colSpan: 5, styles: { fillColor: [25, 38, 54], fontStyle: 'bold', fontSize: 11 } }], ['Código', 'Artículo', 'Presentación', 'Por unidad', 'Por bulto']],
      body: items.map(a => [a.codigo || '—', a.nombre, a.presentacion || (a.unidadesBulto ? `${a.unidadesBulto} unidades` : '—'), dinero(a.precioUnidad), dinero(a.precioBulto)]),
      margin: { top: 70, bottom: 20, left: 14, right: 14 },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
      headStyles: { fillColor: [51, 65, 85], textColor: 255 },
      columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 74 }, 2: { cellWidth: 28 }, 3: { cellWidth: 29, halign: 'right' }, 4: { cellWidth: 29, halign: 'right' } },
      rowPageBreak: 'avoid', didDrawPage: () => dibujarEncabezadoLista(doc, fecha, {
        vendedor: lista.vendedor || 'Miguel Sanchez', telefono: lista.telefono || '3512590512', email: lista.email || 'j.miguel.sanchez.23@gmail.com',
      }),
    });
  });
  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90);
    doc.text(`Página ${p} de ${doc.getNumberOfPages()}`, 196, 287, { align: 'right' });
  }
  return doc;
}
