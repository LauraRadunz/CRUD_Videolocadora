require("../config/env");
const crypto = require("crypto");
const { erro } = require("../util/erros");

const SEGREDO = process.env.JWT_SECRET || "segredo-de-desenvolvimento";
const VALIDADE_S = 8 * 60 * 60;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const assinatura = (dados) => crypto.createHmac("sha256", SEGREDO).update(dados).digest("base64url");

// Token no formato JWT (HS256), feito só com o módulo crypto do Node.
function gerarToken(usuario) {
  const corpo = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: usuario, exp: Math.floor(Date.now() / 1000) + VALIDADE_S })}`;
  return `${corpo}.${assinatura(corpo)}`;
}

function verificarToken(token) {
  const [h, p, s] = String(token).split(".");
  if (!h || !p || !s) return null;
  const esperado = Buffer.from(assinatura(`${h}.${p}`));
  const recebido = Buffer.from(s);
  if (esperado.length !== recebido.length || !crypto.timingSafeEqual(esperado, recebido)) return null;
  try {
    const dados = JSON.parse(Buffer.from(p, "base64url").toString());
    return dados.exp > Date.now() / 1000 ? dados : null;
  } catch {
    return null;
  }
}

function exigirAuth(req, res, next) {
  const [tipo, token] = String(req.headers.authorization || "").split(" ");
  if (tipo !== "Bearer" || !verificarToken(token)) return next(erro(401, "Faça login para continuar."));
  next();
}

module.exports = { gerarToken, verificarToken, exigirAuth };
