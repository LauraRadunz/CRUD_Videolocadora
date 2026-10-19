const dlgFilme = $("#dlg-filme");
const dlgAlugar = $("#dlg-alugar");

async function carregarFilmes() {
  try {
    const filtros = {
      busca: $("#busca-filme").value,
      genero: $("#filtro-genero").value,
      disponiveis: $("#so-disponiveis").checked,
    };
    [estado.filmes, estado.generos] = await Promise.all([api.filmes.listar(filtros), api.generos()]);
    preencherFiltroGenero();
    desenharFilmes();
  } catch (e) {
    aviso(e.message, "erro");
  }
}

function preencherFiltroGenero() {
  const select = $("#filtro-genero");
  const atual = select.value;
  select.replaceChildren(
    el("option", { value: "", text: "Todos" }),
    ...estado.generos.map((g) => el("option", { value: g.nome, text: `${g.nome} (${g.filmes})` }))
  );
  select.value = estado.generos.some((g) => g.nome === atual) ? atual : "";
}

function desenharFilmes() {
  $("#grade-filmes").replaceChildren(...estado.filmes.map(cartaoFilme));
  $("#vazio-filmes").hidden = estado.filmes.length > 0;
  const disp = estado.filmes.reduce((s, f) => s + f.disponiveis, 0);
  $("#contagem-filmes").textContent = `${estado.filmes.length} título(s) na tela, com ${disp} exemplar(es) disponível(is).`;
}

function cartaoFilme(f) {
  const esgotado = f.disponiveis <= 0;
  return el("article", { class: "fita" + (esgotado ? " esgotada" : "") },
    el("header", { class: "fita-topo" }, el("h3", { text: f.titulo })),
    el("div", { class: "fita-corpo" },
      el("p", { class: "meta" },
        el("span", { text: String(f.ano) }),
        el("span", { class: "classif c" + f.classificacao, text: f.classificacao === "L" ? "Livre" : `${f.classificacao} anos` })),
      el("ul", { class: "generos", "aria-label": "Gêneros" }, f.generos.map((g) => el("li", { text: g }))),
      el("p", { class: "estoque" + (esgotado ? " zero" : "") },
        el("strong", { text: String(f.disponiveis) }), ` de ${f.copias} disponíve${f.copias === 1 ? "l" : "is"}`),
      esgotado ? el("p", { class: "carimbo", text: "Todas alugadas" }) : null,
      el("div", { class: "acoes" },
        el("button", { type: "button", class: "primario", disabled: esgotado, "aria-label": `Alugar ${f.titulo}`, text: "Alugar", onclick: () => abrirAlugar(f) }),
        el("button", { type: "button", "aria-label": `Editar ${f.titulo}`, text: "Editar", onclick: () => abrirFormFilme(f) }),
        el("button", { type: "button", class: "perigo", "aria-label": `Excluir ${f.titulo}`, text: "Excluir", onclick: () => excluirFilme(f) }))));
}

/* ---- cadastro / edição ---- */
function abrirFormFilme(f = null) {
  $("#t-filme").textContent = f ? `Editar: ${f.titulo}` : "Novo filme";
  $("#filme-id").value = f ? f.id : "";
  $("#filme-titulo").value = f ? f.titulo : "";
  $("#filme-ano").value = f ? f.ano : "";
  $("#filme-classif").value = f ? f.classificacao : "L";
  $("#filme-copias").value = f ? f.copias : 1;
  $("#filme-novos-generos").value = "";
  const marcados = new Set(f ? f.generos : []);
  $("#lista-generos").replaceChildren(
    ...estado.generos.map((g) =>
      el("label", { class: "chip-marcar" }, el("input", { type: "checkbox", value: g.nome, checked: marcados.has(g.nome) }), g.nome))
  );
  erroForm(dlgFilme);
  dlgFilme.showModal();
  $("#filme-titulo").focus();
}

$("#form-filme").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const id = $("#filme-id").value;
  const extras = $("#filme-novos-generos").value.split(",").map((s) => s.trim()).filter(Boolean);
  const dados = {
    titulo: $("#filme-titulo").value,
    ano: Number($("#filme-ano").value),
    classificacao: $("#filme-classif").value,
    copias: Number($("#filme-copias").value),
    generos: [...$$("#lista-generos input:checked").map((i) => i.value), ...extras],
  };
  try {
    if (id) await api.filmes.atualizar(id, dados);
    else await api.filmes.criar(dados);
    dlgFilme.close();
    aviso(id ? "Filme atualizado." : "Filme cadastrado.");
    await carregarFilmes();
    atualizarResumo();
  } catch (e) {
    erroForm(dlgFilme, e.message);
  }
});

async function excluirFilme(f) {
  if (!confirm(`Excluir "${f.titulo}" do acervo?`)) return;
  try {
    await api.filmes.excluir(f.id);
    aviso("Filme excluído.");
    await carregarFilmes();
    atualizarResumo();
  } catch (e) {
    aviso(e.message, "erro");
  }
}

/* ---- aluguel ---- */
function abrirAlugar(f) {
  $("#form-alugar").reset();
  $("#alugar-filme-id").value = f.id;
  $("#alugar-filme").textContent = `${f.titulo} (${f.disponiveis} disponível(is))`;
  $("#alugar-dica").textContent = "Digite o CPF: se o cliente já existir, os dados são preenchidos sozinhos.";
  erroForm(dlgAlugar);
  dlgAlugar.showModal();
  $("#alugar-cpf").focus();
}

$("#alugar-cpf").addEventListener("input", async (ev) => {
  const cpf = digitos(ev.target.value);
  if (cpf.length !== 11) return;
  try {
    const c = await api.clientes.porCpf(cpf);
    $("#alugar-nome").value = c.nome;
    $("#alugar-tel").value = mascara("tel", c.telefone);
    $("#alugar-email").value = c.email || "";
    $("#alugar-dica").textContent = `Cliente já cadastrado: ${c.nome}. Confira os dados.`;
  } catch {
    $("#alugar-dica").textContent = "Cliente novo: preencha os dados e ele será cadastrado junto com a locação.";
  }
});

$("#form-alugar").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  try {
    const l = await api.locacoes.alugar({
      filme_id: Number($("#alugar-filme-id").value),
      cliente: {
        cpf: $("#alugar-cpf").value,
        nome: $("#alugar-nome").value,
        telefone: $("#alugar-tel").value,
        email: $("#alugar-email").value,
      },
    });
    dlgAlugar.close();
    mostrarRecibo("Locação registrada", [
      ["Filme", l.filme_titulo],
      ["Cliente", l.cliente_nome],
      ["Retirada", fmtData(l.data_retirada)],
      ["Devolver até", fmtData(l.data_prevista)],
    ], `Após ${fmtData(l.data_prevista)} cobramos ${fmtMoeda(l.multa_por_dia)} por dia de atraso.`);
    await carregarFilmes();
    atualizarResumo();
  } catch (e) {
    erroForm(dlgAlugar, e.message);
  }
});

$("#btn-novo-filme").addEventListener("click", () => abrirFormFilme());
$("#busca-filme").addEventListener("input", debounce(carregarFilmes));
$("#filtro-genero").addEventListener("change", carregarFilmes);
$("#so-disponiveis").addEventListener("change", carregarFilmes);
