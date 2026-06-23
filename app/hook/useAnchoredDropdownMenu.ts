import { useCallback, useRef, useState } from 'react';
import { Dimensions, View } from 'react-native';

export type AnchoredDropdownPosition = {
  top: number;
  left: number;
};

type Options = {
  menuWidth: number;
  gap?: number;
  padding?: number;
};

/** Anchor ölçülmeden menüyü göstermez — solda flaş / sağa sıçrama olmaz. */
export function useAnchoredDropdownMenu({ menuWidth, gap = 6, padding = 10 }: Options) {
  const anchorRef = useRef<View>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<AnchoredDropdownPosition | null>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    setMenuPos(null);
  }, []);

  const openMenu = useCallback(() => {
    anchorRef.current?.measureInWindow((x, y, w, h) => {
      const sw = Dimensions.get('window').width;
      let left = x + w - menuWidth;
      if (left + menuWidth > sw - padding) left = sw - padding - menuWidth;
      if (left < padding) left = padding;
      setMenuPos({ top: y + h + gap, left });
      setMenuOpen(true);
    });
  }, [gap, menuWidth, padding]);

  const toggleMenu = useCallback(() => {
    if (menuOpen) closeMenu();
    else openMenu();
  }, [menuOpen, closeMenu, openMenu]);

  return {
    anchorRef,
    menuPos,
    menuReady: menuOpen && menuPos !== null,
    closeMenu,
    toggleMenu,
  };
}
