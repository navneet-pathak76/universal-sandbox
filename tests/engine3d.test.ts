/**
 * Reference tests for the 3D Newtonian engine (src/physics/engine3d.ts).
 *
 * Units: SI (m, kg, s). Unless stated otherwise softening = 0, so the force law
 * is exactly Newtonian point-mass gravity and analytic two-body results apply.
 *
 * Assumptions and tolerances are documented next to each test. The integrator is
 * velocity-Verlet (symplectic, 2nd order): energy error is bounded and scales
 * ~dt^2; linear and angular momentum are conserved to round-off for pairwise
 * central forces with no fixed bodies.
 */
import { describe, expect, it } from "vitest";
import { AU, EARTH_MASS, G, SUN_MASS } from "../src/physics/constants";
import {
  accelerations3D, angularMomentum3D, centerOfMass3D, cloneBodies3D, diagnostics3D, kineticEnergy3D,
  norm3, potentialEnergy3D, relativeEnergyDrift, step3D, totalEnergy3D, totalMomentum3D,
  type Body3D, type Vec3,
} from "../src/physics/engine3d";
import type { PhysicsConfig } from "../src/physics/types";

const EXACT: PhysicsConfig = { gravitationalConstant: G, softening: 0 };

const body3 = (id: string, mass: number, p: Vec3, v: Vec3 = { x: 0, y: 0, z: 0 }, extra: Partial<Body3D> = {}): Body3D => ({
  id, name: id, mass, radius: 1, color: "#fff",
  position: { x: p.x, y: p.z }, velocity: { x: v.x, y: v.z }, trail: [],
  position3: { ...p }, velocity3: { ...v }, trail3: [], ...extra,
});

const dist = (a: Body3D, b: Body3D) => norm3({ x: a.position3.x - b.position3.x, y: a.position3.y - b.position3.y, z: a.position3.z - b.position3.z });

/**
 * Two-body system in its centre-of-mass frame, orbit tilted out of the x-y plane by
 * `incl` radians so every test genuinely exercises all three axes.
 * Body A starts at the periapsis on the +x side of the relative orbit.
 * relative speed at periapsis: v_p = sqrt(G (M+m) (1+e) / (a (1-e)))
 */
function twoBody(M: number, m: number, a: number, e: number, incl = 0.6) {
  const rp = a * (1 - e), mu = G * (M + m);
  const vp = Math.sqrt(mu * (1 + e) / rp);
  const dir: Vec3 = { x: 0, y: Math.cos(incl), z: Math.sin(incl) }; // velocity direction, perpendicular to +x
  const big = body3("big", M, { x: -rp * m / (M + m), y: 0, z: 0 }, { x: 0, y: -dir.y * vp * m / (M + m), z: -dir.z * vp * m / (M + m) });
  const small = body3("small", m, { x: rp * M / (M + m), y: 0, z: 0 }, { x: 0, y: dir.y * vp * M / (M + m), z: dir.z * vp * M / (M + m) });
  const period = 2 * Math.PI * Math.sqrt(a ** 3 / mu);
  return { bodies: [big, small], period, rp, ra: a * (1 + e), expectedEnergy: -G * M * m / (2 * a) };
}

function run(bodies: Body3D[], dt: number, steps: number, config = EXACT, onStep?: (b: Body3D[], i: number) => void) {
  let sim = bodies;
  for (let i = 0; i < steps; i++) { sim = step3D(sim, dt, config); onStep?.(sim, i); }
  return sim;
}

describe("3D diagnostics against analytic values", () => {
  it("total energy of a circular two-body orbit equals -G M m / (2a)", () => {
    const { bodies, expectedEnergy } = twoBody(SUN_MASS, EARTH_MASS, AU, 0);
    // Tolerance 1e-12: only floating-point round-off separates these numbers.
    expect(relativeEnergyDrift(expectedEnergy, totalEnergy3D(bodies, EXACT))).toBeLessThan(1e-12);
  });

  it("centre-of-mass frame has zero momentum and the right angular momentum", () => {
    const { bodies, rp } = twoBody(SUN_MASS, EARTH_MASS, AU, 0.3);
    const p = totalMomentum3D(bodies);
    expect(norm3(p) / (EARTH_MASS * 3e4)).toBeLessThan(1e-12);
    // |L| = mu_red * rp * v_rel,  mu_red = M m / (M+m)
    const mu = G * (SUN_MASS + EARTH_MASS), vp = Math.sqrt(mu * 1.3 / rp);
    const reduced = SUN_MASS * EARTH_MASS / (SUN_MASS + EARTH_MASS);
    expect(Math.abs(norm3(angularMomentum3D(bodies)) / (reduced * rp * vp) - 1)).toBeLessThan(1e-12);
    expect(norm3(centerOfMass3D(bodies)) / AU).toBeLessThan(1e-12);
  });

  it("angular momentum of a unit mass at (1,0,0) moving (0,1,0) is +z", () => {
    const L = angularMomentum3D([body3("a", 1, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })]);
    expect(L).toEqual({ x: 0, y: 0, z: 1 });
  });

  it("diagnostics3D is internally consistent", () => {
    const { bodies } = twoBody(SUN_MASS, EARTH_MASS, AU, 0.2);
    const d = diagnostics3D(bodies, EXACT);
    expect(d.energy).toBe(kineticEnergy3D(bodies) + potentialEnergy3D(bodies, EXACT));
    expect(d.kinetic).toBeGreaterThan(0);
    expect(d.potential).toBeLessThan(0);
    expect(d.momentumMagnitude).toBe(norm3(d.momentum));
  });

  it("softened potential matches the softened force: finite-difference check", () => {
    const eps = 1e6, cfg: PhysicsConfig = { gravitationalConstant: G, softening: eps };
    const mk = (x: number) => [body3("a", 1e24, { x: 0, y: 0, z: 0 }), body3("b", 1e22, { x, y: 3e6, z: -2e6 })];
    const x0 = 5e6, h = 1;
    const dUdx = (potentialEnergy3D(mk(x0 + h), cfg) - potentialEnergy3D(mk(x0 - h), cfg)) / (2 * h);
    const forceOnB = accelerations3D(mk(x0), cfg)[1].x * 1e22;
    // F = -dU/dx; central finite difference, tolerance 1e-6 relative.
    expect(Math.abs((forceOnB + dUdx) / forceOnB)).toBeLessThan(1e-6);
  });
});

describe("two-body orbits", () => {
  it("circular orbit stays circular and closes after one period", () => {
    const { bodies, period } = twoBody(SUN_MASS, EARTH_MASS, AU, 0);
    const n = 2000, dt = period / n;
    let minR = Infinity, maxR = 0;
    const end = run(bodies, dt, n, EXACT, s => { const r = dist(s[0], s[1]); minR = Math.min(minR, r); maxR = Math.max(maxR, r); });
    // Radius stays within 1e-4 of 1 AU; returns to the start within 1e-3 AU (phase error ~dt^2).
    expect(maxR / AU - 1).toBeLessThan(1e-4);
    expect(1 - minR / AU).toBeLessThan(1e-4);
    const back = norm3({ x: end[1].position3.x - bodies[1].position3.x, y: end[1].position3.y - bodies[1].position3.y, z: end[1].position3.z - bodies[1].position3.z });
    expect(back / AU).toBeLessThan(1e-3);
  });

  it("eccentric orbit (e = 0.5) reaches the analytic apoapsis after half a period and conserves L", () => {
    const { bodies, period, ra, rp, expectedEnergy } = twoBody(SUN_MASS, EARTH_MASS, AU, 0.5);
    const n = 4000, dt = period / n;
    const L0 = angularMomentum3D(bodies);
    let maxR = 0, minR = Infinity, maxDrift = 0, maxLdrift = 0;
    const half = run(bodies, dt, n / 2, EXACT, s => {
      const r = dist(s[0], s[1]); maxR = Math.max(maxR, r); minR = Math.min(minR, r);
      maxDrift = Math.max(maxDrift, relativeEnergyDrift(expectedEnergy, totalEnergy3D(s, EXACT)));
      const dL = angularMomentum3D(s); maxLdrift = Math.max(maxLdrift, norm3({ x: dL.x - L0.x, y: dL.y - L0.y, z: dL.z - L0.z }) / norm3(L0));
    });
    expect(Math.abs(dist(half[0], half[1]) / ra - 1)).toBeLessThan(1e-3); // apoapsis
    expect(Math.abs(maxR / ra - 1)).toBeLessThan(1e-3);
    expect(Math.abs(minR / rp - 1)).toBeLessThan(1e-3);
    expect(maxDrift).toBeLessThan(1e-3);   // bounded (not secular) 2nd-order energy error
    expect(maxLdrift).toBeLessThan(1e-9);  // central pairwise forces: L conserved to round-off
  });

  it("test particle with 1.01 v_esc escapes; with 0.99 v_esc it stays bound under the analytic apoapsis", () => {
    const launch = (factor: number) => {
      const vEsc = Math.sqrt(2 * G * SUN_MASS / AU);
      return [body3("sun", SUN_MASS, { x: 0, y: 0, z: 0 }), body3("probe", 1e3, { x: AU, y: 0, z: 0 }, { x: 0, y: 0.8 * factor * vEsc, z: 0.6 * factor * vEsc })];
    };
    const dt = 86_400, steps = 2 * 366;
    // Escape: specific energy > 0 and radius is monotonic increasing from periapsis.
    const esc = launch(1.01);
    const e0 = totalEnergy3D(esc, EXACT);
    expect(e0).toBeGreaterThan(0);
    let prev = dist(esc[0], esc[1]), monotonic = true;
    const escEnd = run(esc, dt, steps, EXACT, s => { const r = dist(s[0], s[1]); if (r < prev) monotonic = false; prev = r; });
    expect(monotonic).toBe(true);
    expect(dist(escEnd[0], escEnd[1])).toBeGreaterThan(8 * AU);
    // Bound: e = 2*0.9801 - 1; r_apo = r0 (1+e)/(1-e). The probe must never exceed it.
    const bound = launch(0.99);
    expect(totalEnergy3D(bound, EXACT)).toBeLessThan(0);
    const ecc = 2 * 0.99 ** 2 - 1, rApo = AU * (1 + ecc) / (1 - ecc);
    let maxR = 0;
    run(bound, dt, steps, EXACT, s => { maxR = Math.max(maxR, dist(s[0], s[1])); });
    expect(maxR).toBeLessThan(rApo * 1.001);
  });
});

describe("conservation, convergence, determinism", () => {
  const threeBody = () => [
    body3("a", 5e24, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }),
    body3("b", 1e24, { x: 7e7, y: 1e7, z: -2e7 }, { x: 100, y: 900, z: -300 }),
    body3("c", 2e23, { x: -3e7, y: 5e7, z: 4e7 }, { x: -400, y: -200, z: 700 }),
  ];

  it("conserves linear momentum to round-off for a softened non-planar 3-body run", () => {
    const cfg: PhysicsConfig = { gravitationalConstant: G, softening: 1e5 };
    const start = threeBody(), scale = start.reduce((s, b) => s + b.mass * norm3(b.velocity3), 0);
    const p0 = totalMomentum3D(start);
    expect(norm3(p0) / scale).toBeGreaterThan(0.1); // genuinely non-zero, so this is not a trivial check
    const end = run(start, 5, 2000, cfg), p1 = totalMomentum3D(end);
    expect(norm3({ x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z }) / scale).toBeLessThan(1e-12);
  });

  it("energy error shrinks ~quadratically with the timestep (2nd-order convergence)", () => {
    const { bodies, period, expectedEnergy } = twoBody(SUN_MASS, EARTH_MASS, AU, 0.5);
    const maxDrift = (n: number) => { let m = 0; run(bodies, period / n, n, EXACT, s => { m = Math.max(m, relativeEnergyDrift(expectedEnergy, totalEnergy3D(s, EXACT))); }); return m; };
    const coarse = maxDrift(1000), fine = maxDrift(2000);
    // Halving dt should cut a 2nd-order error ~4x. Accept 2.5x-6x to allow for the
    // non-asymptotic regime near periapsis.
    expect(coarse / fine).toBeGreaterThan(2.5);
    expect(coarse / fine).toBeLessThan(6);
    expect(fine).toBeLessThan(coarse);
  });

  it("is deterministic: identical initial conditions give bit-identical results", () => {
    const cfg: PhysicsConfig = { gravitationalConstant: G, softening: 1e5 };
    const a = JSON.stringify(run(threeBody(), 10, 500, cfg));
    const b = JSON.stringify(run(threeBody(), 10, 500, cfg));
    expect(a).toBe(b);
  });

  it("does not mutate its input and cloneBodies3D returns an independent deep copy", () => {
    const start = threeBody(), snapshot = JSON.stringify(start);
    step3D(start, 10, { gravitationalConstant: G, softening: 1e5 });
    expect(JSON.stringify(start)).toBe(snapshot);
    const copy = cloneBodies3D(start);
    copy[0].position3.x = 42; copy[0].trail3.push({ x: 1, y: 1, z: 1 });
    expect(JSON.stringify(start)).toBe(snapshot);
  });

  it("fixed bodies stay put while others still feel their gravity", () => {
    const sim = [body3("sun", SUN_MASS, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { fixed: true }), body3("p", 1e3, { x: AU, y: 0, z: 0 })];
    const end = run(sim, 3600, 10, EXACT);
    expect(end[0].position3).toEqual({ x: 0, y: 0, z: 0 });
    expect(end[1].position3.x).toBeLessThan(AU); // pulled toward the Sun
  });
});

describe("safeguards", () => {
  const a = body3("a", 1, { x: 0, y: 0, z: 0 });
  it("rejects coincident bodies when softening is zero, accepts them with softening", () => {
    expect(() => accelerations3D([a, body3("b", 2, { x: 0, y: 0, z: 0 })], EXACT)).toThrow(/singular/);
    const acc = accelerations3D([a, body3("b", 2, { x: 0, y: 0, z: 0 })], { gravitationalConstant: G, softening: 1 });
    expect(acc.every(v => v.x === 0 && v.y === 0 && v.z === 0)).toBe(true);
  });

  it("rejects non-finite or invalid inputs", () => {
    const b = body3("b", 1, { x: 1, y: 0, z: 0 });
    expect(() => accelerations3D([a, body3("b", 1, { x: NaN, y: 0, z: 0 })], EXACT)).toThrow(/finite/);
    expect(() => accelerations3D([a, body3("b", 0, { x: 1, y: 0, z: 0 })], EXACT)).toThrow(/Mass/);
    expect(() => accelerations3D([a, body3("a", 1, { x: 1, y: 0, z: 0 })], EXACT)).toThrow(/unique/);
    for (const g of [-1, NaN, Infinity]) expect(() => accelerations3D([a, b], { gravitationalConstant: g, softening: 0 })).toThrow(/Invalid gravity/);
    for (const s of [-1, NaN, Infinity]) expect(() => accelerations3D([a, b], { gravitationalConstant: G, softening: s })).toThrow(/Invalid gravity/);
    for (const dt of [0, -1, NaN, Infinity]) expect(() => step3D([a, b], dt, EXACT)).toThrow(/Time step/);
  });

  it("throws instead of returning garbage on floating-point underflow/overflow", () => {
    // separation 1e-200 m underflows r^2 to 0 -> treated as singular
    expect(() => accelerations3D([a, body3("b", 1, { x: 1e-200, y: 0, z: 0 })], EXACT)).toThrow(/singular/);
    // huge mass at tiny separation overflows the acceleration -> non-finite guard
    expect(() => accelerations3D([body3("a", 1e308, { x: 0, y: 0, z: 0 }), body3("b", 1e308, { x: 1e-100, y: 0, z: 0 })], EXACT)).toThrow(/Non-finite/);
  });
});
