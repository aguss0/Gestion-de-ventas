import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dibujarEncabezadoLista } from './encabezadoListaPrecios';

export function preciosDescartable(a, unidad, bulto) {
  const ru = Number(unidad), rb = Number(bulto);
  if ([ru, rb].some(n => !Number.isFinite(n) || n < 0 || n > 10000)) throw new Error('Ingresá recargos válidos entre 0 y 10000%');
  if (!a.unidadesBulto || !Number.isFinite(a.costoBulto)) throw new Error(`Revisá las unidades por bulto de ${a.codigo}`);
  return { unidad: Math.round(a.costoBulto / a.unidadesBulto * (1 + ru / 100) * 100) / 100,
    bulto: Math.round(a.costoBulto * (1 + rb / 100) * 100) / 100 };
}

export function crearListaDescartables(articulos, recargoUnidad, recargoBulto) {
  if (!articulos.length) throw new Error('Seleccioná al menos un artículo');
  const dinero = n => '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const filas = [...articulos].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre)).map(a => {
    const precios = preciosDescartable(a, recargoUnidad, recargoBulto);
    return [a.codigo, a.nombre, String(a.unidadesBulto), dinero(precios.unidad), dinero(precios.bulto)];
  });
  const doc = new jsPDF();
  const fecha = new Date().toLocaleDateString('es-AR');
  doc.setProperties({ title: 'Lista de precios - Descartables', creator: 'Sistema ventas' });
  autoTable(doc, {
    head: [['Código', 'Artículo', 'Unid. / bulto', 'Por unidad', 'Por bulto']], body: filas,
    margin: { top: 70, bottom: 20, left: 14, right: 14 },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [25, 38, 54], textColor: 255 },
    columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 74 }, 2: { cellWidth: 22, halign: 'right' }, 3: { cellWidth: 32, halign: 'right' }, 4: { cellWidth: 32, halign: 'right' } },
    rowPageBreak: 'avoid',
    didDrawPage: () => dibujarEncabezadoLista(doc, fecha),
  });
  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90);
    doc.text(`Página ${p} de ${doc.getNumberOfPages()}`, 196, 287, { align: 'right' });
  }
  return doc;
}
