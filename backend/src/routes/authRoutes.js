const router = require("express").Router();
router.post("/", require("../controllers/authController").login);
module.exports = router;
