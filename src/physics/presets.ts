import { AU, EARTH_MASS, SUN_MASS } from "./constants";
import { G } from "./constants";
import type { Body } from "./types";
import { cloneBodies } from "./engine";

/** Educational, circular-orbit initial states; not epoch-aligned ephemerides. */
export type Preset={id:string;label:string;description:string;bodies:Body[]};
const circularSpeed=(centralMass:number,r:number)=>Math.sqrt(G*centralMass/r);
function sunEarth():Body[]{return[
{id:"sun",name:"Sun",mass:SUN_MASS,radius:695_700_000,position:{x:0,y:0},velocity:{x:0,y:0},color:"#f6b94c",trail:[]},
{id:"earth",name:"Earth",mass:EARTH_MASS,radius:6_371_000,position:{x:AU,y:0},velocity:{x:0,y:circularSpeed(SUN_MASS,AU)},color:"#62a8ff",trail:[]}
];}
function innerSystem():Body[]{
const bodies:Body[]=[sunEarth()[0]];
const ps=[
{id:"mercury",name:"Mercury",a:.387,m:.0553,color:"#b6a18d",radius:2_439_700},
{id:"venus",name:"Venus",a:.723,m:.815,color:"#e7bb77",radius:6_051_800},
{id:"earth",name:"Earth",a:1,m:1,color:"#62a8ff",radius:6_371_000},
{id:"mars",name:"Mars",a:1.524,m:.107,color:"#dc805e",radius:3_389_500}
];
for(const p of ps){const r=p.a*AU;bodies.push({id:p.id,name:p.name,mass:p.m*EARTH_MASS,radius:p.radius,position:{x:r,y:0},velocity:{x:0,y:circularSpeed(SUN_MASS,r)},color:p.color,trail:[]});}
return bodies;
}
export const PRESETS:Preset[]=[
{id:"sun-earth",label:"Two-body orbit",description:"Sun and Earth, idealized circular initial state.",bodies:sunEarth()},
{id:"inner-system",label:"Inner Solar System",description:"Mercury through Mars; approximate coplanar circular starts, not real ephemerides.",bodies:innerSystem()},
{id:"binary",label:"Binary star",description:"Two equal stars with an illustrative mutual orbit.",bodies:[
{id:"alpha",name:"Star A",mass:.8*SUN_MASS,radius:450_000_000,position:{x:-.25*AU,y:0},velocity:{x:0,y:-14_600},color:"#ffbb78",trail:[]},
{id:"beta",name:"Star B",mass:.8*SUN_MASS,radius:450_000_000,position:{x:.25*AU,y:0},velocity:{x:0,y:14_600},color:"#9cc7ff",trail:[]}
]}
];
export function getPreset(id:string):Body[]{const p=PRESETS.find(x=>x.id===id);if(!p)throw new Error(`Unknown preset: ${id}`);return cloneBodies(p.bodies);}
export function keplerPeriod(centralMassKg:number,semiMajorAxisM:number):number{if(!(centralMassKg>0)||!(semiMajorAxisM>0))throw new Error("Mass and orbital radius must be positive.");return 2*Math.PI*Math.sqrt(semiMajorAxisM**3/(G*centralMassKg));}
