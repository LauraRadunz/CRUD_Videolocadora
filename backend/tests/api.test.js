// Testes da API com o test runner nativo do Node: npm test
process.env.NODE_ENV = "test";
process.env.DB_PATH = ":memory:";
process.env.SEED = "false";
process.env.ADMIN_USER = "admin";
process.env.ADMIN_PASSWORD = "teste123";
process.env.JWT_SECRET = "segredo-de-teste";
process.env.MULTA_DIA = "2";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");
const Locacao = require("../src/models/locacaoModel");
const { hoje, somarDias } = require("../src/util/datas");

let servidor, base, token;

async function chamar(metodo, caminho, corpo, comToken = true) {
  const r = await fetch(base + caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(comToken && token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await r.text();
  return { status: r.status, corpo: texto ? JSON.parse(texto) : null };
}

const ana = { nome: "Ana Souza", cpf: "529.982.247-25", telefone: "(46) 99111-0001", email: "ana@exemplo.com" };
const bruno = { nome: "Bruno Lima", cpf: "111.444.777-35", telefone: "46991110002" };

before(async () => {
  await new Promise((ok) => { servidor = app.listen(0, ok); });
  base = `http://localhost:${servidor.address().port}`;
  const r = await chamar("POST", "/api/login", { usuario: "admin", senha: "teste123" }, false);
  token = r.corpo.token;
});
after(() => servidor.close());

test("login: senha errada é recusada e rotas protegidas exigem token", async () => {
  assert.equal((await chamar("POST", "/api/login", { usuario: "admin", senha: "x" }, false)).status, 401);
  assert.equal((await chamar("GET", "/api/clientes", null, false)).status, 401);
  assert.equal((await chamar("GET", "/api/locacoes", null, false)).status, 401);
  assert.equal((await chamar("POST", "/api/filmes", { titulo: "X" }, false)).status, 401);
  assert.equal((await chamar("GET", "/api/filmes", null, false)).status, 200); // consulta é pública
});

test("filmes: vários gêneros, busca sem acento, filtro e validação", async () => {
  const novo = await chamar("POST", "/api/filmes", {
    titulo: "Matrix", ano: 1999, classificacao: "14", copias: 2, generos: ["ação", "Ficção CIENTÍFICA"],
  });
  assert.equal(novo.status, 201);
  assert.deepEqual(novo.corpo.generos, ["Ação", "Ficção científica"]);
  assert.equal(novo.corpo.disponiveis, 2);

  await chamar("POST", "/api/filmes", { titulo: "Titanic", ano: 1997, classificacao: "12", copias: 1, generos: "Drama, Romance" });

  assert.equal((await chamar("GET", "/api/filmes?busca=acao")).corpo.length, 1);
  assert.equal((await chamar("GET", "/api/filmes?genero=Romance")).corpo[0].titulo, "Titanic");
  assert.equal((await chamar("GET", "/api/filmes?busca=1997")).corpo.length, 1);
  assert.equal((await chamar("GET", "/api/generos")).corpo.length, 4);

  const ruim = await chamar("POST", "/api/filmes", { titulo: "A", ano: 1500, classificacao: "99", copias: -1, generos: [] });
  assert.equal(ruim.status, 400);
  assert.equal((await chamar("GET", "/api/filmes/abc")).status, 400);
  assert.equal((await chamar("GET", "/api/filmes/999")).status, 404);
});

test("clientes: CPF inválido, duplicado e busca por CPF", async () => {
  assert.equal((await chamar("POST", "/api/clientes", { ...ana, cpf: "111.111.111-11" })).status, 400);
  assert.equal((await chamar("POST", "/api/clientes", { ...ana, telefone: "123" })).status, 400);
  const ok = await chamar("POST", "/api/clientes", ana);
  assert.equal(ok.status, 201);
  assert.equal(ok.corpo.cpf, "52998224725");
  assert.equal((await chamar("POST", "/api/clientes", ana)).status, 409);
  assert.equal((await chamar("GET", "/api/clientes/cpf/529.982.247-25")).corpo.nome, "Ana Souza");
  assert.equal((await chamar("GET", "/api/clientes/cpf/00000000000")).status, 404);
});

test("locação: cadastra cliente na hora, prazo de 7 dias, contagem e devolução", async () => {
  const filmes = (await chamar("GET", "/api/filmes?busca=matrix")).corpo;
  const matrix = filmes[0];

  const loc = await chamar("POST", "/api/locacoes", { filme_id: matrix.id, cliente: bruno });
  assert.equal(loc.status, 201);
  assert.equal(loc.corpo.data_retirada, hoje());
  assert.equal(loc.corpo.data_prevista, somarDias(hoje(), 7));
  assert.equal(loc.corpo.status, "aberta");
  assert.equal(loc.corpo.multa, 0);
  assert.equal((await chamar("GET", `/api/filmes/${matrix.id}`)).corpo.disponiveis, 1);

  // segunda cópia para a Ana; depois acabou o estoque
  assert.equal((await chamar("POST", "/api/locacoes", { filme_id: matrix.id, cliente: ana })).status, 201);
  const esgotado = await chamar("POST", "/api/locacoes", { filme_id: matrix.id, cliente: { ...bruno } });
  assert.equal(esgotado.status, 409);
  assert.equal((await chamar("GET", `/api/filmes/${matrix.id}`)).corpo.disponiveis, 0);

  const dev = await chamar("POST", `/api/locacoes/${loc.corpo.id}/devolucao`);
  assert.equal(dev.status, 200);
  assert.equal(dev.corpo.status, "devolvida");
  assert.equal(dev.corpo.multa, 0);
  assert.equal((await chamar("GET", `/api/filmes/${matrix.id}`)).corpo.disponiveis, 1);
  assert.equal((await chamar("POST", `/api/locacoes/${loc.corpo.id}/devolucao`)).status, 409);
  assert.equal((await chamar("POST", "/api/locacoes/999/devolucao")).status, 404);
});

test("multa: no 7º dia não cobra, a partir do 8º cobra por dia; cliente atrasado não aluga", async () => {
  const titanic = (await chamar("GET", "/api/filmes?busca=titanic")).corpo[0];
  const clientes = (await chamar("GET", "/api/clientes")).corpo;
  const carla = (await chamar("POST", "/api/clientes", { nome: "Carla Mendes", cpf: "39053344705", telefone: "46991110003" })).corpo;
  assert.ok(clientes.length >= 2);

  // retirada há 7 dias: vence hoje, ainda sem multa
  const noLimite = Locacao.alugar({ filmeId: titanic.id, clienteId: carla.id }, somarDias(hoje(), -7));
  assert.equal(noLimite.dias_atraso, 0);
  assert.equal(noLimite.multa, 0);
  assert.equal(noLimite.status, "aberta");
  Locacao.devolver(noLimite.id);

  // retirada há 10 dias: 3 dias de atraso x R$ 2,00
  const atrasada = Locacao.alugar({ filmeId: titanic.id, clienteId: carla.id }, somarDias(hoje(), -10));
  assert.equal(atrasada.dias_atraso, 3);
  assert.equal(atrasada.multa, 6);
  assert.equal(atrasada.status, "atrasada");

  const lista = (await chamar("GET", "/api/locacoes?status=atrasadas")).corpo;
  assert.equal(lista.length, 1);
  assert.equal(lista[0].multa, 6);

  // Carla está em atraso: não pode alugar outro filme
  const outro = (await chamar("POST", "/api/filmes", { titulo: "Ghost", ano: 1990, classificacao: "12", copias: 1, generos: ["Romance"] })).corpo;
  const bloqueio = await chamar("POST", "/api/locacoes", { filme_id: outro.id, cliente_id: carla.id });
  assert.equal(bloqueio.status, 409);
  assert.match(bloqueio.corpo.erro, /atraso/);

  const dev = await chamar("POST", `/api/locacoes/${atrasada.id}/devolucao`);
  assert.equal(dev.corpo.multa, 6);
  assert.equal(dev.corpo.dias_atraso, 3);
  assert.equal((await chamar("GET", "/api/locacoes?status=atrasadas")).corpo.length, 0);

  // liberada, agora pode
  assert.equal((await chamar("POST", "/api/locacoes", { filme_id: outro.id, cliente_id: carla.id })).status, 201);
});

test("exclusões e regras de integridade", async () => {
  const titanic = (await chamar("GET", "/api/filmes?busca=titanic")).corpo[0];
  const ghost = (await chamar("GET", "/api/filmes?busca=ghost")).corpo[0];
  assert.equal((await chamar("DELETE", `/api/filmes/${titanic.id}`)).status, 409); // tem histórico
  assert.equal((await chamar("PUT", `/api/filmes/${ghost.id}`, { ...ghost, copias: 0 })).status, 409); // 1 alugada

  const livre = (await chamar("POST", "/api/filmes", { titulo: "Filme Teste", ano: 2000, classificacao: "L", copias: 1, generos: ["Raro"] })).corpo;
  assert.equal((await chamar("DELETE", `/api/filmes/${livre.id}`)).status, 204);
  assert.equal((await chamar("GET", "/api/generos")).corpo.some((g) => g.nome === "Raro"), false); // gênero órfão some

  const ana2 = (await chamar("GET", "/api/clientes/cpf/52998224725")).corpo;
  assert.equal((await chamar("DELETE", `/api/clientes/${ana2.id}`)).status, 409);
  const sem = (await chamar("POST", "/api/clientes", { nome: "Sem Locação", cpf: "11144477735", telefone: "4633334444" }));
  assert.equal(sem.status, 409); // CPF do Bruno já cadastrado na locação
});
