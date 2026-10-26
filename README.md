# Universal Sandbox

A local-first 3D universe exploration and physics experiment project. Run locally; no Vercel deployment is required.

## Run locally

Requirements: Node.js 20.11+ (Node 22 LTS recommended).

```bash
git clone https://github.com/navneet-pathak76/universal-sandbox.git
cd universal-sandbox
npm install
npm run dev
```

Open the local URL printed by Vite, normally http://127.0.0.1:5173.

## Current implemented stage

- WebGL 3D scene with orbit, zoom and pan camera controls.
- Switchable **Deep Cosmos** and **Solar System** views.
- Deterministically generated spiral-galaxy particle field, distant galaxy sprites, star field, and a stylized black-hole/accretion-disk visualization.
- Solar-system teaching presets and a separate 3D Newtonian N-body integration module.
- Body inspector, parameter controls, trails and JSON experiment import/export.
- GitHub Actions CI runs physics tests and a TypeScript/Vite production build.

## Scientific status — read before interpreting images

**Deep Cosmos view is procedural visualization.** The spiral galaxies and black-hole accretion disk are generated for exploration and are not measured positions, a sourced map of the observable universe, or a general-relativistic calculation. The visual scene is not currently coupled to a cosmological structure-formation solver.

The Solar System presets are approximate educational initial conditions, not epoch-aligned ephemerides. The 3D view does not yet provide a true photoreal Earth surface, terrain, live NASA/JPL catalogue ingestion, person-level imagery, galaxy-scale physical simulation, general relativity, stellar evolution, weather, life, or civilization simulation. These are roadmap items, not completed features.

## Planned stages

1. **Cosmos rendering foundation** — procedural galaxies, camera navigation, scene modes and explicit provenance labels.
2. **Astronomical data layer** — ingest documented NASA/JPL sources with epochs, units, frame, uncertainty and attribution.
3. **Planetary realism** — Earth day/night textures, clouds, atmosphere, terrain and scale-aware navigation using licensed/sourced datasets.
4. **God Mode** — object creation and editing, checkpoints, branches, time controls, save/load and command console.
5. **Physics expansion** — tested 3D N-body diagnostics, collision models and carefully bounded advanced models.
6. **Cosmic/stellar models** — separate scientific models for structure formation, black holes, stellar evolution, planetary environments and optional life simulation.

Each stage must be tested. A visually plausible rendering is not evidence of physical accuracy.

## Data provenance

See [data/README.md](data/README.md) and [docs/PHYSICS.md](docs/PHYSICS.md). Planned authoritative resources include NASA/JPL Solar System Dynamics and Horizons: https://ssd.jpl.nasa.gov/
