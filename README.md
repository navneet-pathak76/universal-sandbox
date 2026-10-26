# Universal Sandbox

A **local-first interactive universe simulator** for experimenting with orbital mechanics. This is an educational Newtonian N-body model, not a claim of complete physical reality.

## Run locally

Requirements: Node.js 20.11+ (Node 22 LTS recommended).

```bash
git clone https://github.com/navneet-pathak76/universal-sandbox.git
cd universal-sandbox
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173). No deployment or cloud account is required.

## Current baseline

- Interactive 2D canvas, body inspector, edit mass/position/velocity
- Newtonian pairwise gravity with a configurable softening length
- Fixed-step velocity-Verlet integration
- Time scale, pause/reset, trails and velocity-vector display
- Sun–Earth, inner-system, and binary-star teaching presets
- Total energy and linear-momentum diagnostics
- JSON import/export for user-created experiments
- Core physics tests; model limitations and dataset provenance notes

## Scientific boundaries

The initial version uses Newtonian gravity in 2D. It does not model general relativity, tides, radiation pressure, gas dynamics, stellar evolution, or all known objects. Presets are illustrative approximate initial conditions, not a reconstruction at a specific epoch. Visualization sizes are not to scale. A parameter experiment is not validation of a new physical law.

Read [Physics model](docs/PHYSICS.md), [Data provenance](data/README.md), and [Contributing](CONTRIBUTING.md).
