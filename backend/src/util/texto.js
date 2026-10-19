// Remove acentos e caixa, para buscas como "acao" encontrar "Ação".
exports.normalizar = (s) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
