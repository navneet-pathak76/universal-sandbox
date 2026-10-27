import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { Activity, Atom, CircleHelp, Download, Pause, Play, RotateCcw, Upload, Orbit, Layers3, Gauge } from "lucide-react";
import { AU, EARTH_MASS, G, YEAR } from "./physics/constants";
import { PRESETS, getPreset } from "./physics/presets";
import type { Body, PhysicsConfig } from "./physics/types";
import { diagnostics3D, step3D, type Body3D, type Vec3 } from "./physics/engine3d";
import { proceduralEarthPixels } from "./render/proceduralEarth";

const fmt=(n:number,d=2)=>new Intl.NumberFormat("en-US",{maximumFractionDigits:d}).format(n);
const compact=(n:number)=>!Number.isFinite(n)?"—":Math.abs(n)>=1e24||Math.abs(n)>0&&Math.abs(n)<1e-3?n.toExponential(2):fmt(n);
const scaleSpace=1/AU;
const to3=(b:Body):Body3D=>({...b,position3:{x:b.position.x,y:0,z:b.position.y},velocity3:{x:b.velocity.x,y:0,z:b.velocity.y},trail3:[]});
const uid=()=>`body-${Math.random().toString(36).slice(2,9)}`;
function newBody():Body3D{return{id:uid(),name:"Experimental body",mass:EARTH_MASS*.1,radius:1_000_000,position:{x:0,y:0},velocity:{x:0,y:0},position3:{x:1.5*AU,y:.08*AU,z:.25*AU},velocity3:{x:-3_000,y:1_000,z:18_000},color:"#b49cff",trail:[],trail3:[]};}
function vec(v:Vec3):[number,number,number]{return[v.x*scaleSpace,v.y*scaleSpace,v.z*scaleSpace];}
function radius(b:Body3D){return b.id==="sun"?.105:Math.max(.022,Math.min(.06,.018+Math.log10(Math.max(1,b.mass/EARTH_MASS))*.007));}
/** Earth material. Uses local textures from public/textures/ when installed (see public/textures/README.md); otherwise a labelled PROCEDURAL placeholder — invented geography, not real Earth. No network requests are made. */
function EarthSurface(){
 const material=useRef<THREE.MeshStandardMaterial>(null);
 useEffect(()=>{
  const m=material.current;if(!m)return;
  let cancelled=false;const owned:THREE.Texture[]=[];
  const w=512,h=256,canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext("2d");
  if(ctx){const img=ctx.createImageData(w,h);img.data.set(proceduralEarthPixels(w,h));ctx.putImageData(img,0,0);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;m.map=t;m.needsUpdate=true;owned.push(t);}
  const base=import.meta.env.BASE_URL,loader=new THREE.TextureLoader();
  const tryLoad=(file:string,apply:(t:THREE.Texture)=>void)=>loader.load(base+"textures/"+file,t=>{if(cancelled){t.dispose();return;}apply(t);owned.push(t);m.needsUpdate=true;},undefined,()=>{/* optional file not installed: keep fallback */});
  tryLoad("earth_day.jpg",t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;m.map?.dispose();m.map=t;});
  tryLoad("earth_normal.png",t=>{m.normalMap=t;m.normalScale.set(.55,.55);});
  tryLoad("earth_roughness.png",t=>{m.roughnessMap=t;});
  return()=>{cancelled=true;owned.forEach(t=>t.dispose());};
 },[]);
 return <meshStandardMaterial ref={material} color="#ffffff" roughness={.85}/>;
}
function Planet({body,selected,onSelect,trailOn}:{body:Body3D;selected:boolean;onSelect:()=>void;trailOn:boolean}){
 const mesh=useRef<THREE.Mesh>(null); const r=radius(body);
 useFrame(({clock})=>{if(mesh.current){mesh.current.rotation.y=clock.getElapsedTime()*.16;mesh.current.rotation.x=.12;}});
 const pos=vec(body.position3);
 return <group position={pos}>
  {body.id==="sun"&&<><mesh><sphereGeometry args={[r*4,24,24]}/><meshBasicMaterial color={body.color} transparent opacity={.07}/></mesh><pointLight color={body.color} intensity={2.2} distance={15}/></>}
  {selected&&<mesh><sphereGeometry args={[r*1.8,20,20]}/><meshBasicMaterial color="#b7d0ff" wireframe transparent opacity={.65}/></mesh>}
  <mesh ref={mesh} onClick={e=>{e.stopPropagation();onSelect();}}><sphereGeometry args={[r,64,64]}/>{body.id==="earth"?<EarthSurface/>:<meshStandardMaterial color={body.color} emissive={body.color} emissiveIntensity={body.id==="sun"?.9:.12} roughness={.72} metalness={.05}/>}</mesh>

  {trailOn&&body.trail3.length>1&&<Line points={body.trail3.filter((_,i)=>i%Math.max(1,Math.floor(body.trail3.length/700))===0).map(vec)} color={body.color} transparent opacity={.5} lineWidth={1}/>}
 </group>;
}

function makeDistantGalaxy(seed0:number){
 let seed=seed0+100;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const p:number[]=[];
 for(let i=0;i<850;i++){const r=Math.sqrt(rand())*.8;const a=rand()*Math.PI*2;p.push(Math.cos(a)*r,(rand()-.5)*.08,Math.sin(a)*r);}
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(p,3));return g;
}
function GalaxyField(){
 const geometry=useMemo(()=>{
  const positions:number[]=[],colors:number[]=[];let seed=918273;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<18000;i++){
   const radius=.25+Math.pow(rand(),.62)*5.7;const arm=i%4;
   const angle=arm*Math.PI/2+radius*.92+(rand()-.5)*.75;const thickness=(rand()-.5)*(.10+radius*.09);
   positions.push(Math.cos(angle)*radius,thickness,Math.sin(angle)*radius);
   const t=rand();colors.push(.55+t*.42,.62+t*.34,.8+t*.2);
  }
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));g.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));return g;
 },[]);
 return <group rotation={[.25,.15,-.12]}>
  <points geometry={geometry}><pointsMaterial size={.018} sizeAttenuation vertexColors transparent opacity={.9} depthWrite={false}/></points>
  <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.12,1.25,96]}/><meshBasicMaterial color="#6d8dff" transparent opacity={.045} side={THREE.DoubleSide}/></mesh>
  {Array.from({length:7},(_,i)=><points key={i} position={[Math.sin(i*2.4)*11,Math.cos(i*1.7)*3,Math.cos(i*2.4)*11]} rotation={[i*.4,.2,i*.3]} geometry={makeDistantGalaxy(i)}><pointsMaterial size={.035} color={i%2?"#b6c7ff":"#ffcead"} transparent opacity={.8} sizeAttenuation/></points>)}
 </group>;
}
function BlackHoleScene(){return <group position={[0,0,0]}>
 <mesh><sphereGeometry args={[.45,48,48]}/><meshBasicMaterial color="#000000"/></mesh>
 <mesh rotation={[.18,0,.12]}><torusGeometry args={[.72,.14,12,100]}/><meshBasicMaterial color="#ff8c43" transparent opacity={.8}/></mesh>
 <mesh rotation={[.18,0,.12]}><torusGeometry args={[.98,.035,8,100]}/><meshBasicMaterial color="#f9d9a2" transparent opacity={.52}/></mesh>
 <mesh><sphereGeometry args={[.57,48,48]}/><meshBasicMaterial color="#a5baff" wireframe transparent opacity={.08}/></mesh>
 </group>;}

function Scene({bodies,selectedId,onSelect,running,trailOn,simSpeed,stepSeconds,substeps,config,onTick,view}:{bodies:Body3D[];selectedId:string;onSelect:(id:string)=>void;running:boolean;trailOn:boolean;simSpeed:number;stepSeconds:number;substeps:number;config:PhysicsConfig;onTick:(b:Body3D[],dt:number)=>void;view:"system"|"cosmos"}){
 const acc=useRef(0); const last=useRef(0);
 useFrame((state,delta)=>{if(!running)return;acc.current+=Math.min(delta,.05)*simSpeed;const step=stepSeconds;let n=Math.min(10,Math.floor(acc.current/Math.max(step/86400,.001)));if(n<1)n=1;acc.current=0;let next=bodies;try{for(let i=0;i<substeps;i++)next=step3D(next,step,config);if(n>1)for(let j=1;j<Math.min(n,4);j++)for(let i=0;i<substeps;i++)next=step3D(next,step,config);}catch(e){console.error(e);return;}onTick(next,step*substeps*Math.min(n,4));last.current=state.clock.elapsedTime;});
 return <><color attach="background" args={[view==="cosmos"?"#01020a":"#030712"]}/>{view==="system"?<fog attach="fog" args={["#030712",22,90]}/>:null}<ambientLight intensity={view==="cosmos"?.08:.32}/><Stars radius={view==="cosmos"?180:100} depth={view==="cosmos"?110:65} count={view==="cosmos"?9000:4500} factor={4} saturation={.22} fade speed={.18}/>{view==="system"?<><gridHelper args={[40,40,"#1a3150","#0c1a2d"]} position={[0,-.12,0]}/><axesHelper args={[1.2]}/>{bodies.map(b=><Planet key={b.id} body={b} selected={b.id===selectedId} onSelect={()=>onSelect(b.id)} trailOn={trailOn}/>)}</>:<><GalaxyField/><BlackHoleScene/></>}<OrbitControls makeDefault enableDamping dampingFactor={.06} minDistance={.3} maxDistance={250} rotateSpeed={.65} zoomSpeed={.8}/></>;
}
export default function App(){
 const [view,setView]=useState<"system"|"cosmos">("cosmos");
 const [presetId,setPresetId]=useState("inner-system");
 const [bodies,setBodies]=useState<Body3D[]>(()=>getPreset("inner-system").map(to3));
 const [selectedId,setSelectedId]=useState("earth");
 const [running,setRunning]=useState(false);const [speed,setSpeed]=useState(1);const [dt,setDt]=useState(1800);const [substeps,setSubsteps]=useState(2);
 const [trailOn,setTrailOn]=useState(true);const [softeningKm,setSofteningKm]=useState(1);const [gValue,setGValue]=useState(G);const [simTime,setSimTime]=useState(0);const [notice,setNotice]=useState("Drag to orbit · scroll to zoom · click a body to inspect");const [showHelp,setShowHelp]=useState(false);
 const selected=bodies.find(b=>b.id===selectedId)??bodies[0];const config=useMemo(()=>({gravitationalConstant:gValue,softening:softeningKm*1000}),[gValue,softeningKm]);
 const diag=useMemo(()=>{try{return diagnostics3D(bodies,config);}catch{return null;}},[bodies,config]);const anyFixed=bodies.some(b=>b.fixed);
 function loadPreset(id:string){const next=getPreset(id).map(to3);setPresetId(id);setBodies(next);setSelectedId(next.find(b=>b.id==="earth")?.id??next[0].id);setRunning(false);setSimTime(0);setNotice("Preset loaded. Initial conditions are illustrative, not epoch-matched ephemerides.");}
 function tick(next:Body3D[],elapsed:number){setBodies(next.map(b=>({...b,trail3:trailOn?[...b.trail3,b.position3].slice(-900):[]})));setSimTime(t=>t+elapsed);}
 function patch(p:Partial<Body3D>){setBodies(old=>old.map(b=>b.id===selectedId?{...b,...p}:b));setNotice("Edited body state: experimental initial conditions.");}
 function exportJson(){const data={schemaVersion:2,model:"3D Newtonian N-body",gravitationalConstant:gValue,softeningM:config.softening,timeStepSeconds:dt,substeps,simulationTimeSeconds:simTime,bodies:bodies.map(({trail,trail3,...b})=>b),provenance:"Built-in preset states are illustrative; not ephemeris-grade."};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download="universal-sandbox-3d.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
 function importJson(file?:File){if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(String(reader.result));if(!Array.isArray(data.bodies)||!data.bodies.length||data.bodies.length>500)throw new Error("Expected 1–500 bodies");const next:Body3D[]=data.bodies.map((b:any,i:number)=>({id:String(b.id??`import-${i}`),name:String(b.name??`Body ${i+1}`),mass:Number(b.mass),radius:Number(b.radius??1),position:{x:Number(b.position?.x??0),y:Number(b.position?.y??0)},velocity:{x:Number(b.velocity?.x??0),y:Number(b.velocity?.y??0)},position3:{x:Number(b.position3?.x??b.position?.x??0),y:Number(b.position3?.y??0),z:Number(b.position3?.z??b.position?.y??0)},velocity3:{x:Number(b.velocity3?.x??b.velocity?.x??0),y:Number(b.velocity3?.y??0),z:Number(b.velocity3?.z??b.velocity?.y??0)},color:String(b.color??"#9bbcff"),trail:[],trail3:[]}));if(next.some(b=>!(b.mass>0)||![b.mass,b.position3.x,b.position3.y,b.position3.z,b.velocity3.x,b.velocity3.y,b.velocity3.z].every(Number.isFinite)))throw new Error("Invalid body values");setBodies(next);setSelectedId(next[0].id);setRunning(false);setSimTime(0);setNotice("Imported 3D experiment. Confirm SI units before running.");}catch(e){setNotice(e instanceof Error?e.message:"Import failed");}};reader.readAsText(file);}
 return <main className="universe-app">
 <header className="u-topbar"><div className="u-brand"><div className="u-logo"><Atom size={22}/></div><div><b>UNIVERSAL <span>SANDBOX</span></b><small>3D UNIVERSE LAB / LOCAL BUILD</small></div></div><div className="u-topright"><span className="u-live"><i/> LIVE PHYSICS ENGINE</span><button className="u-icon" onClick={()=>setShowHelp(v=>!v)} title="Physics notes"><CircleHelp size={17}/></button></div></header>
 <section className="u-hero"><div><div className="u-kicker">{view==="cosmos"?"COSMIC STRUCTURE / PROCEDURAL MODE":"SPACETIME IS NOT A FLAT SCREEN"}</div><h1>Step inside<br/><em>the universe.</em></h1><p>{view==="cosmos"?"Explore a generated deep-space scene with spiral galaxies, star fields and a black-hole visualization. This view is procedural art, not a map of the observed universe.":"Explore a three-dimensional gravitational sandbox. Orbit the camera, move through space, and experiment with bodies in X, Y and Z."}</p></div><div className="u-hero-metrics"><div><small>DIMENSIONS</small><b>3D / X · Y · Z</b></div><div><small>GRAVITY</small><b>Newtonian N-body</b></div><div><small>RENDERER</small><b>WebGL</b></div></div></section>
 {showHelp&&<div className="u-note"><b>Scientific boundaries:</b> 3D rendering is not the same as a complete physical universe. Earth uses local textures from <code>public/textures/</code> if installed, otherwise a <b>procedural placeholder with invented geography</b>. This build models Newtonian gravity in three spatial dimensions. Presets are approximate and omit relativity, collisions, stellar evolution, radiation and many other phenomena. See <code>docs/PHYSICS.md</code>.</div>}
 <section className="u-stage"><div className="u-stage-head"><div><span className="u-green-dot"/> {view==="cosmos"?"DEEP COSMOS VIEW":"3D SPACE VIEW"} <small>DRAG · ZOOM · SELECT</small></div><div className="u-stage-actions"><button onClick={()=>setView(v=>v==="cosmos"?"system":"cosmos")}>{view==="cosmos"?"SOLAR SYSTEM":"DEEP COSMOS"}</button><button onClick={()=>setTrailOn(v=>!v)}>{trailOn?"TRAILS ON":"TRAILS OFF"}</button><button onClick={exportJson}><Download size={13}/> EXPORT</button><label><Upload size={13}/> IMPORT<input type="file" accept=".json,application/json" onChange={e=>importJson(e.target.files?.[0])}/></label></div></div>
 <div className="u-canvas"><Canvas camera={{position:[0,8,15],fov:50,near:.01,far:1000}} dpr={[1,2]} gl={{antialias:true,alpha:false}}><Suspense fallback={null}><Scene view={view} bodies={bodies} selectedId={selectedId} onSelect={setSelectedId} running={running} trailOn={trailOn} simSpeed={speed} stepSeconds={dt} substeps={substeps} config={config} onTick={tick}/></Suspense></Canvas><div className="u-hud"><span>{running?"● SIMULATION RUNNING":"Ⅱ SIMULATION PAUSED"}</span><b>T+ {fmt(simTime/YEAR,5)} <small>YEARS</small></b></div><div className="u-axis-legend"><span><i className="x"/> X</span><span><i className="y"/> Y</span><span><i className="z"/> Z</span></div><div className="u-canvas-hint">LEFT DRAG: ORBIT <span>·</span> SCROLL: ZOOM <span>·</span> RIGHT DRAG: PAN</div></div>
 <div className="u-transport"><div><button className="u-run" onClick={()=>setRunning(v=>!v)}>{running?<Pause size={16}/>:<Play size={16} fill="currentColor"/>}{running?"PAUSE":"RUN SIMULATION"}</button><button className="u-reset" onClick={()=>loadPreset(presetId)}><RotateCcw size={14}/> RESET</button></div><label>SIM SPEED <input type="range" min=".1" max="8" step=".1" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/><b>{speed.toFixed(1)}×</b></label></div><div className="u-status"><Activity size={14}/>{view==="cosmos"?"Procedural galaxies and lensing-style visuals; not a physically solved cosmological volume.":notice}<span>{view==="cosmos"?"GENERATED SCENE":`${bodies.length} BODIES`}</span></div></section>
 <section className="u-lower"><aside className="u-card"><div className="u-card-title">01 / SYSTEM PRESETS <Orbit size={15}/></div><p>Choose a system to load its starting conditions.</p>{PRESETS.map((p,i)=><button className={presetId===p.id?"u-preset active":"u-preset"} key={p.id} onClick={()=>loadPreset(p.id)}><small>0{i+1}</small><span><b>{p.label}</b><em>{p.description}</em></span><span>↗</span></button>)}<button className="u-add" onClick={()=>{const b=newBody();setBodies(old=>[...old,b]);setSelectedId(b.id);setNotice("Added experimental 3D body.");}}>＋ ADD 3D BODY</button></aside>
 <aside className="u-card"><div className="u-card-title">02 / BODY INSPECTOR <Layers3 size={15}/></div>{selected?<><label className="u-field">SELECT BODY<select value={selectedId} onChange={e=>setSelectedId(e.target.value)}>{bodies.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label className="u-field">NAME<input value={selected.name} onChange={e=>patch({name:e.target.value})}/></label><label className="u-field">MASS (EARTH MASSES)<input type="number" min=".000001" value={Number((selected.mass/EARTH_MASS).toPrecision(6))} onChange={e=>patch({mass:Math.max(1,Number(e.target.value)||1)*EARTH_MASS})}/></label><div className="u-coords"><Coordinate label="X POSITION / AU" value={selected.position3.x/AU} change={n=>patch({position3:{...selected.position3,x:n*AU}})}/><Coordinate label="Y POSITION / AU" value={selected.position3.y/AU} change={n=>patch({position3:{...selected.position3,y:n*AU}})}/><Coordinate label="Z POSITION / AU" value={selected.position3.z/AU} change={n=>patch({position3:{...selected.position3,z:n*AU}})}/><Coordinate label="VX / KM/S" value={selected.velocity3.x/1000} change={n=>patch({velocity3:{...selected.velocity3,x:n*1000}})}/><Coordinate label="VY / KM/S" value={selected.velocity3.y/1000} change={n=>patch({velocity3:{...selected.velocity3,y:n*1000}})}/><Coordinate label="VZ / KM/S" value={selected.velocity3.z/1000} change={n=>patch({velocity3:{...selected.velocity3,z:n*1000}})}/></div><button className="u-remove" disabled={bodies.length<2} onClick={()=>{const next=bodies.filter(b=>b.id!==selectedId);setBodies(next);setSelectedId(next[0].id);}}>REMOVE SELECTED BODY ×</button></>:null}</aside>
 <aside className="u-card"><div className="u-card-title">03 / PHYSICS PARAMETERS <Gauge size={15}/></div><label className="u-field">GRAVITATIONAL CONSTANT<input type="number" value={gValue.toExponential(5)} onChange={e=>setGValue(Math.max(0,Number(e.target.value)||0))}/><small>m³ kg⁻¹ s⁻²</small></label><label className="u-field">SOFTENING LENGTH <b>{fmt(softeningKm)} km</b><input type="range" min="0" max="50000" value={softeningKm} onChange={e=>setSofteningKm(Number(e.target.value))}/></label><label className="u-field">TIME STEP (SECONDS)<input type="number" min="1" max="86400" value={dt} onChange={e=>setDt(Math.max(1,Math.min(86400,Number(e.target.value)||1)))}/></label><label className="u-field">SUBSTEPS<select value={substeps} onChange={e=>setSubsteps(Number(e.target.value))}>{[1,2,4,8,16].map(n=><option key={n}>{n}</option>)}</select></label><div className="u-diagnostic"><small>TOTAL ENERGY (3D)</small><b>{diag?compact(diag.energy):"—"} J</b><small>LINEAR MOMENTUM (3D)</small><b>{diag?compact(diag.momentumMagnitude):"—"} kg·m/s</b><small>ANGULAR MOMENTUM (3D, ABOUT ORIGIN)</small><b>{diag?compact(diag.angularMomentumMagnitude):"—"} kg·m²/s</b>{anyFixed&&<small>A fixed body acts as an external anchor, so energy and momentum are not conserved while it is present.</small>}</div></aside></section>
 <footer className="u-footer">UNIVERSAL SANDBOX <span>3D NEWTONIAN MODEL · LOCAL FIRST · NO DEPLOYMENT</span></footer></main>;
}
function Coordinate({label,value,change}:{label:string;value:number;change:(n:number)=>void}){return <label className="u-field">{label}<input type="number" value={Number(value.toPrecision(7))} onChange={e=>change(Number(e.target.value)||0)}/></label>;}
