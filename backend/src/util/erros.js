class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}
const erro = (status, mensagem) => new ErroHttp(status, mensagem);
module.exports = { ErroHttp, erro };
