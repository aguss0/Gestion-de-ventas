require("dotenv").config();
const app  = require("./app");
const PORT = process.env.PORT || 3001;
const prisma = require("./utils/prisma");

// Limpia saldos "fantasma" (< 1 centavo) que dejó el redondeo de punto flotante,
// para que esos pedidos figuren como saldados y no reciban excedentes.
prisma.pedido
  .updateMany({ where: { saldo: { gt: 0, lt: 0.01 } }, data: { saldo: 0 } })
  .then(r => r.count && console.log(`Saldos residuales corregidos: ${r.count}`))
  .catch(e => console.error("No se pudieron corregir saldos residuales:", e.message));

app.listen(PORT, "127.0.0.1", () => console.log(`🚀 Servidor en http://localhost:${PORT}`));