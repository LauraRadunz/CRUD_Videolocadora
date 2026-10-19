const router = require("express").Router();
router.get("/", require("../controllers/filmeController").generos);
module.exports = router;
