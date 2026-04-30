const fs = require('fs');

const localePaths = {
  tr: 'C:/Users/yazilimciemir/Desktop/hair-dresser-new-frontend-main/app/i18n/locales/tr.json',
  en: 'C:/Users/yazilimciemir/Desktop/hair-dresser-new-frontend-main/app/i18n/locales/en.json',
  de: 'C:/Users/yazilimciemir/Desktop/hair-dresser-new-frontend-main/app/i18n/locales/de.json',
  ar: 'C:/Users/yazilimciemir/Desktop/hair-dresser-new-frontend-main/app/i18n/locales/ar.json',
};

function stripBackendPrefix(key) {
  if (!key.startsWith('backend')) return key;
  const rest = key.slice('backend'.length);
  if (!rest) return key;
  return rest[0].toLowerCase() + rest.slice(1);
}

function load(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function save(path, json) {
  fs.writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
}

function main() {
  const tr = load(localePaths.tr);
  const en = load(localePaths.en);
  const de = load(localePaths.de);
  const ar = load(localePaths.ar);

  const localeMap = { tr, en, de, ar };
  const stats = {
    tr: { byKey: 0, byValuePath: 0 },
    en: { byKey: 0, byValuePath: 0 },
    de: { byKey: 0, byValuePath: 0 },
    ar: { byKey: 0, byValuePath: 0 },
  };

  function collectLeafPaths(obj, basePath = '', out = []) {
    if (obj == null || typeof obj !== 'object') return out;
    for (const [k, v] of Object.entries(obj)) {
      const p = basePath ? `${basePath}.${k}` : k;
      if (v && typeof v === 'object') {
        collectLeafPaths(v, p, out);
      } else if (typeof v === 'string') {
        out.push({ path: p, value: v });
      }
    }
    return out;
  }

  function getByPath(obj, dotted) {
    const parts = dotted.split('.');
    let cur = obj;
    for (const part of parts) {
      if (cur == null || typeof cur !== 'object' || !(part in cur)) return undefined;
      cur = cur[part];
    }
    return cur;
  }

  const trLeaves = collectLeafPaths(tr);
  const trValueToPath = new Map();
  for (const x of trLeaves) {
    // Prefer non-backend keys as source path.
    if (!x.path.includes('.backend')) {
      if (!trValueToPath.has(x.value)) trValueToPath.set(x.value, x.path);
    }
  }

  const backendKeys = Object.keys(tr.errors || {}).filter((k) => k.startsWith('backend'));

  for (const lang of Object.keys(localeMap)) {
    const loc = localeMap[lang];
    if (!loc.errors) continue;
    for (const bk of backendKeys) {
      const baseKey = stripBackendPrefix(bk);
      const existingBase = loc.errors[baseKey];
      const current = loc.errors[bk];
      if (existingBase && current !== existingBase) {
        loc.errors[bk] = existingBase;
        stats[lang].byKey += 1;
        continue;
      }

      // Fallback: find a matching TR source text elsewhere in locales, then
      // read the same path from target locale.
      const trText = tr.errors?.[bk];
      if (typeof trText === 'string') {
        const sourcePath = trValueToPath.get(trText);
        if (sourcePath) {
          const translated = getByPath(loc, sourcePath);
          if (typeof translated === 'string' && translated !== current) {
            loc.errors[bk] = translated;
            stats[lang].byValuePath += 1;
          }
        }
      }
    }
  }

  for (const [lang, p] of Object.entries(localePaths)) {
    save(p, localeMap[lang]);
  }

  console.log(`Backend keys: ${backendKeys.length}`);
  console.log(
    `Updated from base translations (by key): tr=${stats.tr.byKey}, en=${stats.en.byKey}, de=${stats.de.byKey}, ar=${stats.ar.byKey}`
  );
  console.log(
    `Updated from base translations (by value/path): tr=${stats.tr.byValuePath}, en=${stats.en.byValuePath}, de=${stats.de.byValuePath}, ar=${stats.ar.byValuePath}`
  );
}

main();
