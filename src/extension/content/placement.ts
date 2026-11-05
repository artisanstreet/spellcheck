import { Data } from "effect";

export class Anchor extends Data.Class<{ readonly left: number; readonly top: number; readonly bottom: number }> {}

export class Size extends Data.Class<{ readonly width: number; readonly height: number }> {}

export class Point extends Data.Class<{ readonly left: number; readonly top: number }> {}

const gap = 6;
const margin = 8;

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(value, high));

export const card_position = (anchor: Anchor, card: Size, viewport: Size): Point => {
  const below = anchor.bottom + gap;
  const above = anchor.top - gap - card.height;
  const fits_below = below + card.height <= viewport.height - margin;
  const preferred = fits_below || above < margin ? below : above;
  return new Point({
    left: clamp(anchor.left, margin, Math.max(margin, viewport.width - card.width - margin)),
    top: clamp(preferred, margin, Math.max(margin, viewport.height - card.height - margin)),
  });
};
