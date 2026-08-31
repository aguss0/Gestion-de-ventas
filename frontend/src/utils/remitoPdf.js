import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const fmtFecha = (fecha) => {
  if (!fecha) return "-";
  const d = new Date(fecha);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
};

const fmtCantidad = (cantidad) =>
  Number(cantidad || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDinero = (importe) =>
  Number(importe || 0).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const valor = (dato) => (dato === null || dato === undefined || dato === "" ? "-" : String(dato));

export function descargarRemito(pedido) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const margen = 17;
  const tinta = [42, 42, 42];
  const gris = [100, 100, 100];
  const borde = [165, 165, 165];
  const cliente = pedido.cliente || {};
  const textoEnAncho = (texto, maximo) => doc.splitTextToSize(valor(texto), maximo)[0];
  const condicionVenta = Number(pedido.saldo || 0) > 0 ? "Cuenta corriente" : "Contado / cancelado";
  const total = Number(pedido.total || 0);

  doc.setProperties({
    title: `Remito ${pedido.nroOrden}`,
    subject: `Remito del pedido ${pedido.nroOrden}`,
    creator: "Sistema de Pedidos",
  });

  doc.setTextColor(...tinta);
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.text("REMITO", margen, 18);
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...gris);
  doc.text("DOCUMENTO NO VALIDO COMO FACTURA", margen, 23);
  doc.setDrawColor(...borde);
  doc.setLineWidth(0.25);
  doc.line(margen, 27, ancho - margen, 27);

  const etiquetaX = margen;
  const valorX = margen + 41;
  const info = [
    ["Fecha:", fmtFecha(pedido.fecha)],
    ["Remito Nro.:", String(pedido.nroOrden).padStart(8, "0")],
    ["Cliente:", cliente.nombre],
    ["CUIT:", cliente.cuit],
    ["Domicilio:", [cliente.direccion, cliente.barrio].filter(Boolean).join(" - ")],
    ["Condicion de venta:", condicionVenta],
    ["Vendedor:", pedido.vendedor?.nombre],
  ];

  doc.setFontSize(10);
  info.forEach(([etiqueta, dato], indice) => {
    const y = 35 + indice * 6;
    doc.setFont("times", "normal");
    doc.setTextColor(...gris);
    doc.text(etiqueta, etiquetaX, y);
    doc.setTextColor(...tinta);
    doc.text(textoEnAncho(dato, ancho - margen - valorX), valorX, y);
  });

  const filas = (pedido.detalle || []).map((item) => {
    const entregado = Number(item.cantidad) - Number(item.cantidadFaltante || 0);
    const articulo = [item.articulo?.codigo, item.articulo?.nombre].filter(Boolean).join(" - ");
    return [fmtCantidad(entregado), articulo || "Articulo", fmtCantidad(entregado), fmtDinero(item.precio), fmtDinero(item.subtotal)];
  });

  autoTable(doc, {
    startY: 81,
    head: [["CANT.", "ARTICULO", "BULTOS", "PRECIO", "SUBTOTAL"]],
    body: filas,
    theme: "plain",
    margin: { left: margen, right: margen, bottom: 35 },
    styles: { font: "times", fontSize: 9, textColor: tinta, cellPadding: { top: 2.2, right: 2, bottom: 2.2, left: 2 }, lineColor: borde },
    headStyles: { fontStyle: "bold", textColor: tinta, fillColor: [242, 242, 242], lineWidth: { top: 0.25, bottom: 0.25 } },
    bodyStyles: { lineWidth: { right: 0.1 } },
    columnStyles: {
      0: { cellWidth: 22, halign: "right" },
      1: { cellWidth: 77 },
      2: { cellWidth: 22, halign: "right" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 27, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) data.cell.styles.fontStyle = "bold";
    },
  });

  let y = doc.lastAutoTable.finalY;
  if (y > alto - 92) {
    doc.addPage();
    y = 25;
  }

  const totalX = ancho - margen;
  const etiquetaTotalX = ancho - margen - 57;
  const totales = [["SubTotal", total], ["Descuento %", 0], ["Neto", total]];
  doc.setDrawColor(...borde);
  doc.line(margen, y, ancho - margen, y);
  doc.setFontSize(10);
  totales.forEach(([etiqueta, importe], indice) => {
    const filaY = y + 7 + indice * 7;
    doc.setFont("times", indice === totales.length - 1 ? "bold" : "normal");
    doc.setTextColor(...tinta);
    doc.text(etiqueta, margen, filaY);
    doc.text(fmtDinero(importe), totalX, filaY, { align: "right" });
    if (indice === totales.length - 1) doc.line(etiquetaTotalX, filaY + 2.5, totalX, filaY + 2.5);
  });

  let observacionesY = y + 34;
  const observaciones = pedido.observaciones?.trim();
  if (observaciones) {
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.text("Observaciones:", margen, observacionesY);
    doc.setFont("times", "normal");
    doc.text(doc.splitTextToSize(observaciones, ancho - margen * 2 - 27), margen + 27, observacionesY);
    observacionesY += 15;
  }

  const firmaY = Math.min(Math.max(observacionesY + 22, 170), alto - 29);
  doc.setLineWidth(0.2);
  doc.line(margen, firmaY, margen + 61, firmaY);
  doc.line(ancho - margen - 61, firmaY, ancho - margen, firmaY);
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...gris);
  doc.text("Firma entrega", margen + 30.5, firmaY + 5, { align: "center" });
  doc.text("Firma y aclaracion cliente", ancho - margen - 30.5, firmaY + 5, { align: "center" });

  const cantidadPaginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= cantidadPaginas; pagina += 1) {
    doc.setPage(pagina);
    doc.setDrawColor(...borde);
    doc.line(margen, alto - 14, ancho - margen, alto - 14);
    doc.setFont("times", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...gris);
    doc.text(`Remito Nro. ${pedido.nroOrden}`, margen, alto - 8);
    doc.text(`Pagina ${pagina} de ${cantidadPaginas}`, ancho - margen, alto - 8, { align: "right" });
  }

  doc.save(`remito-${pedido.nroOrden}.pdf`);
}
