import { describe, expect, it } from "vitest";
import { landFraction, proceduralEarthPixels, proceduralHeight } from "../src/render/proceduralEarth";

describe("procedural Earth placeholder", () => {
  it("is deterministic for a given seed and differs between seeds", () => {
    const a = proceduralEarthPixels(64, 32, 7), b = proceduralEarthPixels(64, 32, 7), c = proceduralEarthPixels(64, 32, 8);
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(Array.from(a)).not.toEqual(Array.from(c));
  });
  it("produces fully opaque RGBA of the requested size", () => {
    const px = proceduralEarthPixels(32, 16);
    expect(px).toHaveLength(32 * 16 * 4);
    for (let k = 3; k < px.length; k += 4) expect(px[k]).toBe(255);
  });
  it("has no seam at the date line (height continuous across lon = ±180°)", () => {
    for (const lat of [-1, -0.3, 0.4, 1]) expect(Math.abs(proceduralHeight(lat, Math.PI - 1e-6) - proceduralHeight(lat, -Math.PI + 1e-6))).toBeLessThan(1e-4);
  });
  it("has a plausible mix of land and ocean (15–60% land by area)", () => {
    const f = landFraction();
    expect(f).toBeGreaterThan(0.15);
    expect(f).toBeLessThan(0.6);
  });
  it("rejects invalid sizes", () => {
    expect(() => proceduralEarthPixels(0, 10)).toThrow();
    expect(() => proceduralEarthPixels(10.5, 10)).toThrow();
  });
});
