// Datas no formato AAAA-MM-DD (dia local), sem horário, para o cálculo de prazo e multa.
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const partes = (s) => s.split("-").map(Number);

const hoje = () => iso(new Date());
const somarDias = (data, n) => {
  const [a, m, d] = partes(data);
  return iso(new Date(a, m - 1, d + n));
};
const diasEntre = (inicio, fim) => {
  const u = (s) => { const [a, m, d] = partes(s); return Date.UTC(a, m - 1, d); };
  return Math.round((u(fim) - u(inicio)) / 86400000);
};

module.exports = { hoje, somarDias, diasEntre };
