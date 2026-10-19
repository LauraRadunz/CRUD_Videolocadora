// Leitor simples de .env (sem dependências). Variáveis já definidas no ambiente têm prioridade.
const fs = require("fs");
const path = require("path");

const arquivo = path.join(__dirname, "..", "..", ".env");
if (fs.existsSync(arquivo)) {
  for (const linha of fs.readFileSync(arquivo, "utf8").split(/\r?\n/)) {
    if (linha.trim().startsWith("#")) continue;
    const m = linha.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
