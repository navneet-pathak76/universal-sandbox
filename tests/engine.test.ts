import { describe, expect, it } from "vitest";
import { G, SUN_MASS, AU, YEAR, EARTH_MASS } from "../src/physics/constants";
import { accelerations, totalEnergy, totalMomentum, stepVelocityVerlet } from "../src/physics/engine";
import { keplerPeriod, getPreset } from "../src/physics/presets";
import type { Body } from "../src/physics/types";

const body = (id: string, mass: number, x: number, y: number, vx=0, vy=0): Body => ({
  id, name:id, mass, radius:1, position:{x,y}, velocity:{x:vx,y:vy}, color:"#fff", trail:[]
});

describe("orbital physics core", () => {
  it("computes an approximate 1 AU Kepler period near one year", () => {
    expect(keplerPeriod(SUN_MASS, AU) / YEAR).toBeCloseTo(1, 2);
  });

  it("produces equal-and-opposite pair forces through mass-weighted accelerations", () => {
    const bodies = [body("a", 2, 0, 0), body("b", 3, 10, 0)];
    const a = accelerations(bodies, {gravitationalConstant:G, softening:0});
    expect(a[0].x * bodies[0].mass + a[1].x * bodies[1].mass).toBeCloseTo(0, 12);
    expect(a[0].y).toBe(0);
  });

  it("does not mutate its input and preserves total momentum closely for an isolated pair", () => {
    const initial = [body("a", 2e20, -10_000, 0, 0, -1), body("b", 2e20, 10_000, 0, 0, 1)];
    const before = JSON.stringify(initial);
    const p0 = totalMomentum(initial);
    let sim = initial;
    for (let i=0; i<100; i++) sim = stepVelocityVerlet(sim, 0.1, {gravitationalConstant:G, softening:1});
    const p1 = totalMomentum(sim);
    expect(JSON.stringify(initial)).toBe(before);
    expect(p1.x).toBeCloseTo(p0.x, 5);
    expect(p1.y).toBeCloseTo(p0.y, 5);
  });

  it("keeps relative energy error bounded for a short two-body run", () => {
    const r = AU;
    const v = Math.sqrt(G * SUN_MASS / r);
    let sim = [body("sun", SUN_MASS, 0, 0), body("planet", EARTH_MASS, r, 0, 0, v)];
    const config = {gravitationalConstant:G, softening:1};
    const e0 = totalEnergy(sim, config);
    for (let i=0; i<2000; i++) sim = stepVelocityVerlet(sim, 1000, config);
    const e1 = totalEnergy(sim, config);
    expect(Math.abs((e1-e0)/e0)).toBeLessThan(1e-4);
  });

  it("loads each documented preset as independent copies", () => {
    const a = getPreset("sun-earth");
    a[0].position.x = 123;
    expect(getPreset("sun-earth")[0].position.x).toBe(0);
    expect(getPreset("inner-system")).toHaveLength(5);
  });

  it("rejects coincident point bodies when no softening is configured", () => {
    expect(() => accelerations([body("a", 1, 0, 0), body("b", 2, 0, 0)], {gravitationalConstant:G, softening:0})).toThrow(/singular/);
  });
});
