const fs = require('fs');
const path = require('path');

const backendMessagesPath = 'C:/Users/yazilimciemir/source/repos/HairDresser-master/Business/Resources/Messages.cs';
const errorHandlerPath = 'C:/Users/yazilimciemir/Desktop/hair-dresser-new-frontend-main/app/utils/errorHandler.ts';
const localePaths = {
  tr: 'C:/Users/yazilimciemir/Desktop/hair-dresser-new-frontend-main/app/i18n/locales/tr.json',
  en: 'C:/Users/yazilimciemir/Desktop/hair-dresser-new-frontend-main/app/i18n/locales/en.json',
  de: 'C:/Users/yazilimciemir/Desktop/hair-dresser-new-frontend-main/app/i18n/locales/de.json',
  ar: 'C:/Users/yazilimciemir/Desktop/hair-dresser-new-frontend-main/app/i18n/locales/ar.json',
};

function toLowerCamel(name) {
  if (!name) return name;
  return name[0].toLowerCase() + name.slice(1);
}

function parseBackendConstants(content) {
  const re = /public const string (\w+) = "([^"]*)";/g;
  const items = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    items.push({ name: m[1], text: m[2] });
  }
  return items;
}

function parseExistingMappedMessages(errorHandlerContent) {
  const re = /'([^']+)'\s*:\s*'[^']+'/g;
  const mapped = new Set();
  let m;
  while ((m = re.exec(errorHandlerContent)) !== null) {
    mapped.add(m[1]);
  }
  return mapped;
}

function ensureErrorHandlerMappings(errorHandlerContent, missingConstants) {
  if (missingConstants.length === 0) return { content: errorHandlerContent, added: [] };

  const marker = '// ============================================================================\n  // NOTIFICATION MESSAGES';
  const idx = errorHandlerContent.indexOf(marker);
  if (idx === -1) {
    throw new Error('Could not find insertion marker in errorHandler.ts');
  }

  const lines = missingConstants.map((c) => {
    const key = `errors.backend${c.name}`;
    const escaped = c.text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `  '${escaped}': '${key}',`;
  });

  const insertion = `${lines.join('\n')}\n`;
  const nextContent = errorHandlerContent.slice(0, idx) + insertion + errorHandlerContent.slice(idx);
  return { content: nextContent, added: missingConstants };
}

function ensureLocaleKeys(localeJson, constants) {
  if (!localeJson.errors || typeof localeJson.errors !== 'object') {
    localeJson.errors = {};
  }
  const added = [];
  for (const c of constants) {
    const key = `backend${c.name}`;
    if (!Object.prototype.hasOwnProperty.call(localeJson.errors, key)) {
      localeJson.errors[key] = c.text;
      added.push(key);
    }
  }
  return added;
}

function main() {
  const backendContent = fs.readFileSync(backendMessagesPath, 'utf8');
  const errorHandlerContent = fs.readFileSync(errorHandlerPath, 'utf8');

  const constants = parseBackendConstants(backendContent).filter((x) => x.text && x.text.trim().length > 0);
  const existingMapped = parseExistingMappedMessages(errorHandlerContent);
  const missingConstants = constants.filter((c) => !existingMapped.has(c.text));

  const handlerUpdate = ensureErrorHandlerMappings(errorHandlerContent, missingConstants);
  if (handlerUpdate.content !== errorHandlerContent) {
    fs.writeFileSync(errorHandlerPath, handlerUpdate.content, 'utf8');
  }

  const localeAdded = {};
  for (const [lang, p] of Object.entries(localePaths)) {
    const raw = fs.readFileSync(p, 'utf8');
    const json = JSON.parse(raw);
    const added = ensureLocaleKeys(json, missingConstants);
    localeAdded[lang] = added.length;
    fs.writeFileSync(p, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  }

  console.log(`Total backend constants: ${constants.length}`);
  console.log(`Missing mappings added to errorHandler: ${missingConstants.length}`);
  console.log(`Locale keys added: tr=${localeAdded.tr}, en=${localeAdded.en}, de=${localeAdded.de}, ar=${localeAdded.ar}`);
}

main();
