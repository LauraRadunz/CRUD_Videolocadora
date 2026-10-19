const db = require("../config/database");

const Genero = {
  // "ficção CIENTÍFICA" -> "Ficção científica" (evita gêneros duplicados por diferença de caixa)
  normalizarNome(nome) {
    const t = String(nome ?? "").trim().replace(/\s+/g, " ");
    return t ? t[0].toUpperCase() + t.slice(1).toLowerCase() : "";
  },

  listar: () =>
    db.prepare(
      `SELECT g.id, g.nome, COUNT(fg.filme_id) AS filmes
         FROM generos g LEFT JOIN filme_generos fg ON fg.genero_id = g.id
        GROUP BY g.id ORDER BY g.nome`
    ).all(),

  garantir(nome) {
    db.prepare("INSERT OR IGNORE INTO generos (nome) VALUES (?)").run(nome);
    return db.prepare("SELECT id FROM generos WHERE nome = ?").get(nome).id;
  },

  removerSemFilmes: () =>
    db.prepare("DELETE FROM generos WHERE id NOT IN (SELECT genero_id FROM filme_generos)").run(),
};

module.exports = Genero;
