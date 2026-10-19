require("./src/config/env");
const app = require("./src/app");
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => console.log(`Rebobine Vídeo Locadora em http://localhost:${PORTA}`));
