import { AU, EARTH_MASS, SUN_MASS, YEAR } from "./constants";
import type { Body } from "./types";
import { cloneBodies } from "./engine";

/**
 * Educational, circular-orbit initial states. These are not epoch-aligned
 * ephemerides and are not intended for precise prediction.
 */
export type Preset = { id: string; label: string; description: string; bodies: Body[] };

const circularSpeed = (centralMass: number, distanceM: number) => Math.sqrt(6.6743e-11 * centralMass / distanceM);

function sunEarth(): Body[] {
  const mEarth = EARTH_MASS;
  const distance = AU;
  const v = circularSpeed(SUN_MASS, distance);
  return [
    { id: "sun", name: "Sun", mass: SUN_MASS, radius: 695_700_000, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, color: "#f6b94c", trail: [] },
    { id: "earth", name: "Earth", mass: mEarth, radius: 6_371_000, position: { x: distance, y: 0 }, velocity: { x: 0, y: v }, color: "#62a8ff", trail: [] },
  ];
}

function innerSystem(): Body[] {
  const base = sunEarth();
  base[1].name = "Earth";
  const bodies: Body[] = [base[0]];
  const planets = [
    {id:"mercury",name:"Mercury",a:0.387,m:0.0553,color:"#b6a18d",radius:2_439_700},
    {id:"venus",name:"Venus",a:0.723,m:0.815,color:"#e7bb77",radius:6_051_800},
    {id:"earth",name:"Earth",a:1,m:1,color:"#62a8ff",radius:6_371_000},
    {id:"mars",name:"Mars",a:1.524,m:0.107,color:"#dc805e",radius:3_389_500},
  ];
  for (const p of planets) {
    const r = p.a * AU;
    bodies.push({
      id:p.id,name:p.name,mass:p.m*EARTH_MASS,radius:p.radius,
      position:{x:r,y:0},velocity:{x:0,y:circularSpeed(SUN_MASS,r)},
      color:p.color,trail:[],
    });
  }
  return bodies;
}

export const PRESETS: Preset[] = [
  { id:"sun-earth", label:"Two-body orbit", description:"Sun and Earth, idealized circular initial state.", bodies:sunEarth() },
  { id:"inner-system", label:"Inner Solar System", description:"Mercury through Mars; approximate coplanar circular starts, not real ephemerides.", bodies:innerSystem() },
  { id:"binary", label:"Binary star", description:"Two equal stars initialized in a mutual circular orbit. Illustrative masses and separation.", bodies:[
    {id:"alpha",name:"Star A",mass:0.8*SUN_MASS,radius:450_000_000,position:{x:-0.25*AU,y:0},velocity:{x:0,y:-14_600},color:"#ffbb78",trail:[]},
    {id:"beta",name:"Star B",mass:0.8*SUN_MASS,radius:450_000_000,position:{x:0.25*AU,y:0},velocity:{x:0,y:14_600},color:"#9cc7ff",trail:[]},
  ]},
];

export function getPreset(id: string): Body[] {
  const preset = PRESETS.find(p => p.id === id);
  if (!preset) throw new Error(`Unknown preset: ${id}`);
  return cloneBodies(preset.bodies);
}

/** Idealized circular period around a dominant point mass, in seconds. */
export function keplerPeriod(centralMassKg: number, semiMajorAxisM: number): number {
  if (!(centralMassKg > 0) || !(semiMajorAxisM > 0)) throw new Error("Mass and orbital radius must be positive.");
  return 2 * Math.PI * Math.sqrt(semiMajorAxisM ** 3 / (6.6743e-11 * centralMassKg));
}
