import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { configBase, lireCleJeton } from "./config.js";
import { creerPool } from "./db.js";

const cleJeton = lireCleJeton(); // arrête le démarrage si la clé est absente ou trop courte
const pool = creerPool(configBase);
const origines = (process.env.ORIGINES ?? "http://localhost:5173").split(",");
const dossierClient = fileURLToPath(new URL("../../client/dist", import.meta.url));
const port = Number(process.env.PORT ?? 3000);

createApp({
  pool,
  cleJeton,
  origines,
  confianceProxy: Number(process.env.TRUST_PROXY ?? 0),
  dossierClient: existsSync(dossierClient) ? dossierClient : undefined, // absent en développement
}).listen(port, () =>
  console.log(`Boutique sur http://localhost:${port}  (API : /api · base « ${configBase.database} » · site : ${existsSync(dossierClient) ? "servi" : "non construit"})`),
);
