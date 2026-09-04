import { crearListaDesdeHistorial } from './listaHistorialPdf';

export function preciosDietetica(a, unidad, bulto) {
  const ru = Number(unidad), rb = Number(bulto);
  if ([ru, rb].some(n => !Number.isFinite(n) || n < 0 || n > 10000)) throw new Error('Ingresá recargos válidos entre 0 y 10000%');
  const venta = (c, r) => a.sinStock || c == null ? null : Math.round(c * (1 + r / 100) * 100) / 100;
  return { unidad: venta(a.costoUnidad, ru), bulto: venta(a.costoBulto, rb) };
}

export function crearListaDietetica(articulos, recargoUnidad, recargoBulto) {
  if (!articulos.length) throw new Error('Seleccioná al menos un artículo');
  const items = [...articulos].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre)).map(a => {
    const precios = preciosDietetica(a, recargoUnidad, recargoBulto);
    return { codigo: a.codigo, nombre: a.nombre, presentacion: a.presentacion, precioUnidad: precios.unidad, precioBulto: precios.bulto };
  });
  return crearListaDesdeHistorial({ tipo: 'mf', items });
}

export function snapshotDietetica(articulos, recargoUnidad, recargoBulto) {
  return [...articulos].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre)).map(a => {
    const p = preciosDietetica(a, recargoUnidad, recargoBulto);
    return { codigo: a.codigo, nombre: a.nombre, presentacion: a.presentacion, precioUnidad: p.unidad, precioBulto: p.bulto };
  });
}
