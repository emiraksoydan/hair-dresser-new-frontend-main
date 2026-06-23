import fs from 'fs';
import path from 'path';

const files = [
  'app/(screens)/social/create-story.tsx',
  'app/(screens)/social/create-highlight.tsx',
  'app/components/social/SocialDiscoverMasonryGrid.tsx',
  'app/components/social/SocialProfileMediaTabs.tsx',
  'app/(screens)/social/settings.tsx',
  'app/components/social/SocialReelItem.tsx',
  'app/components/social/SocialShareBubble.tsx',
  'app/(screens)/social/edit-profile.tsx',
  'app/components/social/SocialFeedHeader.tsx',
  'app/(screens)/social/post-detail.tsx',
  'app/components/social/SocialReelsAddButton.tsx',
  'app/components/social/SocialFollowListRow.tsx',
  'app/components/social/SocialStoryHighlights.tsx',
  'app/components/social/SocialFeedPostCard.tsx',
  'app/(screens)/social/saved-posts.tsx',
  'app/components/social/SocialTabLayout.tsx',
  'app/components/social/SocialProfileHeaderMenu.tsx',
  'app/(screens)/social/follow-list.tsx',
  'app/(screens)/social/reel-view.tsx',
  'app/(screens)/social/profile-view.tsx',
  'app/components/social/SocialReelsBackButton.tsx',
  'app/(social)/(profile)/index.tsx',
  'app/(social)/(feed)/index.tsx',
  'app/(social)/(reels)/index.tsx',
  'app/(social)/(search)/index.tsx',
];

function hookImportDepth(file) {
  const depth = file.split('/').length - 1;
  return '../'.repeat(depth - 1) + 'hook/useSafeNavigation';
}

for (const file of files) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) {
    console.log('skip missing', file);
    continue;
  }
  let s = fs.readFileSync(p, 'utf8');
  const hookPath = hookImportDepth(file);

  s = s.replace(/import \{ useSafeNavigation \} from ['"][^'"]+['"];\r?\n/g, '');
  s = s.replace(/const \{ goBack \} = useSafeNavigation\(\);\r?\n/g, '');

  if (!s.includes('useRouter') && s.includes('useSafeNavigation()')) {
    console.log('already ok', file);
    continue;
  }
  if (!s.includes('useRouter')) {
    console.log('no useRouter', file);
    continue;
  }

  s = s.replace(/import \{([^}]*)\} from ['"]expo-router['"];/g, (m, inner) => {
    const parts = inner.split(',').map((x) => x.trim()).filter((x) => x && x !== 'useRouter');
    if (parts.length === 0) return '';
    return `import { ${parts.join(', ')} } from 'expo-router';`;
  });

  if (!s.includes('useSafeNavigation')) {
    const firstImport = s.match(/^import .+;\r?\n/m);
    if (firstImport) {
      const idx = s.indexOf(firstImport[0]) + firstImport[0].length;
      s =
        s.slice(0, idx) +
        `import { useSafeNavigation } from '${hookPath}';\n` +
        s.slice(idx);
    }
  }

  s = s.replace(/const router = useRouter\(\);/g, 'const router = useSafeNavigation();');
  fs.writeFileSync(p, s);
  console.log('updated', file);
}
