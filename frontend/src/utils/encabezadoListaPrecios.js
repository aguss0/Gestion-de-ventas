// Contacto comercial compartido por las listas que se entregan a los clientes.
export const contactoListaPrecios = {
  vendedor: 'Miguel Sanchez',
  telefono: '3512590512',
  email: 'j.miguel.sanchez.23@gmail.com',
};

export function dibujarEncabezadoLista(doc, fecha) {
  const { vendedor, telefono, email } = contactoListaPrecios;
  doc.setFillColor(25, 38, 54);
  doc.roundedRect(14, 12, 182, 50, 3, 3, 'F');
  doc.setFillColor(221, 175, 85);
  doc.rect(20, 18, 1, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(221, 175, 85);
  doc.text('VENTAS POR MAYOR Y MENOR', 24, 22);
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('Lista de precios', 20, 33);
  doc.setFontSize(11);
  doc.text(vendedor, 20, 43);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(229, 235, 242);
  doc.textWithLink(`Tel: ${telefono}`, 20, 50, { url: `tel:${telefono}` });
  doc.textWithLink(email, 20, 56, { url: `mailto:${email}` });
  doc.setFontSize(8);
  doc.setTextColor(190, 201, 214);
  doc.text(fecha, 190, 56, { align: 'right' });
}
