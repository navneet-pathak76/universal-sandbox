import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Atom, CircleHelp, Download, Pause, Play, RotateCcw, SlidersHorizontal, Sparkles, Upload } from "lucide-react";
import { AU, DAY, EARTH_MASS, G, YEAR } from "./physics/constants";
import { cloneBodies, stepVelocityVerlet, totalEnergy, totalMomentum } from "./physics/engine";
import { getPreset, PRESETS } from "./physics/presets";
import type { Body, PhysicsConfig } from "./physics/types";

const fmt = (value: number, digits = 2) => new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
const compact = (n: number) => {
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e24 || (a > 0 && a < 1e-3)) return n.toExponential(2);
  if (a >= 1e9) return `${fmt(n / 1e9)}B`;
  if (a >= 1e6) return `${fmt(n / 1e6)}M`;
  return fmt(n);
};
const uid = () => `body-${Math.random().toString(36).slice(2, 9)}`;

function initialBody(): Body {
  return { id:uid(),name:"Test body",mass:EARTH_MASS*0.1,radius:1_000_000,position:{x:1.7*AU,y:0.1*AU},velocity:{x:-3_000,y:18_000},color:"#b39bff",trail:[] };
}

export default function App() {
  const [presetId,setPresetId]=useState("inner-system");
  const [bodies,setBodies]=useState<Body[]>(()=>getPreset("inner-system"));
  const [selectedId,setSelectedId]=useState("earth");
  const [running,setRunning]=useState(false);
  const [speed,setSpeed]=useState(40);
  const [dt,setDt]=useState(1800);
  const [substeps,setSubsteps]=useState(2);
  const [trailOn,setTrailOn]=useState(true);
  const [showVectors,setShowVectors]=useState(false);
  const [softeningKm,setSofteningKm]=useState(1);
  const [viewScale,setViewScale]=useState(1);
  const [simTime,setSimTime]=useState(0);
  const [notice,setNotice]=useState("Ready. Pick a body or load a preset to begin.");
  const [experimentalG,setExperimentalG]=useState(G);
  const [customName,setCustomName]=useState("Newtonian gravity");
  const [showHelp,setShowHelp]=useState(false);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const viewRef=useRef<HTMLDivElement>(null);
  const simRef=useRef<Body[]>(bodies);
  const timeRef=useRef(0);
  const lastRef=useRef(0);
  const selected=bodies.find(b=>b.id===selectedId)??bodies[0];
  const config:PhysicsConfig=useMemo(()=>({gravitationalConstant:experimentalG,softening:softeningKm*1000}),[experimentalG,softeningKm]);
  const diagnostics=useMemo(()=>({energy:totalEnergy(bodies,config),momentum:totalMomentum(bodies)}),[bodies,config]);

  useEffect(()=>{simRef.current=bodies;},[bodies]);
  useEffect(()=>{timeRef.current=simTime;},[simTime]);

  useEffect(()=>{
    const canvas=canvasRef.current, container=viewRef.current;
    if(!canvas||!container)return;
    const ctx=canvas.getContext("2d");if(!ctx)return;
    let raf=0,publishCounter=0;
    const resize=()=>{
      const rect=container.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
      canvas.width=Math.max(1,Math.floor(rect.width*dpr));canvas.height=Math.max(1,Math.floor(rect.height*dpr));
      canvas.style.width=`${rect.width}px`;canvas.style.height=`${rect.height}px`;
    };
    resize();const observer=new ResizeObserver(resize);observer.observe(container);
    const frame=(now:number)=>{
      const w=container.clientWidth,h=container.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);drawBackdrop(ctx,w,h);
      const current=simRef.current,centre=current.find(b=>b.id==="sun")?.position??current[0]?.position??{x:0,y:0};
      const span=Math.max(1.5*AU,...current.map(b=>Math.hypot(b.position.x-centre.x,b.position.y-centre.y)));
      const worldScale=Math.min(w,h)*0.43/span/viewScale,cx=w/2,cy=h/2;
      const map=(p:{x:number;y:number})=>({x:cx+(p.x-centre.x)*worldScale,y:cy-(p.y-centre.y)*worldScale});
      ctx.strokeStyle="rgba(160,181,224,.10)";ctx.lineWidth=1;
      for(const b of current){if(b.id==="sun")continue;const p=map(b.position),r=Math.hypot(p.x-cx,p.y-cy);if(r>1&&r<Math.max(w,h)*3){ctx.beginPath();ctx.ellipse(cx,cy,r,r,0,0,Math.PI*2);ctx.stroke();}}
      for(const b of current){if(trailOn&&b.trail.length>1){ctx.beginPath();b.trail.forEach((p,i)=>{const q=map(p);if(i===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);});ctx.strokeStyle=b.color+"88";ctx.lineWidth=1.15;ctx.stroke();}}
      if(showVectors&&current.length<35)for(const b of current){const p=map(b.position),len=Math.min(44,Math.hypot(b.velocity.x,b.velocity.y)/1_100_000),angle=Math.atan2(-b.velocity.y,b.velocity.x);ctx.strokeStyle=b.color+"aa";ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+Math.cos(angle)*len,p.y+Math.sin(angle)*len);ctx.stroke();}
      for(const b of current){
        const p=map(b.position),sel=b.id===selectedId,rad=Math.min(17,(b.id==="sun"?10:4)+Math.log10(Math.max(1,b.mass/EARTH_MASS))*1.25+(sel?2:0));
        if(b.id==="sun"){const glow=ctx.createRadialGradient(p.x,p.y,2,p.x,p.y,38);glow.addColorStop(0,"rgba(255,187,83,.24)");glow.addColorStop(1,"rgba(255,187,83,0)");ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,38,0,Math.PI*2);ctx.fill();}
        ctx.fillStyle=b.color;ctx.shadowColor=b.color;ctx.shadowBlur=sel?20:(b.id==="sun"?15:4);ctx.beginPath();ctx.arc(p.x,p.y,rad,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        if(sel){ctx.beginPath();ctx.arc(p.x,p.y,rad+6,0,Math.PI*2);ctx.strokeStyle="#ffffff";ctx.lineWidth=1;ctx.stroke();}
        ctx.font=sel?"600 12px Inter, system-ui, sans-serif":"11px Inter, system-ui, sans-serif";ctx.fillStyle=sel?"#fff":"#b1bdcf";ctx.fillText(b.name,p.x+rad+7,p.y-rad-5);
      }
      // Use a wall-clock accumulator and deterministic fixed physics steps.
      if(running){
        if(lastRef.current>0){
          const elapsed=Math.min(0.1,(now-lastRef.current)/1000);
          const steps=Math.max(1,Math.round(speed/10))*substeps;
          const stepSeconds=dt;
          let next=simRef.current;
          try{for(let i=0;i<steps;i++)next=stepVelocityVerlet(next,stepSeconds,config);}
          catch(err){setRunning(false);setNotice(err instanceof Error?err.message:"Numerical step failed.");}
          timeRef.current+=steps*stepSeconds;
          publishCounter++;
          if(trailOn&&publishCounter%3===0)next=next.map(b=>({...b,trail:[...b.trail,{...b.position}].slice(-900)}));
          simRef.current=next;
          if(publishCounter%2===0){setBodies(next);setSimTime(timeRef.current);}
        }
        lastRef.current=now;
      }else{lastRef.current=0;}
      raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);return()=>{cancelAnimationFrame(raf);observer.disconnect();lastRef.current=0;};
  },[running,speed,dt,substeps,trailOn,showVectors,selectedId,viewScale,config]);

  function loadPreset(id:string){const next=getPreset(id);setPresetId(id);setBodies(next);simRef.current=next;setSelectedId(next.find(b=>b.id==="earth")?.id??next[0].id);setRunning(false);setSimTime(0);timeRef.current=0;setNotice(`Loaded ${PRESETS.find(p=>p.id===id)?.label??id}. Starting states are approximate.`);}
  function reset(){const next=getPreset(presetId);setBodies(next);simRef.current=next;setSimTime(0);timeRef.current=0;setRunning(false);setNotice("Reset to preset initial conditions.");}
  function updateSelected(patch:Partial<Body>){if(!selected)return;setBodies(old=>{const next=old.map(b=>b.id===selected.id?{...b,...patch}:b);simRef.current=next;return next;});setNotice("Body parameters changed. This is now a user-edited experiment.");}
  function addBody(){const b=initialBody(),next=[...bodies,b];setBodies(next);simRef.current=next;setSelectedId(b.id);setNotice("Added an experimental body with illustrative starting values.");}
  function deleteSelected(){if(!selected||bodies.length<2)return;const next=bodies.filter(b=>b.id!==selected.id);setBodies(next);simRef.current=next;setSelectedId(next[0].id);setNotice("Body removed.");}
  function exportState(){const payload={schemaVersion:1,exportedAt:new Date().toISOString(),model:{name:customName,gravitationalConstant:config.gravitationalConstant,softeningM:config.softening,timeStepSeconds:dt,substeps},simulationTimeSeconds:simTime,bodies:bodies.map(({trail,...b})=>b),note:"State only. Presets are approximate and not epoch-aligned ephemerides."};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="universal-sandbox-state.json";a.click();URL.revokeObjectURL(url);setNotice("Exported current state as JSON.");}
  function importState(file?:File){if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(String(reader.result));if(!Array.isArray(data.bodies)||data.bodies.length<1||data.bodies.length>500)throw new Error("Expected 1–500 bodies.");const valid=data.bodies.map((b:any,i:number):Body=>{const out={id:String(b.id??`imported-${i}`),name:String(b.name??`Body ${i+1}`),mass:Number(b.mass),radius:Number(b.radius??1),position:{x:Number(b.position?.x),y:Number(b.position?.y)},velocity:{x:Number(b.velocity?.x),y:Number(b.velocity?.y)},color:String(b.color??"#90a5c9"),trail:[]};if(!(out.mass>0)||![out.mass,out.radius,out.position.x,out.position.y,out.velocity.x,out.velocity.y].every(Number.isFinite))throw new Error(`Invalid numeric field for ${out.name}`);return out;});const ids=valid.map(b=>b.id);if(new Set(ids).size!==ids.length)throw new Error("Body IDs must be unique.");const next=cloneBodies(valid);setBodies(next);simRef.current=next;setSelectedId(next[0].id);setRunning(false);setSimTime(0);timeRef.current=0;if(Number(data.model?.gravitationalConstant)>0)setExperimentalG(Number(data.model.gravitationalConstant));if(Number(data.model?.softeningM)>=0)setSofteningKm(Number(data.model.softeningM)/1000);setNotice("Imported user-authored model. Verify units and assumptions before interpreting results.");}catch(e){setNotice(e instanceof Error?`Import failed: ${e.message}`:"Import failed: invalid JSON.");}};reader.readAsText(file);}

  const orbitRadius=selected?Math.hypot(selected.position.x,selected.position.y)/AU:0;
  return <main className="app-shell">
    <header className="topbar"><div className="brand-lockup"><div className="brand-mark"><Atom size={21}/></div><div><div className="brand-name">UNIVERSAL <span>SANDBOX</span></div><div className="brand-sub">LOCAL UNIVERSE LAB / BUILD 0.1</div></div></div><div className="topbar-meta"><span className="local-indicator"><i/> LOCAL SIMULATION</span><button className="icon-button" title="Physics guide" onClick={()=>setShowHelp(v=>!v)}><CircleHelp size={17}/></button></div></header>
    <section className="intro-row"><div><div className="eyebrow"><span className="eyebrow-line"/> GRAVITY · ORBITS · EXPERIMENTS</div><h1>Explore the rules<br/><em>of the universe.</em></h1><p className="intro-copy">A physics sandbox for building systems, testing assumptions, and watching gravity unfold in real time.</p></div><div className="intro-stats"><div><span className="stat-label">MODEL</span><b>Newtonian N-body</b></div><div><span className="stat-label">SPACE</span><b>2D · SI units</b></div><div><span className="stat-label">MODE</span><b>Local-first</b></div></div></section>
    {showHelp&&<section className="help-panel"><strong>Scientific status matters.</strong> Newtonian gravity, configurable softening, fixed-step velocity-Verlet. Presets are approximate teaching states, not precision ephemerides. Changing a parameter creates an experiment, not a validated new law. Read <code>docs/PHYSICS.md</code> and <code>data/README.md</code>.</section>}
    <section className="workspace"><div className="scene-panel">
      <div className="scene-toolbar"><div className="panel-heading"><span className="live-dot"/><span>SYSTEM VIEW</span><small>INTERACTIVE CANVAS</small></div><div className="scene-actions"><button className="tool-button" onClick={()=>setTrailOn(v=>!v)} aria-pressed={trailOn}>TRAILS {trailOn?"ON":"OFF"}</button><button className="tool-button" onClick={()=>setShowVectors(v=>!v)} aria-pressed={showVectors}>VECTORS {showVectors?"ON":"OFF"}</button><button className="tool-button" onClick={exportState}><Download size={13}/> EXPORT</button><label className="tool-button upload-button"><Upload size={13}/> IMPORT<input type="file" accept="application/json,.json" onChange={e=>importState(e.target.files?.[0])}/></label></div></div>
      <div className="canvas-wrap" ref={viewRef}><canvas ref={canvasRef} onClick={e=>{const rect=e.currentTarget.getBoundingClientRect(),x=e.clientX-rect.left-rect.width/2,y=e.clientY-rect.top-rect.height/2;const current=simRef.current,centre=current.find(b=>b.id==="sun")?.position??current[0].position,span=Math.max(1.5*AU,...current.map(b=>Math.hypot(b.position.x-centre.x,b.position.y-centre.y))),s=Math.min(rect.width,rect.height)*.43/span/viewScale;let best:Body|undefined,dist=28;for(const b of current){const px=(b.position.x-centre.x)*s,py=-(b.position.y-centre.y)*s,d=Math.hypot(px-x,py-y);if(d<dist){dist=d;best=b;}}if(best)setSelectedId(best.id);}}/><div className="canvas-coordinate">FRAME: SYSTEM-CENTRED / ILLUSTRATIVE</div><div className="scale-control"><span>ZOOM</span><input aria-label="Zoom" type="range" min=".65" max="7" step=".05" value={viewScale} onChange={e=>setViewScale(Number(e.target.value))}/></div><div className="canvas-overlay"><div className="overlay-chip"><i/> {running?"SIMULATION RUNNING":"SIMULATION PAUSED"}</div><div className="overlay-time">T+ {fmt(simTime/YEAR,4)} <span>YR</span></div></div></div>
      <div className="transport"><div className="transport-controls"><button className={running?"transport-main active":"transport-main"} onClick={()=>setRunning(v=>!v)}>{running?<Pause size={16} fill="currentColor"/>:<Play size={16} fill="currentColor"/>}{running?"PAUSE":"RUN SIMULATION"}</button><button className="transport-reset" onClick={reset}><RotateCcw size={15}/> RESET</button></div><div className="speed-control"><span>TIME SCALE</span><input type="range" min="1" max="400" step="1" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/><b>{speed}×</b></div></div>
      <div className="statusline"><span><Activity size={13}/>{notice}</span><span className="mono">{bodies.length} BODIES</span></div>
    </div><aside className="side-panel">
      <div className="side-section"><div className="section-title"><span>01 / SYSTEM PRESETS</span><Sparkles size={15}/></div><p className="section-description">Start with a reference configuration, then change its rules.</p><div className="preset-list">{PRESETS.map((p,i)=><button key={p.id} className={presetId===p.id?"preset-card selected":"preset-card"} onClick={()=>loadPreset(p.id)}><span className="preset-index">0{i+1}</span><span className="preset-content"><b>{p.label}</b><small>{p.description}</small></span><span className="preset-arrow">↗</span></button>)}</div><button className="add-body" onClick={addBody}>＋ ADD EXPERIMENTAL BODY</button></div>
      <div className="side-section body-editor"><div className="section-title"><span>02 / BODY INSPECTOR</span><SlidersHorizontal size={15}/></div>{selected?<div className="body-fields"><div className="selected-body-heading"><span className="body-swatch" style={{background:selected.color}}/><div><b>{selected.name}</b><small>{selected.id}</small></div><button className="delete-body" onClick={deleteSelected} disabled={bodies.length<2} title="Delete selected body">×</button></div><label className="field-label">SELECT BODY<select value={selectedId} onChange={e=>setSelectedId(e.target.value)}>{bodies.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label className="field-label">BODY NAME<input value={selected.name} onChange={e=>updateSelected({name:e.target.value})}/></label><NumberField label="MASS (EARTH MASSES)" value={selected.mass/EARTH_MASS} min={1e-6} max={1e12} step="any" onChange={n=>updateSelected({mass:n*EARTH_MASS})}/><NumberField label="POSITION X (AU)" value={selected.position.x/AU} onChange={n=>updateSelected({position:{...selected.position,x:n*AU}})}/><NumberField label="POSITION Y (AU)" value={selected.position.y/AU} onChange={n=>updateSelected({position:{...selected.position,y:n*AU}})}/><NumberField label="VELOCITY X (KM/S)" value={selected.velocity.x/1000} onChange={n=>updateSelected({velocity:{...selected.velocity,x:n*1000}})}/><NumberField label="VELOCITY Y (KM/S)" value={selected.velocity.y/1000} onChange={n=>updateSelected({velocity:{...selected.velocity,y:n*1000}})}/><div className="body-facts"><div><small>RADIUS FROM ORIGIN</small><b>{fmt(orbitRadius,3)} AU</b></div><div><small>SPEED</small><b>{fmt(Math.hypot(selected.velocity.x,selected.velocity.y)/1000,2)} km/s</b></div></div></div>:<div className="empty-state">No body selected.</div>}</div>
      <div className="side-section"><div className="section-title"><span>03 / MODEL PARAMETERS</span></div><label className="field-label">FORCE MODEL NAME<input value={customName} onChange={e=>setCustomName(e.target.value)}/></label><label className="field-label">GRAVITATIONAL CONSTANT (G)<input type="number" value={experimentalG.toExponential(5)} onChange={e=>setExperimentalG(Math.max(0,Number(e.target.value)||0))}/><small className="field-hint">SI: m³ kg⁻¹ s⁻² · conventional ≈ 6.67430e−11</small></label><div className="range-field"><label>SOFTENING LENGTH</label><b>{fmt(softeningKm)} km</b><input type="range" min="0" max="50000" step="1" value={softeningKm} onChange={e=>setSofteningKm(Number(e.target.value))}/></div><div className="two-fields"><label className="field-label">STEP SIZE (SECONDS)<input type="number" min="1" max="86400" value={dt} onChange={e=>setDt(Math.max(1,Math.min(86400,Number(e.target.value)||1)))}/></label><label className="field-label">SUBSTEPS<select value={substeps} onChange={e=>setSubsteps(Number(e.target.value))}>{[1,2,4,8,16].map(n=><option key={n} value={n}>{n}×</option>)}</select></label></div><p className="experimental-note"><span>!</span> Parameter edits are experimental. Smaller steps usually improve numerical resolution but increase computation.</p></div>
    </aside></section>
    <section className="metrics-grid"><Metric label="SIMULATED TIME" value={`${fmt(simTime/DAY,2)} days`} detail={`${fmt(simTime/YEAR,5)} Julian years`}/><Metric label="TOTAL ENERGY" value={compact(diagnostics.energy)+" J"} detail="Kinetic + softened potential"/><Metric label="LINEAR MOMENTUM" value={compact(Math.hypot(diagnostics.momentum.x,diagnostics.momentum.y))} detail="kg · m/s · total vector magnitude"/><Metric label="ENERGY SCALE" value={compact(Math.abs(diagnostics.energy)||1)+" J"} detail="Magnitude; monitor drift across runs"/></section>
    <section className="footer-callout"><div className="footer-icon"><Atom size={19}/></div><div><b>Test an idea. Keep the evidence separate.</b><p>Universal Sandbox distinguishes classical assumptions, approximate input data, and your own experiments. A visually convincing orbit is not by itself evidence of physical accuracy.</p></div><button onClick={()=>setShowHelp(v=>!v)}>READ MODEL NOTES ↗</button></section>
    <footer><span>UNIVERSAL SANDBOX <span className="footer-sep">/</span> LOCAL-FIRST SIMULATION</span><span>BUILT FOR EXPLORATION, NOT CERTAINTY</span></footer>
  </main>;
}
function NumberField({label,value,onChange,min=-1e12,max=1e12,step=0.01}:{label:string;value:number;onChange:(n:number)=>void;min?:number;max?:number;step?:string|number}){return <label className="field-label">{label}<input type="number" min={min} max={max} step={step} value={Number.isFinite(value)?Number(value.toPrecision(9)):0} onChange={e=>onChange(Math.max(min,Math.min(max,Number(e.target.value)||0)))}/></label>;}
function Metric({label,value,detail}:{label:string;value:string;detail:string}){return <div className="metric-card"><span>{label}</span><b>{value}</b><small>{detail}</small></div>;}
function drawBackdrop(ctx:CanvasRenderingContext2D,w:number,h:number){const grad=ctx.createRadialGradient(w*.48,h*.5,0,w*.48,h*.5,Math.max(w,h)*.7);grad.addColorStop(0,"#101929");grad.addColorStop(.6,"#090e19");grad.addColorStop(1,"#070a11");ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);ctx.fillStyle="rgba(196,211,255,.35)";for(let i=0;i<75;i++){const x=((i*173+29)%997)/997*w,y=((i*317+53)%991)/991*h,r=i%5===0?1.2:.55;ctx.globalAlpha=.2+(i%7)*.08;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;ctx.strokeStyle="rgba(116,139,181,.06)";ctx.lineWidth=1;const gap=48;for(let x=(w/2)%gap;x<w;x+=gap){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=(h/2)%gap;y<h;y+=gap){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}}
