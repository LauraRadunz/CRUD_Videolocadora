const Filme = require("../models/filmeModel");
const Genero = require("../models/generoModel");
const { erro } = require("../util/erros");

const exigirId = (req) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw erro(400, "ID inválido.");
  return id;
};

exports.listar = (req, res) => {
  const { busca, genero, disponiveis } = req.query;
  res.status(200).json(Filme.listar({ busca, genero, apenasDisponiveis: ["1", "true"].includes(disponiveis) }));
};

exports.generos = (req, res) => res.status(200).json(Genero.listar());

exports.buscar = (req, res) => {
  const filme = Filme.buscar(exigirId(req));
  if (!filme) throw erro(404, "Filme não encontrado.");
  res.status(200).json(filme);
};

exports.criar = (req, res) => {
  const { erros, dados } = Filme.validar(req.body);
  if (erros.length) throw erro(400, erros.join(" "));
  res.status(201).json(Filme.criar(dados));
};

exports.atualizar = (req, res) => {
  const id = exigirId(req);
  const { erros, dados } = Filme.validar(req.body);
  if (erros.length) throw erro(400, erros.join(" "));
  const filme = Filme.atualizar(id, dados);
  if (!filme) throw erro(404, "Filme não encontrado.");
  res.status(200).json(filme);
};

exports.excluir = (req, res) => {
  if (!Filme.excluir(exigirId(req))) throw erro(404, "Filme não encontrado.");
  res.status(204).end();
};
