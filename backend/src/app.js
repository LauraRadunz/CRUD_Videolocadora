require("./config/env");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { exigirAuth } = require("./middlewares/auth");

const app = express();

app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== "test") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

app.use("/api/login", require("./routes/authRoutes"));
app.use("/api/filmes", require("./routes/filmeRoutes"));
app.use("/api/generos", require("./routes/generoRoutes"));
app.use("/api/clientes", exigirAuth, require("./routes/clienteRoutes"));
app.use("/api/locacoes", exigirAuth, require("./routes/locacaoRoutes"));

app.use("/api", (req, res) => res.status(404).json({ erro: "Rota não encontrada." }));
app.use(express.static(path.join(__dirname, "..", "..", "frontend")));

// Tratamento central de erros: erros de regra (com status) e JSON malformado
app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ erro: err.message });
  if (err.type === "entity.parse.failed") return res.status(400).json({ erro: "JSON inválido." });
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

module.exports = app;
