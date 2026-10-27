/**
 * PROCEDURAL EARTH PLACEHOLDER — not real geography.
 *
 * Deterministic equirectangular RGBA pixels (longitude -180..180 left to right,
 * latitude +90..-90 top to bottom) generated from seeded 3D value noise sampled on
 * the unit sphere (no seam at the date line, no pole pinching in the noise itself).
 * Land/ocean/ice shapes are invented. Used only when no local Earth texture is
 * installed in public/textures/ (see public/textures/README.md).
 */

function hash3(ix: number, iy: number, iz: number, seed: number): number {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(iz | 0, 2147483647) ^ Math.imul(seed | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

function valueNoise(x: number, y: number, z: number, seed: number): number {
  const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
  const fx = smooth(x - x0), fy = smooth(y - y0), fz = smooth(z - z0);
  const c = (dx: number, dy: number, dz: number) => hash3(x0 + dx, y0 + dy, z0 + dz, seed);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), fx), lerp(c(0, 1, 0), c(1, 1, 0), fx), fy),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), fx), lerp(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz,
  );
}

function fbm(x: number, y: number, z: number, seed: number): number {
  let sum = 0, amp = 0.5, freq = 1;
  for (let o = 0; o < 5; o++) { sum += amp * valueNoise(x * freq, y * freq, z * freq, seed + o * 101); amp *= 0.5; freq *= 2.03; }
  return sum; // ~[0, 0.97]
}

/** Height field in ~[0,1] at a latitude/longitude (radians). Sea level is SEA_LEVEL. */
export const SEA_LEVEL = 0.5;
export function proceduralHeight(latRad: number, lonRad: number, seed = 7): number {
  const x = Math.cos(latRad) * Math.cos(lonRad), y = Math.sin(latRad), z = Math.cos(latRad) * Math.sin(lonRad);
  return fbm(x * 2.2 + 11, y * 2.2 + 11, z * 2.2 + 11, seed);
}

export function proceduralEarthPixels(width: number, height: number, seed = 7): Uint8ClampedArray {
  if (!(width > 0 && height > 0) || !Number.isInteger(width) || !Number.isInteger(height)) throw new Error("Texture size must be positive integers.");
  const px = new Uint8ClampedArray(width * height * 4);
  for (let j = 0; j < height; j++) {
    const lat = Math.PI / 2 - ((j + 0.5) / height) * Math.PI;
    for (let i = 0; i < width; i++) {
      const lon = ((i + 0.5) / width) * 2 * Math.PI - Math.PI;
      const h = proceduralHeight(lat, lon, seed);
      let r: number, g: number, b: number;
      if (Math.abs(lat) > 1.25 + (h - 0.5) * 0.15) { r = 235; g = 241; b = 247; }                        // polar ice
      else if (h < SEA_LEVEL) { const d = Math.min(1, (SEA_LEVEL - h) / 0.22); r = 18 - 10 * d; g = 70 - 30 * d; b = 128 - 40 * d; } // ocean
      else { const e = Math.min(1, (h - SEA_LEVEL) / 0.22); r = 74 + 90 * e; g = 118 + 20 * e - 40 * e * e; b = 56 + 50 * e; }          // land
      const k = (j * width + i) * 4;
      px[k] = r; px[k + 1] = g; px[k + 2] = b; px[k + 3] = 255;
    }
  }
  return px;
}

/** Fraction of the sphere (area-weighted) above sea level; used by tests to check the map is plausible. */
export function landFraction(width = 128, height = 64, seed = 7): number {
  let land = 0, total = 0;
  for (let j = 0; j < height; j++) {
    const lat = Math.PI / 2 - ((j + 0.5) / height) * Math.PI, w = Math.cos(lat);
    for (let i = 0; i < width; i++) {
      const lon = ((i + 0.5) / width) * 2 * Math.PI - Math.PI;
      total += w; if (proceduralHeight(lat, lon, seed) >= SEA_LEVEL) land += w;
    }
  }
  return land / total;
}
