/**
 * Backend C# kaynaklarında API'ye yansıyabilecek tırnaklı mesajları tarar,
 * app/utils/errorHandler.ts içindeki messageToKeyMap ile karşılaştırır.
 *
 * Kullanım:
 *   node scripts/audit-backend-messages.mjs "C:/path/to/HairDresser-master"
 *
 * veya:
 *   set BACKEND_ROOT=C:/path/to/HairDresser-master && node scripts/audit-backend-messages.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.join(__dirname, "..");
const ERROR_HANDLER = path.join(FRONTEND_ROOT, "app", "utils", "errorHandler.ts");

const BACKEND_ROOT =
  process.env.BACKEND_ROOT ||
  process.argv[2] ||
  path.join(FRONTEND_ROOT, "..", "HairDresser-master");

function walkDir(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name === "bin" || name === "obj" || name === "node_modules") continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkDir(full, acc);
    else if (name.endsWith(".cs")) acc.push(full);
  }
  return acc;
}

function extractMapKeys(ts) {
  const keys = new Set();
  const re = /^\s*'((?:\\'|[^'])*)':\s*'/gm;
  let m;
  while ((m = re.exec(ts)) !== null) {
    keys.add(m[1].replace(/\\'/g, "'"));
  }
  return keys;
}

function collectStringsFromCs(content) {
  const found = new Set();
  const patterns = [
    /new\s+ErrorResult\s*\(\s*"([^"]*)"\s*\)/g,
    /new\s+ErrorDataResult\s*<[^>]+>\s*\(\s*"([^"]*)"\s*\)/g,
    /new\s+ErrorDataResult\s*<[^>]+>\s*\(\s*false\s*,\s*"([^"]*)"\s*\)/g,
    /\.WithMessage\s*\(\s*"([^"]*)"\s*\)/g,
    /message\s*=\s*"([^"]*)"/g,
    /IapVerifyOutcome\.BadRequest\s*\(\s*"([^"]*)"\s*\)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(content)) !== null) {
      const s = m[1].trim();
      if (s.length > 0) found.add(s);
    }
  }
  return found;
}

function main() {
  if (!fs.existsSync(BACKEND_ROOT)) {
    console.error(`Backend klasörü bulunamadı: ${BACKEND_ROOT}`);
    console.error("BACKEND_ROOT ortam değişkeni veya argv[2] ile kök yolu verin.");
    process.exit(1);
  }
  if (!fs.existsSync(ERROR_HANDLER)) {
    console.error(`errorHandler bulunamadı: ${ERROR_HANDLER}`);
    process.exit(1);
  }

  const handlerSrc = fs.readFileSync(ERROR_HANDLER, "utf8");
  const mapKeys = extractMapKeys(handlerSrc);

  const csFiles = walkDir(path.join(BACKEND_ROOT, "Business")).concat(
    walkDir(path.join(BACKEND_ROOT, "Api")),
    walkDir(path.join(BACKEND_ROOT, "Core")),
  );

  const backendStrings = new Set();
  for (const file of csFiles) {
    const txt = fs.readFileSync(file, "utf8");
    for (const s of collectStringsFromCs(txt)) backendStrings.add(s);
  }

  const missing = [...backendStrings].filter((s) => !mapKeys.has(s)).sort();
  const mappedButNotSeen = [...mapKeys].filter((k) => !backendStrings.has(k)).sort();

  const report = {
    backendRoot: BACKEND_ROOT,
    csFilesScanned: csFiles.length,
    uniqueBackendStrings: backendStrings.size,
    mapKeys: mapKeys.size,
    missingFromMapCount: missing.length,
    missingFromMapSample: missing.slice(0, 80),
    note:
      "FluentValidation / controller anonim mesajları dahil. $\" ile birleşik mesajlar ve Bilinen ürün: {id} gibi dinamikler tam yakalanmaz.",
  };

  const outPath = path.join(FRONTEND_ROOT, "scripts", "backend-message-audit-report.json");
  fs.writeFileSync(outPath, JSON.stringify({ ...report, missingFromMapFull: missing }, null, 2), "utf8");

  console.log(JSON.stringify(report, null, 2));
  console.error(`\nTam liste: ${outPath}`);
  console.error(`Map'te olup backend taramasında görülmeyen anahtar sayısı (çoğu Messages.cs veya kaldırılmış metin): ${mappedButNotSeen.length}`);
}

main();
