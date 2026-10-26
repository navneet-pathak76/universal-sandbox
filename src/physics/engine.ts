import { G } from "./constants";
import { add, isFiniteVector, scale, sub } from "./vector";
import type { Body, PhysicsConfig, Vector2 } from "./types";


export const DEFAULT_CONFIG: PhysicsConfig = {
  gravitationalConstant: G,
  softening: 1_000, // 1 km numerical guard, deliberately documented/configurable
};

function validateBodies(bodies: Body[]): void {
  const ids = new Set<string>();
  for (const b of bodies) {
    if (!b.id || ids.has(b.id)) throw new Error("Body IDs must be unique and non-empty.");
    ids.add(b.id);
    if (!b.name.trim()) throw new Error(`Body ${b.id} needs a name.`);
    if (!(Number.isFinite(b.mass) && b.mass > 0)) throw new Error(`Body ${b.name} mass must be positive and finite.`);
    if (!(Number.isFinite(b.radius) && b.radius >= 0)) throw new Error(`Body ${b.name} radius must be non-negative and finite.`);
    if (!isFiniteVector(b.position) || !isFiniteVector(b.velocity)) throw new Error(`Body ${b.name} has non-finite state.`);
  }
}

export function cloneBodies(bodies: Body[]): Body[] {
  return bodies.map(b => ({ ...b, position: { ...b.position }, velocity: { ...b.velocity }, trail: b.trail.map(p => ({ ...p })) }));
}

/** Acceleration from pairwise softened Newtonian point-mass gravity. */
export function accelerations(bodies: Body[], config: PhysicsConfig = DEFAULT_CONFIG): Vector2[] {
  if (!(config.gravitationalConstant >= 0) || !Number.isFinite(config.gravitationalConstant)) {
    throw new Error("Gravitational constant must be finite and non-negative.");
  }
  if (!(config.softening >= 0) || !Number.isFinite(config.softening)) {
    throw new Error("Softening length must be finite and non-negative.");
  }
  validateBodies(bodies);
  const result = bodies.map(() => ({ x: 0, y: 0 }));
  const eps2 = config.softening * config.softening;

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const delta = sub(bodies[j].position, bodies[i].position);
      const r2 = delta.x * delta.x + delta.y * delta.y + eps2;
      // If both separation and softening are zero, the point-particle force is singular.
      if (r2 === 0) throw new Error("Coincident bodies with zero softening produce singular acceleration.");
      const invR3 = 1 / (r2 * Math.sqrt(r2));
      const factor = config.gravitationalConstant * invR3;
      result[i] = add(result[i], scale(delta, factor * bodies[j].mass));
      result[j] = add(result[j], scale(delta, -factor * bodies[i].mass));
    }
  }
  if (result.some(a => !isFiniteVector(a))) throw new Error("Non-finite acceleration; reduce masses or change units.");
  return result;
}

/**
 * Velocity-Verlet step, SI units. Fixed bodies are used for reference-frame
 * demonstrations and intentionally exchange momentum with an external anchor.
 */
export function stepVelocityVerlet(bodies: Body[], dtSeconds: number, config: PhysicsConfig = DEFAULT_CONFIG): Body[] {
  if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) throw new Error("Time step must be positive and finite.");
  validateBodies(bodies);
  const startAcc = accelerations(bodies, config);
  const half = bodies.map((b, i) => b.fixed ? { ...b.velocity } : add(b.velocity, scale(startAcc[i], dtSeconds / 2)));
  const moved = bodies.map((b, i) => b.fixed ? { ...b, position: { ...b.position }, velocity: { ...b.velocity }, trail: [...b.trail] } : {
    ...b,
    position: add(b.position, scale(half[i], dtSeconds)),
    velocity: half[i],
    trail: [...b.trail],
  });
  const endAcc = accelerations(moved, config);
  return moved.map((b, i) => b.fixed ? b : ({ ...b, velocity: add(half[i], scale(endAcc[i], dtSeconds / 2)) }));
}

export function kineticEnergy(bodies: Body[]): number {
  return bodies.reduce((sum, b) => sum + 0.5 * b.mass * (b.velocity.x ** 2 + b.velocity.y ** 2), 0);
}

export function potentialEnergy(bodies: Body[], config: PhysicsConfig = DEFAULT_CONFIG): number {
  let total = 0;
  const eps2 = config.softening * config.softening;
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const dx = bodies[j].position.x - bodies[i].position.x;
    const dy = bodies[j].position.y - bodies[i].position.y;
    const r = Math.sqrt(dx * dx + dy * dy + eps2);
    if (r === 0) throw new Error("Coincident bodies with zero softening have singular potential.");
    total -= config.gravitationalConstant * bodies[i].mass * bodies[j].mass / r;
  }
  return total;
}

export function totalEnergy(bodies: Body[], config: PhysicsConfig = DEFAULT_CONFIG): number {
  return kineticEnergy(bodies) + potentialEnergy(bodies, config);
}

export function totalMomentum(bodies: Body[]): Vector2 {
  return bodies.reduce((p, b) => add(p, scale(b.velocity, b.mass)), { x: 0, y: 0 });
}

export function centreOfMass(bodies: Body[]): Vector2 {
  const totalMass = bodies.reduce((s, b) => s + b.mass, 0);
  if (!totalMass) return { x: 0, y: 0 };
  return bodies.reduce((p, b) => add(p, scale(b.position, b.mass / totalMass)), { x: 0, y: 0 });
}
