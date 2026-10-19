// Única camada que usa fetch. Guarda o token de login enquanto a aba estiver aberta.
const BASE = location.port === "3000" ? "" : "http://localhost:3000";
let token = sessionStorage.getItem("token");

async function requisicao(caminho, { method = "GET", corpo } = {}) {
  const resposta = await fetch(`${BASE}/api${caminho}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => ({}));
  if (resposta.status === 401 && caminho !== "/login") {
    api.sair();
    document.dispatchEvent(new CustomEvent("sessao-expirada"));
  }
  if (!resposta.ok) throw new Error(dados.erro || "Erro ao comunicar com o servidor.");
  return dados;
}

const consulta = (obj) => {
  const q = new URLSearchParams(Object.entries(obj).filter(([, v]) => v !== "" && v != null && v !== false)).toString();
  return q ? `?${q}` : "";
};

const api = {
  logado: () => Boolean(token),
  async entrar(usuario, senha) {
    const r = await requisicao("/login", { method: "POST", corpo: { usuario, senha } });
    token = r.token;
    sessionStorage.setItem("token", token);
  },
  sair() {
    token = null;
    sessionStorage.removeItem("token");
  },
  generos: () => requisicao("/generos"),
  filmes: {
    listar: (f = {}) => requisicao(`/filmes${consulta({ busca: f.busca, genero: f.genero, disponiveis: f.disponiveis ? "1" : "" })}`),
    criar: (d) => requisicao("/filmes", { method: "POST", corpo: d }),
    atualizar: (id, d) => requisicao(`/filmes/${id}`, { method: "PUT", corpo: d }),
    excluir: (id) => requisicao(`/filmes/${id}`, { method: "DELETE" }),
  },
  clientes: {
    listar: (busca = "") => requisicao(`/clientes${consulta({ busca })}`),
    porCpf: (cpf) => requisicao(`/clientes/cpf/${digitos(cpf)}`),
    criar: (d) => requisicao("/clientes", { method: "POST", corpo: d }),
    atualizar: (id, d) => requisicao(`/clientes/${id}`, { method: "PUT", corpo: d }),
    excluir: (id) => requisicao(`/clientes/${id}`, { method: "DELETE" }),
  },
  locacoes: {
    listar: (status = "abertas", busca = "") => requisicao(`/locacoes${consulta({ status, busca })}`),
    alugar: (d) => requisicao("/locacoes", { method: "POST", corpo: d }),
    devolver: (id) => requisicao(`/locacoes/${id}/devolucao`, { method: "POST" }),
  },
};
