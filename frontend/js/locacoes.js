const ROTULO_STATUS = { aberta: "No prazo", atrasada: "Atrasada", devolvida: "Devolvida" };

async function carregarLocacoes() {
  try {
    const lista = await api.locacoes.listar($("#filtro-status").value, $("#busca-locacao").value);
    $("#tabela-locacoes").replaceChildren(...lista.map(linhaLocacao));
    $("#vazio-locacoes").hidden = lista.length > 0;
    if (lista[0]) $("#valor-multa").textContent = fmtMoeda(lista[0].multa_por_dia);
  } catch (e) {
    aviso(e.message, "erro");
  }
}

function linhaLocacao(l) {
  const atraso = l.dias_atraso > 0;
  return el("tr", { class: l.status === "atrasada" ? "linha-atrasada" : "" },
    el("td", {}, el("strong", { text: l.cliente_nome }), el("br"), el("small", { text: fmtTel(l.cliente_telefone) })),
    el("td", { text: l.filme_titulo }),
    el("td", { text: fmtData(l.data_retirada) }),
    el("td", { text: fmtData(l.data_prevista) }),
    el("td", {},
      el("span", { class: `selo ${l.status}`, text: ROTULO_STATUS[l.status] }),
      l.status === "devolvida" ? el("br") : null,
      l.status === "devolvida" ? el("small", { text: `em ${fmtData(l.data_devolucao)}` }) : null,
      atraso ? el("br") : null,
      atraso ? el("small", { text: `${l.dias_atraso} dia(s) de atraso` }) : null),
    el("td", { class: atraso ? "multa-valor" : "", text: atraso ? fmtMoeda(l.multa) : "-" }),
    el("td", {}, l.status === "devolvida"
      ? "-"
      : el("button", { type: "button", class: "primario", "aria-label": `Devolver ${l.filme_titulo} de ${l.cliente_nome}`, text: "Devolver", onclick: () => devolver(l) })));
}

async function devolver(l) {
  try {
    const d = await api.locacoes.devolver(l.id);
    mostrarRecibo(
      "Devolução registrada",
      [
        ["Filme", d.filme_titulo],
        ["Cliente", d.cliente_nome],
        ["Retirada", fmtData(d.data_retirada)],
        ["Devolvido em", fmtData(d.data_devolucao)],
        ["Dias de atraso", String(d.dias_atraso)],
        ["Multa", fmtMoeda(d.multa)],
      ],
      d.multa > 0
        ? `Cobrar do cliente: ${fmtMoeda(d.multa)} (${d.dias_atraso} dia(s) x ${fmtMoeda(d.multa_por_dia)}).`
        : "Devolvido no prazo. Sem multa!",
      d.multa > 0
    );
    await carregarLocacoes();
    atualizarResumo();
  } catch (e) {
    aviso(e.message, "erro");
  }
}

$("#filtro-status").addEventListener("change", carregarLocacoes);
$("#busca-locacao").addEventListener("input", debounce(carregarLocacoes));
