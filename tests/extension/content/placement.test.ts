import { describe, expect, it } from "vitest";
import { Anchor, Point, Size, card_position } from "../../../src/extension/content/placement.ts";

const viewport = new Size({ width: 800, height: 600 });
const card = new Size({ width: 260, height: 140 });

describe("card_position", () => {
  it("opens below the word when there is room", () => {
    expect(card_position(new Anchor({ left: 100, top: 80, bottom: 100 }), card, viewport)).toEqual(new Point({ left: 100, top: 106 }));
  });

  it("flips above the word near the bottom of the screen", () => {
    expect(card_position(new Anchor({ left: 100, top: 540, bottom: 560 }), card, viewport)).toEqual(new Point({ left: 100, top: 394 }));
  });

  it("stays fully on screen when it fits neither above nor below", () => {
    const tall = new Size({ width: 260, height: 500 });
    expect(card_position(new Anchor({ left: 700, top: 300, bottom: 320 }), tall, viewport)).toEqual(new Point({ left: 532, top: 92 }));
  });
});
