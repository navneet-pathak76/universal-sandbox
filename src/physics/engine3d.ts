import { G } from "./constants";
import type { Body, PhysicsConfig } from "./types";
export type Vec3={x:number;y:number;z:number};
export type Body3D=Body&{position3:Vec3;velocity3:Vec3;trail3:Vec3[]};
const add=(a:Vec3,b:Vec3):Vec3=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const sub=(a:Vec3,b:Vec3):Vec3=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const mul=(a:Vec3,k:number):Vec3=>({x:a.x*k,y:a.y*k,z:a.z*k});
const finite=(v:Vec3)=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z);
function validate(bs:Body3D[]){const ids=new Set<string>();for(const b of bs){if(!b.id||ids.has(b.id))throw new Error("Body IDs must be unique.");ids.add(b.id);if(!(b.mass>0)||!Number.isFinite(b.mass))throw new Error("Mass must be positive and finite.");if(!finite(b.position3)||!finite(b.velocity3))throw new Error("3D state must be finite.");}}
export function accelerations3D(bs:Body3D[],config:PhysicsConfig={gravitationalConstant:G,softening:1000}):Vec3[]{validate(bs);const out=bs.map(()=>({x:0,y:0,z:0}));const e2=config.softening**2;if(!(config.gravitationalConstant>=0)||!Number.isFinite(config.gravitationalConstant)||!(config.softening>=0)||!Number.isFinite(config.softening))throw new Error("Invalid gravity configuration.");for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){const d=sub(bs[j].position3,bs[i].position3),r2=d.x*d.x+d.y*d.y+d.z*d.z+e2;if(r2===0)throw new Error("Coincident bodies with zero softening produce singular acceleration.");const f=config.gravitationalConstant/(r2*Math.sqrt(r2));out[i]=add(out[i],mul(d,f*bs[j].mass));out[j]=add(out[j],mul(d,-f*bs[i].mass));}if(out.some(v=>!finite(v)))throw new Error("Non-finite acceleration; reduce masses or time step.");return out;}
/** 3D velocity-Verlet integration step. Positions, velocities and dt use SI units. */
export function step3D(bs:Body3D[],dt:number,config:PhysicsConfig={gravitationalConstant:G,softening:1000}):Body3D[]{if(!(dt>0)||!Number.isFinite(dt))throw new Error("Time step must be positive and finite.");const a0=accelerations3D(bs,config);const half=bs.map((b,i)=>b.fixed?{...b.velocity3}:add(b.velocity3,mul(a0[i],dt/2)));const moved=bs.map((b,i)=>b.fixed?{...b,position3:{...b.position3},velocity3:{...b.velocity3},trail3:[...b.trail3]}:{...b,position3:add(b.position3,mul(half[i],dt)),velocity3:half[i],trail3:[...b.trail3]});const a1=accelerations3D(moved,config);return moved.map((b,i)=>b.fixed?b:{...b,velocity3:add(half[i],mul(a1[i],dt/2))});}

/* ------------------------------------------------------------------ */
/* Conserved-quantity diagnostics (SI units, full 3D state).           */
/* Potential energy uses the same Plummer softening as the force law,  */
/* U = -G m_i m_j / sqrt(r^2 + eps^2), so E is the quantity the        */
/* integrator is actually trying to conserve. Fixed bodies are         */
/* external anchors: they exchange momentum/energy with the outside,   */
/* so conservation checks only apply when no body is fixed.            */
/* ------------------------------------------------------------------ */

export const ZERO3: Vec3 = { x: 0, y: 0, z: 0 };

/** Deep copy of body state, including trails, so callers can never alias engine input. */
export function cloneBodies3D(bs: Body3D[]): Body3D[] {
  return bs.map(b => ({
    ...b,
    position: { ...b.position },
    velocity: { ...b.velocity },
    trail: b.trail.map(p => ({ ...p })),
    position3: { ...b.position3 },
    velocity3: { ...b.velocity3 },
    trail3: b.trail3.map(p => ({ ...p })),
  }));
}

export function kineticEnergy3D(bs: Body3D[]): number {
  return bs.reduce((s, b) => s + 0.5 * b.mass * (b.velocity3.x ** 2 + b.velocity3.y ** 2 + b.velocity3.z ** 2), 0);
}

export function potentialEnergy3D(bs: Body3D[], config: PhysicsConfig = { gravitationalConstant: G, softening: 1000 }): number {
  const e2 = config.softening ** 2;
  let total = 0;
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const d = sub(bs[j].position3, bs[i].position3);
    const r = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z + e2);
    if (r === 0) throw new Error("Coincident bodies with zero softening have singular potential.");
    total -= config.gravitationalConstant * bs[i].mass * bs[j].mass / r;
  }
  return total;
}

export function totalEnergy3D(bs: Body3D[], config: PhysicsConfig = { gravitationalConstant: G, softening: 1000 }): number {
  return kineticEnergy3D(bs) + potentialEnergy3D(bs, config);
}

/** Total linear momentum, kg m/s. */
export function totalMomentum3D(bs: Body3D[]): Vec3 {
  return bs.reduce((p, b) => add(p, mul(b.velocity3, b.mass)), ZERO3);
}

/** Total angular momentum about the coordinate origin, kg m^2/s: L = sum m (r x v). */
export function angularMomentum3D(bs: Body3D[]): Vec3 {
  return bs.reduce((L, b) => {
    const r = b.position3, v = b.velocity3;
    return add(L, mul({ x: r.y * v.z - r.z * v.y, y: r.z * v.x - r.x * v.z, z: r.x * v.y - r.y * v.x }, b.mass));
  }, ZERO3);
}

export function centerOfMass3D(bs: Body3D[]): Vec3 {
  const M = bs.reduce((s, b) => s + b.mass, 0);
  if (!(M > 0)) return { ...ZERO3 };
  return mul(bs.reduce((c, b) => add(c, mul(b.position3, b.mass)), ZERO3), 1 / M);
}

export const norm3 = (v: Vec3) => Math.hypot(v.x, v.y, v.z);

export type Diagnostics3D = {
  kinetic: number; potential: number; energy: number;
  momentum: Vec3; momentumMagnitude: number;
  angularMomentum: Vec3; angularMomentumMagnitude: number;
  centerOfMass: Vec3;
};

/** All conserved-quantity diagnostics for one snapshot. */
export function diagnostics3D(bs: Body3D[], config: PhysicsConfig = { gravitationalConstant: G, softening: 1000 }): Diagnostics3D {
  const kinetic = kineticEnergy3D(bs), potential = potentialEnergy3D(bs, config);
  const momentum = totalMomentum3D(bs), angularMomentum = angularMomentum3D(bs);
  return { kinetic, potential, energy: kinetic + potential, momentum, momentumMagnitude: norm3(momentum), angularMomentum, angularMomentumMagnitude: norm3(angularMomentum), centerOfMass: centerOfMass3D(bs) };
}

/** Relative energy drift |E - E0| / |E0|; returns |E - E0| when E0 is exactly zero. */
export function relativeEnergyDrift(e0: number, e: number): number {
  return e0 === 0 ? Math.abs(e - e0) : Math.abs((e - e0) / e0);
}
