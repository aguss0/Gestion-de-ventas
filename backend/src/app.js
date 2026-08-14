const express    = require("express");
const cors       = require("cors");
const morgan     = require("morgan");
const path       = require("path");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(morgan("dev"));

// ─── Rutas API ───────────────────────────────────────────────
app.use("/api/clientes",     require("./routes/clientes"));
app.use("/api/articulos",    require("./routes/articulos"));
app.use("/api/vendedores",   require("./routes/vendedores"));
app.use("/api/pedidos",      require("./routes/pedidos"));
app.use("/api/pagos",        require("./routes/pagos"));
app.use("/api/estadocuenta", require("./routes/estadocuenta"));
app.use("/api/comisiones",   require("./routes/comisiones"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ─── Servir frontend estático ────────────────────────────────
const frontendPath = path.join(__dirname, "../../frontend/build");
app.use(express.static(frontendPath));
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ─── Manejo de errores ───────────────────────────────────────
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({ error: err.message || "Error interno" });
});

module.exports = app;