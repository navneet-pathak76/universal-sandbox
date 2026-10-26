import { G } from "./constants";
import type { Body, PhysicsConfig } from "./types";
export type Vec3={x:number;y:number;z:number};
export type Body3D=Body&{position3:Vec3;velocity3:Vec3;trail3:Vec3[]};
const add=(a:Vec3,b:Vec3):Vec3=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const sub=(a:Vec3,b:Vec3):Vec3=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const mul=(a:Vec3,k:number):Vec3=>({x:a.x*k,y:a.y*k,z:a.z*k});
const finite=(v:Vec3)=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z);
function validate(bs:Body3D[]){const ids=new Set<string>();for(const b of bs){if(!b.id||ids.has(b.id))throw new Error("Body IDs must be unique.");ids.add(b.id);if(!(b.mass>0)||!Number.isFinite(b.mass))throw new Error("Mass must be positive and finite.");if(!finite(b.position3)||!finite(b.velocity3))throw new Error("3D state must be finite.");}}
export function accelerations3D(bs:Body3D[],config:PhysicsConfig={gravitationalConstant:G,softening:1000}):Vec3[]{validate(bs);const out=bs.map(()=>({x:0,y:0,z:0}));const e2=config.softening**2;if(config.gravitationalConstant<0||config.softening<0)throw new Error("Invalid gravity configuration.");for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){const d=sub(bs[j].position3,bs[i].position3),r2=d.x*d.x+d.y*d.y+d.z*d.z+e2;if(r2===0)throw new Error("Coincident bodies with zero softening produce singular acceleration.");const f=config.gravitationalConstant/(r2*Math.sqrt(r2));out[i]=add(out[i],mul(d,f*bs[j].mass));out[j]=add(out[j],mul(d,-f*bs[i].mass));}if(out.some(v=>!finite(v)))throw new Error("Non-finite acceleration; reduce masses or time step.");return out;}
/** 3D velocity-Verlet integration step. Positions, velocities and dt use SI units. */
export function step3D(bs:Body3D[],dt:number,config:PhysicsConfig={gravitationalConstant:G,softening:1000}):Body3D[]{if(!(dt>0)||!Number.isFinite(dt))throw new Error("Time step must be positive and finite.");const a0=accelerations3D(bs,config);const half=bs.map((b,i)=>b.fixed?{...b.velocity3}:add(b.velocity3,mul(a0[i],dt/2)));const moved=bs.map((b,i)=>b.fixed?{...b,position3:{...b.position3},velocity3:{...b.velocity3},trail3:[...b.trail3]}:{...b,position3:add(b.position3,mul(half[i],dt)),velocity3:half[i],trail3:[...b.trail3]});const a1=accelerations3D(moved,config);return moved.map((b,i)=>b.fixed?b:{...b,velocity3:add(half[i],mul(a1[i],dt/2))});}
