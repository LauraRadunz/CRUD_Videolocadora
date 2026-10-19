const router = require("express").Router();
const c = require("../controllers/locacaoController");

router.get("/", c.listar);
router.post("/", c.criar);
router.post("/:id/devolucao", c.devolver);

module.exports = router;
