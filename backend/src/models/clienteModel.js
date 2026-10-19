const db = require("../config/database");
const { erro } = require("../util/erros");
const { normalizar } = require("../util/texto");
const { apenasDigitos, cpfValido, emailValido } = require("../util/validacoes");

const SELECT = `
  SELECT c.*,
         (SELECT COUNT(*) FROM locacoes l WHERE l.cliente_id = c.id AND l.data_devolucao IS NULL) AS locacoes_abertas
    FROM clientes c`;

const Cliente = {
  validar(d = {}) {
    const erros = [];
    const nome = String(d.nome ?? "").trim().replace(/\s+/g, " ");
    const cpf = apenasDigitos(d.cpf);
    const telefone = apenasDigitos(d.telefone);
    const email = String(d.email ?? "").trim();

    if (nome.length < 2 || nome.length > 100) erros.push("Nome deve ter de 2 a 100 caracteres.");
    if (!cpfValido(cpf)) erros.push("CPF inválido.");
    if (telefone.length < 10 || telefone.length > 11) erros.push("Telefone deve ter DDD + número (10 ou 11 dígitos).");
    if (email && !emailValido(email)) erros.push("E-mail inválido.");

    return { erros, dados: { nome, cpf, telefone, email: email || null } };
  },

  listar({ busca = "" } = {}) {
    const clientes = db.prepare(`${SELECT} ORDER BY c.nome COLLATE NOCASE`).all().map((c) => ({ ...c }));
    const b = normalizar(busca);
    const digitos = apenasDigitos(busca);
    if (!b) return clientes;
    return clientes.filter((c) => normalizar(c.nome).includes(b) || (digitos && c.cpf.includes(digitos)));
  },

  buscar: (id) => db.prepare(`${SELECT} WHERE c.id = ?`).get(id) || null,
  buscarPorCpf: (cpf) => db.prepare(`${SELECT} WHERE c.cpf = ?`).get(apenasDigitos(cpf)) || null,

  criar(d) {
    if (Cliente.buscarPorCpf(d.cpf)) throw erro(409, "Já existe cliente com este CPF.");
    const r = db.prepare("INSERT INTO clientes (nome, cpf, telefone, email) VALUES (?, ?, ?, ?)")
      .run(d.nome, d.cpf, d.telefone, d.email);
    return Cliente.buscar(Number(r.lastInsertRowid));
  },

  atualizar(id, d) {
    if (!Cliente.buscar(id)) return null;
    const outro = Cliente.buscarPorCpf(d.cpf);
    if (outro && outro.id !== id) throw erro(409, "Já existe outro cliente com este CPF.");
    db.prepare("UPDATE clientes SET nome = ?, cpf = ?, telefone = ?, email = ? WHERE id = ?")
      .run(d.nome, d.cpf, d.telefone, d.email, id);
    return Cliente.buscar(id);
  },

  // Usado na locação: cliente novo é cadastrado na hora; existente tem os dados atualizados.
  salvarPorCpf(entrada) {
    const { erros, dados } = Cliente.validar(entrada);
    if (erros.length) throw erro(400, erros.join(" "));
    const existente = Cliente.buscarPorCpf(dados.cpf);
    return existente ? Cliente.atualizar(existente.id, dados) : Cliente.criar(dados);
  },

  excluir(id) {
    if (!Cliente.buscar(id)) return false;
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM locacoes WHERE cliente_id = ?").get(id);
    if (n > 0) throw erro(409, "Este cliente tem locações registradas e não pode ser excluído.");
    db.prepare("DELETE FROM clientes WHERE id = ?").run(id);
    return true;
  },
};

module.exports = Cliente;
