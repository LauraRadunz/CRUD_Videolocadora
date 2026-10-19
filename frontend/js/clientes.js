const dlgCliente = $("#dlg-cliente");

async function carregarClientes() {
  try {
    const lista = await api.clientes.listar($("#busca-cliente").value);
    $("#tabela-clientes").replaceChildren(
      ...lista.map((c) =>
        el("tr", {},
          el("td", { text: c.nome }),
          el("td", { text: fmtCpf(c.cpf) }),
          el("td", { text: fmtTel(c.telefone) }),
          el("td", { text: c.email || "-" }),
          el("td", { text: String(c.locacoes_abertas) }),
          el("td", { class: "acoes-celula" },
            el("button", { type: "button", "aria-label": `Editar ${c.nome}`, text: "Editar", onclick: () => abrirFormCliente(c) }),
            el("button", { type: "button", class: "perigo", "aria-label": `Excluir ${c.nome}`, text: "Excluir", onclick: () => excluirCliente(c) })))
      )
    );
    $("#vazio-clientes").hidden = lista.length > 0;
  } catch (e) {
    aviso(e.message, "erro");
  }
}

function abrirFormCliente(c = null) {
  $("#t-cliente").textContent = c ? `Editar: ${c.nome}` : "Novo cliente";
  $("#cliente-id").value = c ? c.id : "";
  $("#cliente-nome").value = c ? c.nome : "";
  $("#cliente-cpf").value = c ? mascara("cpf", c.cpf) : "";
  $("#cliente-tel").value = c ? mascara("tel", c.telefone) : "";
  $("#cliente-email").value = c ? c.email || "" : "";
  erroForm(dlgCliente);
  dlgCliente.showModal();
  $("#cliente-nome").focus();
}

$("#form-cliente").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const id = $("#cliente-id").value;
  const dados = {
    nome: $("#cliente-nome").value,
    cpf: $("#cliente-cpf").value,
    telefone: $("#cliente-tel").value,
    email: $("#cliente-email").value,
  };
  try {
    if (id) await api.clientes.atualizar(id, dados);
    else await api.clientes.criar(dados);
    dlgCliente.close();
    aviso(id ? "Cliente atualizado." : "Cliente cadastrado.");
    carregarClientes();
  } catch (e) {
    erroForm(dlgCliente, e.message);
  }
});

async function excluirCliente(c) {
  if (!confirm(`Excluir o cliente "${c.nome}"?`)) return;
  try {
    await api.clientes.excluir(c.id);
    aviso("Cliente excluído.");
    carregarClientes();
  } catch (e) {
    aviso(e.message, "erro");
  }
}

$("#btn-novo-cliente").addEventListener("click", () => abrirFormCliente());
$("#busca-cliente").addEventListener("input", debounce(carregarClientes));
