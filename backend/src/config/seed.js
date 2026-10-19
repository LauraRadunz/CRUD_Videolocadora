// Dados iniciais: filmes, clientes e algumas locações (uma em dia, uma atrasada, uma devolvida).
const { hoje, somarDias } = require("../util/datas");

const FILMES = [
  ["De Volta para o Futuro", 1985, "L", 3, ["Ficção científica", "Aventura", "Comédia"]],
  ["Os Caça-Fantasmas", 1984, "12", 2, ["Comédia", "Fantasia", "Ficção científica"]],
  ["Jurassic Park", 1993, "12", 3, ["Aventura", "Ficção científica"]],
  ["O Exterminador do Futuro 2", 1991, "16", 2, ["Ação", "Ficção científica"]],
  ["Matrix", 1999, "14", 3, ["Ação", "Ficção científica"]],
  ["Titanic", 1997, "12", 2, ["Drama", "Romance"]],
  ["O Poderoso Chefão", 1972, "16", 1, ["Drama", "Crime"]],
  ["Pulp Fiction", 1994, "18", 2, ["Crime", "Drama"]],
  ["O Silêncio dos Inocentes", 1991, "18", 1, ["Suspense", "Crime", "Terror"]],
  ["Um Sonho de Liberdade", 1994, "14", 2, ["Drama"]],
  ["Forrest Gump", 1994, "12", 3, ["Drama", "Comédia", "Romance"]],
  ["O Rei Leão", 1994, "L", 4, ["Animação", "Aventura", "Musical"]],
  ["Toy Story", 1995, "L", 3, ["Animação", "Comédia", "Aventura"]],
  ["Os Goonies", 1985, "10", 2, ["Aventura", "Comédia"]],
  ["Curtindo a Vida Adoidado", 1986, "12", 2, ["Comédia"]],
  ["Alien, o Oitavo Passageiro", 1979, "16", 2, ["Terror", "Ficção científica"]],
  ["O Iluminado", 1980, "16", 1, ["Terror", "Suspense"]],
  ["Indiana Jones e os Caçadores da Arca Perdida", 1981, "12", 2, ["Aventura", "Ação"]],
  ["Star Wars: Uma Nova Esperança", 1977, "10", 3, ["Ficção científica", "Aventura"]],
  ["Tubarão", 1975, "14", 2, ["Suspense", "Aventura"]],
  ["Cidade de Deus", 2002, "18", 2, ["Crime", "Drama"]],
  ["Central do Brasil", 1998, "12", 2, ["Drama"]],
  ["O Auto da Compadecida", 2000, "12", 3, ["Comédia", "Aventura"]],
  ["Clube da Luta", 1999, "18", 2, ["Drama", "Suspense"]],
  ["Ghost: Do Outro Lado da Vida", 1990, "12", 2, ["Romance", "Fantasia", "Drama"]],
];

const CLIENTES = [
  ["Ana Souza", "52998224725", "46991110001", "ana@exemplo.com"],
  ["Bruno Lima", "11144477735", "46991110002", null],
  ["Carla Mendes", "39053344705", "46991110003", "carla@exemplo.com"],
];

module.exports = (db) =>
  db.transacao(() => {
    const generos = new Map();
    const genero = (nome) => {
      if (!generos.has(nome))
        generos.set(nome, Number(db.prepare("INSERT INTO generos (nome) VALUES (?)").run(nome).lastInsertRowid));
      return generos.get(nome);
    };

    for (const [titulo, ano, classif, copias, gs] of FILMES) {
      const id = Number(
        db.prepare("INSERT INTO filmes (titulo, ano, classificacao, copias) VALUES (?, ?, ?, ?)")
          .run(titulo, ano, classif, copias).lastInsertRowid
      );
      for (const g of gs) db.prepare("INSERT INTO filme_generos (filme_id, genero_id) VALUES (?, ?)").run(id, genero(g));
    }

    for (const c of CLIENTES)
      db.prepare("INSERT INTO clientes (nome, cpf, telefone, email) VALUES (?, ?, ?, ?)").run(...c);

    const filmeId = (t) => db.prepare("SELECT id FROM filmes WHERE titulo = ?").get(t).id;
    const locar = (cliente, titulo, diasAtras, devolvidoHa = null) => {
      const retirada = somarDias(hoje(), -diasAtras);
      db.prepare(
        "INSERT INTO locacoes (cliente_id, filme_id, data_retirada, data_prevista, data_devolucao, multa) VALUES (?, ?, ?, ?, ?, 0)"
      ).run(cliente, filmeId(titulo), retirada, somarDias(retirada, 7), devolvidoHa === null ? null : somarDias(hoje(), -devolvidoHa));
    };
    locar(1, "Matrix", 3); // em dia
    locar(2, "Jurassic Park", 10); // 3 dias de atraso
    locar(3, "Titanic", 12, 5); // já devolvida, no prazo
  });
