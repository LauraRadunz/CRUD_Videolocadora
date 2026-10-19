require("./env");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const caminho = process.env.DB_PATH || path.join(__dirname, "..", "..", "locadora.sqlite");
const db = new DatabaseSync(caminho);

db.exec("PRAGMA foreign_keys = ON;");
db.exec(`
  CREATE TABLE IF NOT EXISTS generos (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS filmes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo        TEXT    NOT NULL,
    ano           INTEGER NOT NULL,
    classificacao TEXT    NOT NULL,
    copias        INTEGER NOT NULL DEFAULT 1 CHECK (copias >= 0)
  );

  -- Um filme pode ter vários gêneros e um gênero vários filmes (N:N)
  CREATE TABLE IF NOT EXISTS filme_generos (
    filme_id  INTEGER NOT NULL REFERENCES filmes(id)  ON DELETE CASCADE,
    genero_id INTEGER NOT NULL REFERENCES generos(id) ON DELETE CASCADE,
    PRIMARY KEY (filme_id, genero_id)
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    nome     TEXT NOT NULL,
    cpf      TEXT NOT NULL UNIQUE,
    telefone TEXT NOT NULL,
    email    TEXT
  );

  CREATE TABLE IF NOT EXISTS locacoes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id     INTEGER NOT NULL REFERENCES clientes(id),
    filme_id       INTEGER NOT NULL REFERENCES filmes(id),
    data_retirada  TEXT NOT NULL,
    data_prevista  TEXT NOT NULL,
    data_devolucao TEXT,
    multa          REAL NOT NULL DEFAULT 0
  );
`);

// Executa várias operações como uma só: se algo falhar, nada é gravado.
db.transacao = (fn) => {
  db.exec("BEGIN");
  try {
    const resultado = fn();
    db.exec("COMMIT");
    return resultado;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
};

if (process.env.SEED !== "false" && db.prepare("SELECT COUNT(*) AS n FROM filmes").get().n === 0) {
  require("./seed")(db);
}

module.exports = db;
