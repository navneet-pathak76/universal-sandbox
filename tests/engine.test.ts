import { describe, expect, it } from "vitest";
import { G, SUN_MASS, AU, YEAR, EARTH_MASS } from "../src/physics/constants";
import { accelerations, totalEnergy, totalMomentum, stepVelocityVerlet } from "../src/physics/engine";
import { keplerPeriod, getPreset } from "../src/physics/presets";
import type { Body } from "../src/physics/types";
const body=(id:string,mass:number,x:number,y:number,vx=0,vy=0):Body=>({id,name:id,mass,radius:1,position:{x,y},velocity:{x:vx,y:vy},color:"#fff",trail:[]});
describe("orbital physics core",()=>{
it("computes an approximate 1 AU Kepler period near a Julian year",()=>expect(keplerPeriod(SUN_MASS,AU)/YEAR).toBeCloseTo(1,2));
it("produces equal-and-opposite pair forces via mass-weighted accelerations",()=>{const bs=[body("a",2,0,0),body("b",3,10,0)],a=accelerations(bs,{gravitationalConstant:G,softening:0});expect(a[0].x*bs[0].mass+a[1].x*bs[1].mass).toBeCloseTo(0,12);expect(a[0].y).toBe(0);});
it("does not mutate inputs and closely preserves isolated-pair momentum",()=>{const initial=[body("a",2e20,-10_000,0,0,-1),body("b",2e20,10_000,0,0,1)],before=JSON.stringify(initial),p0=totalMomentum(initial);let sim=initial;for(let i=0;i<100;i++)sim=stepVelocityVerlet(sim,.1,{gravitationalConstant:G,softening:1});const p1=totalMomentum(sim);expect(JSON.stringify(initial)).toBe(before);expect(p1.x).toBeCloseTo(p0.x,5);expect(p1.y).toBeCloseTo(p0.y,5);});
it("keeps relative energy error bounded for a short two-body run",()=>{const r=AU,v=Math.sqrt(G*SUN_MASS/r);let sim=[body("sun",SUN_MASS,0,0),body("planet",EARTH_MASS,r,0,0,v)];const config={gravitationalConstant:G,softening:1},e0=totalEnergy(sim,config);for(let i=0;i<2000;i++)sim=stepVelocityVerlet(sim,1000,config);const e1=totalEnergy(sim,config);expect(Math.abs((e1-e0)/e0)).toBeLessThan(1e-4);});
it("returns independent copies of documented presets",()=>{const a=getPreset("sun-earth");a[0].position.x=123;expect(getPreset("sun-earth")[0].position.x).toBe(0);expect(getPreset("inner-system")).toHaveLength(5);});
it("rejects coincident point bodies with zero softening",()=>expect(()=>accelerations([body("a",1,0,0),body("b",2,0,0)],{gravitationalConstant:G,softening:0})).toThrow(/singular/));
});
