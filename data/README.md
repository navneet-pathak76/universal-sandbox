# Data provenance and limits

The initial presets in `src/physics/presets.ts` are compact, approximate pedagogical configurations. They are **not** a downloaded catalog of all astronomical objects, nor are they precision ephemerides. Values are rounded and are explicitly labelled approximate in the UI.

Constants used by the engine are listed in `src/physics/constants.ts`. They are conventional nominal/rounded values for a visualization, not a substitute for a metrology-grade constants package.

## Future real-world datasets

For authoritative bodies and ephemerides, prefer:
- NASA/JPL Solar System Dynamics and Horizons: https://ssd.jpl.nasa.gov/
- JPL Small-Body Database: https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html
- NASA Planetary Fact Sheet: https://nssdc.gsfc.nasa.gov/planetary/factsheet/

Before adding a dataset, record its exact source URL, retrieval date, units, reference frame, epoch, uncertainty, license/terms, and transformations applied. Keep source data distinct from generated or user-authored data. Do not present approximate educational preset states as observationally precise initial conditions.
