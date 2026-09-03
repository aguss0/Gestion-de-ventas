// Reglas comerciales indicadas para los códigos de categoría del proveedor.
export function costosFinalesDescartable(articulo) {
  const grupo = String(articulo.categoria || '').split('/').pop().trim();
  const codigo = grupo.match(/^(100|50|0)\s*[-–—]/)?.[1];
  const tasas = { 100: 0.21, 50: 0.105, 0: 0 };
  if (codigo === undefined) return { unidad: null, bulto: null, motivo: 'Revisar categoría' };
  const costo = articulo.costoBulto;
  if (typeof costo !== 'number' || !Number.isFinite(costo) || costo < 0) {
    return { unidad: null, bulto: null, motivo: 'Revisar costo' };
  }
  const total = costo * (1 + tasas[codigo]) * 0.97;
  const redondear = n => Math.round((n + Number.EPSILON * Math.max(1, n)) * 100) / 100;
  const unidades = Number(articulo.unidadesBulto);
  const cantidadValida = Number.isInteger(unidades) && unidades > 0;
  return {
    unidad: cantidadValida ? redondear(total / unidades) : null,
    bulto: redondear(total),
    motivo: cantidadValida ? null : 'Revisar unidades',
  };
}
