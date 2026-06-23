import { Dimensions } from 'react-native';
import type { SocialPostDto } from '../../types/social';
import { SocialPostType } from '../../types/social';

export const DISCOVER_GRID_GAP = 0;
export const DISCOVER_COLS = 2;

const SCREEN_W = Dimensions.get('window').width;
export const DISCOVER_COL_WIDTH = SCREEN_W / DISCOVER_COLS;

export function discoverTileHeight(type: SocialPostType, colWidth = DISCOVER_COL_WIDTH): number {
  switch (type) {
    case SocialPostType.Reel:
      return Math.round(colWidth * 1.85);
    case SocialPostType.Video:
      return Math.round(colWidth * 1.35);
    default:
      return colWidth;
  }
}

export type DiscoverMasonryColumnItem = {
  post: SocialPostDto;
  height: number;
  yOffset: number;
};

export function splitDiscoverMasonry(posts: SocialPostDto[]): {
  left: DiscoverMasonryColumnItem[];
  right: DiscoverMasonryColumnItem[];
  contentHeight: number;
} {
  const left: DiscoverMasonryColumnItem[] = [];
  const right: DiscoverMasonryColumnItem[] = [];
  let leftY = 0;
  let rightY = 0;

  for (const post of posts) {
    const height = discoverTileHeight(post.type);
    if (leftY <= rightY) {
      left.push({ post, height, yOffset: leftY });
      leftY += height + DISCOVER_GRID_GAP;
    } else {
      right.push({ post, height, yOffset: rightY });
      rightY += height + DISCOVER_GRID_GAP;
    }
  }

  return {
    left,
    right,
    contentHeight: Math.max(leftY, rightY),
  };
}

export function isDiscoverVideoType(type: SocialPostType): boolean {
  return type === SocialPostType.Video || type === SocialPostType.Reel;
}

export function pickActiveDiscoverPlayId(
  items: DiscoverMasonryColumnItem[],
  scrollY: number,
  viewportHeight: number,
): string | null {
  const focusY = scrollY + viewportHeight * 0.38;
  let bestId: string | null = null;
  let bestDist = Infinity;

  for (const item of items) {
    if (!isDiscoverVideoType(item.post.type)) continue;
    const center = item.yOffset + item.height / 2;
    const dist = Math.abs(center - focusY);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = item.post.id;
    }
  }

  return bestId;
}
