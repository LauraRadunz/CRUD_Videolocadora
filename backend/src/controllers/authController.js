const crypto = require("crypto");
const { gerarToken } = require("../middlewares/auth");
const { erro } = require("../util/erros");

const igual = (a, b) => {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

exports.login = (req, res) => {
  const { usuario, senha } = req.body || {};
  const u = process.env.ADMIN_USER || "admin";
  const s = process.env.ADMIN_PASSWORD || "locadora123";
  const usuarioOk = igual(usuario, u);
  const senhaOk = igual(senha, s); // as duas comparações sempre rodam
  if (!(usuarioOk && senhaOk)) throw erro(401, "Usuário ou senha incorretos.");
  res.status(200).json({ token: gerarToken(u), usuario: u });
};
