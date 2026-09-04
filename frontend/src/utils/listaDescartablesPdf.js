import { preciosVentaDescartable } from './costosDescartables';
import { crearListaDesdeHistorial } from './listaHistorialPdf';

export const preciosDescartable = preciosVentaDescartable;

export function crearListaDescartables(articulos, recargoUnidad, recargoBulto) {
  if (!articulos.length) throw new Error('Seleccioná al menos un artículo');
  const items = [...articulos].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre)).map(a => {
    const precios = preciosDescartable(a, recargoUnidad, recargoBulto);
    return { codigo: a.codigo, nombre: a.nombre, unidadesBulto: a.unidadesBulto, precioUnidad: precios.unidad, precioBulto: precios.bulto };
  });
  return crearListaDesdeHistorial({ tipo: 'descartables', items });
}

export function snapshotDescartables(articulos, recargoUnidad, recargoBulto) {
  return [...articulos].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre)).map(a => {
    const p = preciosDescartable(a, recargoUnidad, recargoBulto);
    return { codigo: a.codigo, nombre: a.nombre, unidadesBulto: a.unidadesBulto, precioUnidad: p.unidad, precioBulto: p.bulto };
  });
}
