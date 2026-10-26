# Data provenance and limits

The built-in presets in `src/physics/presets.ts` are compact, approximate teaching configurations. They are **not** an astronomical-object catalogue or precision ephemerides. Values are rounded; initial positions/velocities are chosen for simple idealized starts rather than a common real-world epoch.

Constants are listed in `src/physics/constants.ts`. These are conventional/rounded visualization values, not a metrology-grade constants service.

## Future authoritative data sources

- NASA/JPL Solar System Dynamics and Horizons: https://ssd.jpl.nasa.gov/
- JPL Small-Body Database: https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html
- NASA Planetary Fact Sheet: https://nssdc.gsfc.nasa.gov/planetary/factsheet/

Before adding a dataset, record the exact source URL, retrieval date, units, frame, epoch, uncertainty, licensing/terms, and transformations applied. Keep source data distinct from generated or user-authored data. Never present the educational presets as observationally precise initial conditions.
