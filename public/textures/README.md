# Local textures (optional)

The app makes **no network requests for textures**. If the files below exist it uses them;
otherwise Earth is drawn from a **procedural placeholder with invented geography**.

| File | Purpose | Colour space |
|---|---|---|
| `earth_day.jpg` | Equirectangular day map (2:1, e.g. 4096x2048) | sRGB |
| `earth_normal.png` | Optional normal map | linear |
| `earth_roughness.png` | Optional roughness (oceans smooth, land rough) | linear |

## Sourcing (you must verify the licence yourself)

Do not commit a texture until you have checked its licence and recorded it in the table below.
Candidates worth checking: NASA Visible Earth "Blue Marble" (https://visibleearth.nasa.gov/),
generally public domain for NASA-produced imagery but confirm the page's credit/usage note.
Third-party texture sites often forbid redistribution; do not assume they are free to commit.

| File | Source URL | Licence / terms | Credit line | Date checked |
|---|---|---|---|---|
| _none installed_ | | | | |

Large binaries: keep textures out of git unless small, or document a download step.
