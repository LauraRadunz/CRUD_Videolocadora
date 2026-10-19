const Locacao = require("../models/locacaoModel");
const { erro } = require("../util/erros");

const STATUS = ["abertas", "atrasadas", "devolvidas", "todas"];

exports.listar = (req, res) => {
  const status = req.query.status || "abertas";
  if (!STATUS.includes(status)) throw erro(400, `Status deve ser um de: ${STATUS.join(", ")}.`);
  res.status(200).json(Locacao.listar({ status, busca: req.query.busca }));
};

// Corpo: { filme_id, cliente_id } ou { filme_id, cliente: { nome, cpf, telefone, email } }
exports.criar = (req, res) => {
  const { filme_id, cliente_id, cliente } = req.body || {};
  const filmeId = Number(filme_id);
  if (!Number.isInteger(filmeId) || filmeId <= 0) throw erro(400, "Informe o filme.");
  if (!cliente_id && !cliente) throw erro(400, "Informe os dados do cliente.");
  res.status(201).json(Locacao.alugar({ filmeId, clienteId: cliente_id, cliente }));
};

exports.devolver = (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw erro(400, "ID inválido.");
  const l = Locacao.devolver(id);
  if (!l) throw erro(404, "Locação não encontrada.");
  res.status(200).json(l);
};
