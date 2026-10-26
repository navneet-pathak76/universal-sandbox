# Universal Sandbox

A local-first interactive universe simulator for experimenting with orbital mechanics. Scientific calculations and simulator assumptions are documented; this project is an educational Newtonian N-body model, not a claim of complete physical reality.

## Run locally

Requirements: Node.js 20.11+ (Node 22 LTS recommended).

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. No deployment or cloud account is required.

## Features in this baseline

- Interactive 2D orbital sandbox with editable bodies and initial velocities
- Newtonian pairwise gravity integrated with velocity-Verlet
- Fixed simulation step, configurable time scale, pause/reset, orbit traces
- Reference presets and transparent SI-based unit conversions
- Energy and momentum diagnostics, plus automated physics tests
- Data provenance and model limitations documented in `data/README.md` and `docs/PHYSICS.md`

## Model boundaries

This first version uses Newtonian gravity and a 2D visualization. It does not model general relativity, tides, radiation pressure, gas dynamics, stellar evolution, or all known objects. Presets are illustrative approximate initial conditions, not an ephemeris-grade reconstruction. Never interpret experimental parameters as established science without independent evidence.

See `docs/PHYSICS.md`, `data/README.md`, and `CONTRIBUTING.md`.
