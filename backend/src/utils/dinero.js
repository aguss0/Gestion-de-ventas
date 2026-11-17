// Redondea a centavos para evitar residuos de punto flotante
// (ej. 4042278.48 - 4042278.4799999995 = 0.0000000005 dejaba saldos "fantasma").
function r2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// Saldo = total - pagado, redondeado y nunca negativo
function saldoDe(total, pagado) {
  return Math.max(0, r2(total - pagado));
}

module.exports = { r2, saldoDe };
