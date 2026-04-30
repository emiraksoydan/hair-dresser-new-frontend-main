/**
 * GlobalKeyboardDismisser, touch koordinatlarına bakarak belirli dikdörtgenlere
 * tıklandığında `Keyboard.dismiss` çağırmayı atlar (örn. sohbet metin alanı).
 */

type Rect = { x: number; y: number; w: number; h: number };

const rects = new Map<number, Rect>();
let idSeq = 1;

/** Tolerans: kenarda yanlışlıkla dışa düşmeyi azaltır. */
const PAD = 4;

export function allocKeyboardDismissExclusionId(): number {
  return idSeq++;
}

export function registerKeyboardDismissExclusion(id: number, r: Rect): void {
  if (r.w > 0 && r.h > 0) {
    rects.set(id, r);
  }
}

export function unregisterKeyboardDismissExclusion(id: number): void {
  rects.delete(id);
}

export function isTouchInsideKeyboardDismissExclusion(
  pageX: number,
  pageY: number
): boolean {
  for (const r of rects.values()) {
    if (
      pageX >= r.x - PAD &&
      pageX <= r.x + r.w + PAD &&
      pageY >= r.y - PAD &&
      pageY <= r.y + r.h + PAD
    ) {
      return true;
    }
  }
  return false;
}
