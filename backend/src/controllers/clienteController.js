const Cliente = require("../models/clienteModel");
const { erro } = require("../util/erros");

const exigirId = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw erro(400, "ID inválido.");
  return id;
};

exports.listar = (req, res) => res.status(200).json(Cliente.listar({ busca: req.query.busca }));

exports.buscarPorCpf = (req, res) => {
  const c = Cliente.buscarPorCpf(req.params.cpf);
  if (!c) throw erro(404, "Cliente não encontrado.");
  res.status(200).json(c);
};

exports.buscar = (req, res) => {
  const c = Cliente.buscar(exigirId(req));
  if (!c) throw erro(404, "Cliente não encontrado.");
  res.status(200).json(c);
};

exports.criar = (req, res) => {
  const { erros, dados } = Cliente.validar(req.body);
  if (erros.length) throw erro(400, erros.join(" "));
  res.status(201).json(Cliente.criar(dados));
};

exports.atualizar = (req, res) => {
  const id = exigirId(req);
  const { erros, dados } = Cliente.validar(req.body);
  if (erros.length) throw erro(400, erros.join(" "));
  const c = Cliente.atualizar(id, dados);
  if (!c) throw erro(404, "Cliente não encontrado.");
  res.status(200).json(c);
};

exports.excluir = (req, res) => {
  if (!Cliente.excluir(exigirId(req))) throw erro(404, "Cliente não encontrado.");
  res.status(204).end();
};
