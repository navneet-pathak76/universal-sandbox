# Physics model and assumptions

## Scientific status

- **Established model:** Newtonian point-mass gravity, used as a classical approximation.
- **Approximate input:** compact preset masses and initial conditions.
- **Experimental:** user-edited masses, positions, velocities, gravity parameter, or force-law changes. These do not by themselves establish a new physical law.

## Units and equations

Internally the engine uses SI units: kilograms, metres and seconds. The configured gravitational constant starts at rounded conventional (G=6.67430\times10^{-11}\,\mathrm{m^3\,kg^{-1}\,s^{-2}}).

For bodies (i,j), softened Newtonian acceleration is
\[
\mathbf a_i=G\sum_{j\ne i}m_j\frac{\mathbf r_j-\mathbf r_i}{(|\mathbf r_j-\mathbf r_i|^2+\epsilon^2)^{3/2}}.
\]
Softening \(\epsilon\) regularizes the singularity near coincident points but changes close-encounter dynamics. Select it relative to the length scale studied and document the choice.

The integrator is velocity-Verlet (kick-drift-kick). It does not make a large time step accurate. Close encounters require smaller steps. Run timestep-convergence comparisons before interpreting results.

## Diagnostics and limits

Total energy is kinetic plus the softened pair potential. Total linear momentum is \(\sum_i m_i\mathbf v_i\). Numerical drift should be monitored; diagnostic stability is not proof that a model matches nature.

This is a **2D Newtonian educational sandbox**, not an ephemeris, engineering simulator, or full astrophysics code. It omits relativity, oblateness, tides, collisions/fragmentation, radiation pressure, atmospheric effects, non-gravitational forces, gas/plasma dynamics, stellar evolution, quantum effects, and uncertainty propagation. Preset states are not epoch-aligned high-precision ephemerides. Visual radii are not to scale.

A user-added equation should be labelled as experimental. Compare against known analytical cases, test convergence across decreasing time steps, and do not claim a discovery without independent validation.
