const dlgLogin = $("#dlg-login");
const TELAS = { acervo: carregarFilmes, locacoes: carregarLocacoes, clientes: carregarClientes };

function mostrarAba(nome) {
  for (const t of Object.keys(TELAS)) $(`#tela-${t}`).hidden = t !== nome;
  $$(".abas [data-aba]").forEach((b) => {
    if (b.dataset.aba === nome) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  TELAS[nome]();
}

// Placar do cabeçalho: exemplares disponíveis, locações abertas e atrasadas
async function atualizarResumo() {
  try {
    const [filmes, abertas] = await Promise.all([api.filmes.listar(), api.locacoes.listar("abertas")]);
    $("#n-disp").textContent = filmes.reduce((s, f) => s + f.disponiveis, 0);
    $("#n-abertas").textContent = abertas.length;
    $("#n-atrasadas").textContent = abertas.filter((l) => l.status === "atrasada").length;
  } catch { /* o aviso de erro já aparece nas telas */ }
}

function pedirLogin() {
  $("#form-login").reset();
  erroForm(dlgLogin);
  if (!dlgLogin.open) dlgLogin.showModal();
  $("#login-usuario").focus();
}

function iniciar() {
  const atual = $(".abas [aria-current]");
  mostrarAba(atual ? atual.dataset.aba : "acervo");
  atualizarResumo();
}

$$(".abas [data-aba]").forEach((b) => b.addEventListener("click", () => mostrarAba(b.dataset.aba)));

$("#form-login").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  try {
    await api.entrar($("#login-usuario").value, $("#login-senha").value);
    dlgLogin.close();
    iniciar();
  } catch (e) {
    erroForm(dlgLogin, e.message);
  }
});

dlgLogin.addEventListener("cancel", (ev) => ev.preventDefault()); // login não fecha com Esc

$("#btn-sair").addEventListener("click", () => {
  api.sair();
  pedirLogin();
});
document.addEventListener("sessao-expirada", () => {
  aviso("Sua sessão expirou. Entre novamente.", "erro");
  pedirLogin();
});

if (api.logado()) iniciar();
else pedirLogin();
