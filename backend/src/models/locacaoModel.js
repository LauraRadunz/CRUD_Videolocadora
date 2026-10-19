require("../config/env");
const db = require("../config/database");
const Filme = require("./filmeModel");
const Cliente = require("./clienteModel");
const { erro } = require("../util/erros");
const { normalizar } = require("../util/texto");
const { hoje, somarDias, diasEntre } = require("../util/datas");

const PRAZO_DIAS = 7; // a partir do 8º dia começa a multa
const multaDia = () => Number(process.env.MULTA_DIA || 2);
const arredondar = (v) => Math.round(v * 100) / 100;

const SELECT = `
  SELECT l.*, c.nome AS cliente_nome, c.cpf AS cliente_cpf, c.telefone AS cliente_telefone,
         f.titulo AS filme_titulo
    FROM locacoes l
    JOIN clientes c ON c.id = l.cliente_id
    JOIN filmes   f ON f.id = l.filme_id`;

// Acrescenta dias de atraso, multa e status (calculados na hora, a partir das datas)
function enriquecer(l, referencia = hoje()) {
  const fim = l.data_devolucao || referencia;
  const dias_atraso = Math.max(0, diasEntre(l.data_prevista, fim));
  const multa = l.data_devolucao ? l.multa : arredondar(dias_atraso * multaDia());
  const status = l.data_devolucao ? "devolvida" : dias_atraso > 0 ? "atrasada" : "aberta";
  return { ...l, dias_atraso, multa, status, multa_por_dia: multaDia() };
}

const Locacao = {
  PRAZO_DIAS,

  listar({ status = "abertas", busca = "" } = {}) {
    const ordem = `ORDER BY l.data_devolucao IS NOT NULL,
                   CASE WHEN l.data_devolucao IS NULL THEN l.data_prevista END ASC, l.id DESC`;
    let lista = db.prepare(`${SELECT} ${ordem}`).all().map((l) => enriquecer(l));
    if (status === "abertas") lista = lista.filter((l) => l.status !== "devolvida");
    else if (status === "atrasadas") lista = lista.filter((l) => l.status === "atrasada");
    else if (status === "devolvidas") lista = lista.filter((l) => l.status === "devolvida");
    const b = normalizar(busca);
    if (b)
      lista = lista.filter((l) =>
        [l.cliente_nome, l.filme_titulo, l.cliente_cpf].some((t) => normalizar(t).includes(b))
      );
    return lista;
  },

  buscar(id) {
    const l = db.prepare(`${SELECT} WHERE l.id = ?`).get(id);
    return l ? enriquecer(l) : null;
  },

  // dataRetirada só é passada nos testes, para simular locações antigas.
  alugar({ filmeId, clienteId, cliente }, dataRetirada = hoje()) {
    return db.transacao(() => {
      const filme = Filme.buscar(filmeId);
      if (!filme) throw erro(404, "Filme não encontrado.");
      if (filme.disponiveis <= 0) throw erro(409, "Não há exemplares disponíveis deste filme.");

      let cli;
      if (clienteId) {
        cli = Cliente.buscar(Number(clienteId));
        if (!cli) throw erro(404, "Cliente não encontrado.");
      } else {
        cli = Cliente.salvarPorCpf(cliente || {});
      }

      const { n } = db.prepare(
        "SELECT COUNT(*) AS n FROM locacoes WHERE cliente_id = ? AND data_devolucao IS NULL AND data_prevista < ?"
      ).get(cli.id, hoje());
      if (n > 0) throw erro(409, `${cli.nome} tem filme em atraso. Registre a devolução antes de uma nova locação.`);

      const r = db.prepare(
        "INSERT INTO locacoes (cliente_id, filme_id, data_retirada, data_prevista) VALUES (?, ?, ?, ?)"
      ).run(cli.id, filme.id, dataRetirada, somarDias(dataRetirada, PRAZO_DIAS));
      return Locacao.buscar(Number(r.lastInsertRowid));
    });
  },

  devolver(id) {
    return db.transacao(() => {
      const l = Locacao.buscar(id);
      if (!l) return null;
      if (l.data_devolucao) throw erro(409, "Esta locação já foi devolvida.");
      db.prepare("UPDATE locacoes SET data_devolucao = ?, multa = ? WHERE id = ?").run(hoje(), l.multa, id);
      return Locacao.buscar(id);
    });
  },
};

module.exports = Locacao;
