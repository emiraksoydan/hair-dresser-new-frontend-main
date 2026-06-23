import fs from 'fs';
import path from 'path';

const roots = ['app/components/social', 'app/(screens)/social', 'app/(social)'];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (/\.tsx?$/.test(e.name)) files.push(p);
  }
  return files;
}

const replacements = [
  [/color="#f05e23"/g, 'color={SOCIAL_ACCENT}'],
  [/color='#f05e23'/g, 'color={SOCIAL_ACCENT}'],
  [/tintColor="#f05e23"/g, 'tintColor={SOCIAL_ACCENT}'],
  [/backgroundColor: '#f05e23'/g, 'backgroundColor: SOCIAL_ACCENT'],
  [/borderColor: '#f05e23'/g, 'borderColor: SOCIAL_ACCENT'],
  [/borderBottomColor: '#f05e23'/g, 'borderBottomColor: SOCIAL_ACCENT'],
  [/accent="#f05e23"/g, 'accent={SOCIAL_ACCENT}'],
  [/color: '#f05e23'/g, 'color: SOCIAL_ACCENT'],
  [/color: "#f05e23"/g, 'color: SOCIAL_ACCENT'],
  [/rgba\(240,\s*94,\s*35,/g, 'rgba(250, 204, 21,'],
];

function depthToRoot(file) {
  const rel = path.relative('app', file).replace(/\\/g, '/');
  const depth = rel.split('/').length - 1;
  return '../'.repeat(depth) + 'constants/socialTheme';
}

let files = [];
for (const r of roots) walk(r, files);

for (const file of files) {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('#f05e23') && !c.includes('240,94,35') && !c.includes('240, 94, 35')) continue;

  for (const [re, rep] of replacements) c = c.replace(re, rep);

  c = c.replace(/className=\{`([^`]*?)bg-\[#f05e23\]([^`]*?)`\}/g, (_, a, b) => {
    return `className={\`${a}${b}\`} style={{ backgroundColor: SOCIAL_ACCENT }}`;
  });
  c = c.replace(/className="([^"]*?)bg-\[#f05e23\]([^"]*?)"/g, (_, a, b) => {
    return `className="${a}${b}" style={{ backgroundColor: SOCIAL_ACCENT }}`;
  });

  if (!c.includes('socialTheme')) {
    const imp = `import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '${depthToRoot(file)}';`;
    const lines = c.split('\n');
    let insertAt = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) insertAt = i + 1;
      else if (insertAt > 0 && lines[i].trim() && !lines[i].startsWith('import ')) break;
    }
    lines.splice(insertAt, 0, imp);
    c = lines.join('\n');
  }

  c = c.replace(
    /backgroundColor: SOCIAL_ACCENT,\s*\n\s*borderWidth/g,
    'backgroundColor: SOCIAL_ACCENT,\n                borderWidth',
  );

  // Selected chip / button text on gold → black
  c = c.replace(
    /color: selected \? '#fff'/g,
    'color: selected ? SOCIAL_ACCENT_TEXT',
  );
  c = c.replace(
    /color: selected \? "rgba\(255,255,255,0\.85\)"/g,
    'color: selected ? "rgba(0,0,0,0.65)"',
  );
  c = c.replace(
    /profile\.isFollowing \? colors\.cardBg : SOCIAL_ACCENT,\s*\n\s*borderWidth: 1,\s*\n\s*borderColor: profile\.isFollowing \? colors\.borderColor2 : SOCIAL_ACCENT,\s*\n\s*\}\)\s*\n\s*>\s*\n\s*<Text\s*\n\s*style=\{\{\s*\n\s*color: profile\.isFollowing \? colors\.headerText : '#fff'/g,
    'profile.isFollowing ? colors.cardBg : SOCIAL_ACCENT,\n                      borderWidth: 1,\n                      borderColor: profile.isFollowing ? colors.borderColor2 : SOCIAL_ACCENT,\n                    }}\n                  >\n                    <Text\n                      style={{\n                        color: profile.isFollowing ? colors.headerText : SOCIAL_ACCENT_TEXT',
  );

  fs.writeFileSync(file, c);
  console.log('updated', file);
}
