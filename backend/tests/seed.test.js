// Confere os dados iniciais (filmes com vários gêneros, locação em atraso etc.)
process.env.NODE_ENV = "test";
process.env.DB_PATH = ":memory:";
process.env.MULTA_DIA = "2";
delete process.env.SEED;

const { test } = require("node:test");
const assert = require("node:assert/strict");
const Filme = require("../src/models/filmeModel");
const Locacao = require("../src/models/locacaoModel");

test("seed: 25 filmes, vários gêneros por filme e estoque calculado", () => {
  const filmes = Filme.listar();
  assert.equal(filmes.length, 25);
  assert.ok(filmes.filter((f) => f.generos.length > 1).length >= 15);
  const matrix = filmes.find((f) => f.titulo === "Matrix");
  assert.equal(matrix.copias, 3);
  assert.equal(matrix.disponiveis, 2);
});

test("seed: locação atrasada com multa e uma devolvida", () => {
  const atrasadas = Locacao.listar({ status: "atrasadas" });
  assert.equal(atrasadas.length, 1);
  assert.equal(atrasadas[0].dias_atraso, 3);
  assert.equal(atrasadas[0].multa, 6);
  assert.equal(Locacao.listar({ status: "devolvidas" }).length, 1);
  assert.equal(Locacao.listar({ status: "todas" }).length, 3);
});
