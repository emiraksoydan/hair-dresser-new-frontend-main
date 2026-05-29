import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const fragPath = path.join(ROOT, "scripts", "generated-errors-locale-fragment.json");
const frag = JSON.parse(fs.readFileSync(fragPath, "utf8"));

for (const lang of ["tr", "en", "de", "ar"]) {
  const fp = path.join(ROOT, "app", "i18n", "locales", `${lang}.json`);
  const locale = JSON.parse(fs.readFileSync(fp, "utf8"));
  if (!locale.errors) throw new Error(`no errors in ${lang}.json`);
  const patch = frag.errors[lang];
  if (!patch) throw new Error(`fragment missing errors.${lang}`);
  Object.assign(locale.errors, patch);
  fs.writeFileSync(fp, JSON.stringify(locale, null, 2) + "\n");
  console.log("merged", lang, Object.keys(patch).length, "keys");
}

const handlerPath = path.join(ROOT, "app", "utils", "errorHandler.ts");
let s = fs.readFileSync(handlerPath, "utf8");
let ins = fs.readFileSync(path.join(ROOT, "scripts", "generated-message-to-key-map.txt"), "utf8").trimEnd();
if (!ins.endsWith(",")) ins += ",";
ins += "\n";
const marker =
  "  'Zaten bir berber dükkanı paneliniz bulunmaktadır.': 'errors.barberStorePanelAlreadyExists',\n};";
const rep =
  "  'Zaten bir berber dükkanı paneliniz bulunmaktadır.': 'errors.barberStorePanelAlreadyExists',\n\n" +
  "  // ============================================================================\n" +
  "  // AUTO: backend literal → i18n (bm* keys). Regenerate: audit + generate scripts.\n" +
  "  // ============================================================================\n" +
  ins +
  "};";
if (!s.includes(marker)) {
  throw new Error("errorHandler.ts: expected marker before messageToKeyMap closing not found");
}
s = s.replace(marker, rep);
fs.writeFileSync(handlerPath, s);
console.log("errorHandler.ts patched");
