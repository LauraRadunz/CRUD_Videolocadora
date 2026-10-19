// Funções de apoio e estado compartilhado entre as telas.
const estado = { filmes: [], generos: [] };

const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

// Cria elementos sem usar innerHTML (evita injeção de HTML pelos dados).
function el(tag, props = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k === "checked") e.checked = Boolean(v);
    else if (k === "disabled") e.disabled = Boolean(v);
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
  }
  e.append(...filhos.flat().filter((f) => f !== null && f !== undefined && f !== false));
  return e;
}

const fmtData = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
const fmtMoeda = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const digitos = (s) => String(s || "").replace(/\D/g, "");
const fmtCpf = (s) => digitos(s).replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, "$1.$2.$3-$4");
const fmtTel = (s) => {
  const d = digitos(s);
  return d.length === 11 ? d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3") : d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
};

function mascara(tipo, valor) {
  const d = digitos(valor);
  if (tipo === "cpf") {
    const c = d.slice(0, 11);
    if (c.length > 9) return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}`;
    if (c.length > 6) return `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6)}`;
    if (c.length > 3) return `${c.slice(0, 3)}.${c.slice(3)}`;
    return c;
  }
  const t = d.slice(0, 11);
  if (t.length > 7) return t.length === 11 ? `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}` : `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}`;
  if (t.length > 2) return `(${t.slice(0, 2)}) ${t.slice(2)}`;
  return t;
}
document.addEventListener("input", (ev) => {
  const tipo = ev.target.dataset && ev.target.dataset.mascara;
  if (tipo) ev.target.value = mascara(tipo, ev.target.value);
});

let temporizadorAviso;
function aviso(texto, tipo = "ok") {
  const a = $("#aviso");
  a.textContent = texto;
  a.className = tipo;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { a.textContent = ""; a.className = ""; }, 7000);
}

function erroForm(dialogo, mensagem = "") {
  $(".erro-form", dialogo).textContent = mensagem;
}

function debounce(fn, ms = 250) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// Recibo no estilo "cupom" para locação e devolução
function mostrarRecibo(titulo, linhas, nota = "", alerta = false) {
  $("#t-recibo").textContent = titulo;
  $("#recibo-linhas").replaceChildren(...linhas.flatMap(([rotulo, valor]) => [el("dt", { text: rotulo }), el("dd", { text: valor })]));
  const n = $("#recibo-nota");
  n.textContent = nota;
  n.className = "recibo-nota" + (alerta ? " alerta" : "");
  $("#dlg-recibo").showModal();
}

document.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-fechar]");
  if (b) b.closest("dialog").close();
});
