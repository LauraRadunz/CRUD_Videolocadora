const router = require("express").Router();
const c = require("../controllers/clienteController");

router.get("/", c.listar);
router.get("/cpf/:cpf", c.buscarPorCpf); // antes de "/:id"
router.get("/:id", c.buscar);
router.post("/", c.criar);
router.put("/:id", c.atualizar);
router.delete("/:id", c.excluir);

module.exports = router;
