const db = require("../config/database");
const Genero = require("./generoModel");
const { erro } = require("../util/erros");
const { normalizar } = require("../util/texto");

const CLASSIFICACOES = ["L", "10", "12", "14", "16", "18"];

// disponiveis = total de cópias - cópias com locação em aberto
const SELECT = `
  SELECT f.*,
         f.copias - (SELECT COUNT(*) FROM locacoes l
                      WHERE l.filme_id = f.id AND l.data_devolucao IS NULL) AS disponiveis
    FROM filmes f`;

function comGeneros(filmes) {
  const mapa = new Map();
  const linhas = db.prepare(
    "SELECT fg.filme_id, g.nome FROM filme_generos fg JOIN generos g ON g.id = fg.genero_id ORDER BY g.nome"
  ).all();
  for (const r of linhas) {
    if (!mapa.has(r.filme_id)) mapa.set(r.filme_id, []);
    mapa.get(r.filme_id).push(r.nome);
  }
  return filmes.map((f) => ({ ...f, generos: mapa.get(f.id) || [] }));
}

function salvarGeneros(filmeId, nomes) {
  db.prepare("DELETE FROM filme_generos WHERE filme_id = ?").run(filmeId);
  for (const nome of nomes)
    db.prepare("INSERT INTO filme_generos (filme_id, genero_id) VALUES (?, ?)").run(filmeId, Genero.garantir(nome));
  Genero.removerSemFilmes();
}

const Filme = {
  validar(d = {}) {
    const erros = [];
    const titulo = String(d.titulo ?? "").trim();
    const ano = Number(d.ano);
    const copias = Number(d.copias);
    const bruto = Array.isArray(d.generos) ? d.generos : String(d.generos ?? "").split(",");
    const generos = [...new Set(bruto.map(Genero.normalizarNome).filter(Boolean))];

    if (titulo.length < 2 || titulo.length > 100) erros.push("Título deve ter de 2 a 100 caracteres.");
    if (!Number.isInteger(ano) || ano < 1888 || ano > new Date().getFullYear() + 1) erros.push("Ano inválido.");
    if (!CLASSIFICACOES.includes(String(d.classificacao)))
      erros.push(`Classificação deve ser uma de: ${CLASSIFICACOES.join(", ")}.`);
    if (!Number.isInteger(copias) || copias < 0) erros.push("Cópias deve ser um inteiro maior ou igual a zero.");
    if (generos.length < 1) erros.push("Informe ao menos um gênero.");
    if (generos.length > 6) erros.push("Use no máximo 6 gêneros por filme.");
    if (generos.some((g) => g.length < 2 || g.length > 30)) erros.push("Cada gênero deve ter de 2 a 30 caracteres.");

    return { erros, dados: { titulo, ano, classificacao: String(d.classificacao), copias, generos } };
  },

  listar({ busca = "", genero = "", apenasDisponiveis = false } = {}) {
    let filmes = comGeneros(db.prepare(`${SELECT} ORDER BY f.titulo COLLATE NOCASE`).all());
    const b = normalizar(busca);
    if (b)
      filmes = filmes.filter((f) =>
        [f.titulo, String(f.ano), ...f.generos].some((t) => normalizar(t).includes(b))
      );
    if (genero) filmes = filmes.filter((f) => f.generos.some((g) => normalizar(g) === normalizar(genero)));
    if (apenasDisponiveis) filmes = filmes.filter((f) => f.disponiveis > 0);
    return filmes;
  },

  buscar(id) {
    return comGeneros(db.prepare(`${SELECT} WHERE f.id = ?`).all(id))[0] || null;
  },

  criar(d) {
    return db.transacao(() => {
      const r = db.prepare("INSERT INTO filmes (titulo, ano, classificacao, copias) VALUES (?, ?, ?, ?)")
        .run(d.titulo, d.ano, d.classificacao, d.copias);
      const id = Number(r.lastInsertRowid);
      salvarGeneros(id, d.generos);
      return Filme.buscar(id);
    });
  },

  atualizar(id, d) {
    return db.transacao(() => {
      const atual = Filme.buscar(id);
      if (!atual) return null;
      const alugados = atual.copias - atual.disponiveis;
      if (d.copias < alugados)
        throw erro(409, `Há ${alugados} exemplar(es) alugado(s) agora; o total de cópias não pode ser menor que isso.`);
      db.prepare("UPDATE filmes SET titulo = ?, ano = ?, classificacao = ?, copias = ? WHERE id = ?")
        .run(d.titulo, d.ano, d.classificacao, d.copias, id);
      salvarGeneros(id, d.generos);
      return Filme.buscar(id);
    });
  },

  excluir(id) {
    if (!Filme.buscar(id)) return false;
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM locacoes WHERE filme_id = ?").get(id);
    if (n > 0)
      throw erro(409, "Este filme tem locações registradas e não pode ser excluído. Para tirá-lo de circulação, zere as cópias.");
    db.transacao(() => {
      db.prepare("DELETE FROM filmes WHERE id = ?").run(id);
      Genero.removerSemFilmes();
    });
    return true;
  },
};

module.exports = Filme;
