const apenasDigitos = (s) => String(s ?? "").replace(/\D/g, "");

function cpfValido(valor) {
  const c = apenasDigitos(valor);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const digito = (t) => {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(c[i]) * (t + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(9) === Number(c[9]) && digito(10) === Number(c[10]);
}

const emailValido = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

module.exports = { apenasDigitos, cpfValido, emailValido };
