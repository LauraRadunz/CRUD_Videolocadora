const router = require("express").Router();
const c = require("../controllers/filmeController");
const { exigirAuth } = require("../middlewares/auth");

// Consulta é pública; alterar o acervo exige login.
router.get("/", c.listar);
router.get("/:id", c.buscar);
router.post("/", exigirAuth, c.criar);
router.put("/:id", exigirAuth, c.atualizar);
router.delete("/:id", exigirAuth, c.excluir);

module.exports = router;
