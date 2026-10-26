# Physics model

## Status labels

- **Established model:** Newtonian point-mass gravity, used as a classical approximation.
- **Approximate input:** compact preset masses and initial conditions in this prototype.
- **Experimental:** user-edited masses, positions, velocity, force laws, or parameters. Such settings are not evidence that a new physical law is correct.

## Units and equations

Internally the engine uses SI units: kilograms (kg), metres (m), seconds (s). The gravitational parameter is the rounded conventional value (G = 6.67430 \times 10^{-11}\,\mathrm{m^3\,kg^{-1}\,s^{-2}}).

For bodies (i,j), Newtonian gravitational acceleration is calculated from
\[
\mathbf a_i = G\sum_{j\ne i} m_j\frac{\mathbf r_j-\mathbf r_i}{(|\mathbf r_j-\mathbf r_i|^2+\epsilon^2)^{3/2}}.
\]
The small softening term \(\epsilon\) is a numerical guard against singular acceleration at coincident points. It alters close-encounter dynamics, so it must be small compared to the scale under study. The interface lets users configure it.

The integrator is velocity-Verlet (kick-drift-kick). It is time-reversible for the ideal conservative force evaluation up to finite-precision effects, but it does not make a large time step accurate. Close encounters and large accelerations require smaller steps. This baseline uses a fixed internal time step controlled by a substep setting; users should run convergence checks before interpreting results.

## Diagnostics

- Total energy = kinetic energy + Newtonian softened pair potential.
- Total linear momentum = sum of each body’s mass times velocity.
- These diagnostics help identify numerical drift; they are not proof the model captures nature.

## Limitations

This is a **2D Newtonian educational sandbox**, not an ephemeris, engineering simulator, or full astrophysics code. It omits relativity, oblateness, tides, collisions/fragmentation, radiation pressure, atmospheric effects, non-gravitational forces, gas/plasma dynamics, stellar evolution, quantum effects, and uncertainty propagation. Its compact presets are approximate and not epoch-aligned high-precision ephemerides. Visualization sizes are not to scale by default.

A user-added equation should be named and logged as an experimental model. Compare it against known analytical cases, run convergence checks across decreasing time steps, and do not describe a result as a discovery without independent validation.
