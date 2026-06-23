import fs from 'fs';
import path from 'path';

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (/\.tsx?$/.test(e.name)) files.push(p);
  }
  return files;
}

const roots = ['app/components/social', 'app/(screens)/social', 'app/(social)'];
let files = [];
for (const r of roots) walk(r, files);

for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const badIdx = lines.findIndex(
    (l, i) => l.trim().startsWith('import { SOCIAL_ACCENT') && i > 0 && lines[i - 1]?.trim() === 'import {',
  );
  if (badIdx < 0) continue;

  const socialLine = lines[badIdx];
  lines.splice(badIdx, 1);

  const closeIdx = lines.findIndex((l) => l.includes("} from 'react-native';"));
  if (closeIdx < 0) {
    console.warn('no close', file);
    continue;
  }
  lines.splice(closeIdx + 1, 0, socialLine);
  fs.writeFileSync(file, lines.join('\n'));
  console.log('fixed', file);
}
