# One-shot map bundle prompt

Use the thematic reference image only as inspiration. Create an original, professional Counter-Strike 1.6 5v5 defusal map bundle.

Return exactly seven separate files:

1. `01-blockout-blueprint.png`
2. `02-route-analysis.png`
3. `03-elevation-sections.png`
4. `04-material-sheet.png`
5. `05-prefab-sheet.png`
6. `06-visual-target.png`
7. `map.bundle.json`

If the generation interface supports archives, also package those exact seven files into one ZIP without renaming them.

The first three images must show the same orthographic map panel at the same scale, aspect ratio, orientation, and north direction. Keep labels and arrows outside playable floors. Use flat exact colors: light floor, dark walls, blue CT, orange T, red A, yellow B, green cover, purple lower areas, light-orange elevated areas, and cyan ladders. Draw stairs as alternating black/white bars. Use no perspective, gradients, shadows, logos, characters, or decorative marks inside the blueprint.

The material sheet must be exactly five columns by four rows, in this order:

- Row 1: `wall1`, `wall2`, `wall3`, `wall4`, `floor1`
- Row 2: `floor2`, `floor3`, `floor4`, `ceiling1`, `ceiling2`
- Row 3: `ground1`, `ground2`, `metal1`, `metal2`, `wood1`
- Row 4: `wood2`, `trim1`, `trim2`, `accentA`, `accentB`

Every material tile must be square, isolated, seamless, front-facing, evenly lit, and labelled beneath.

`map.bundle.json` must validate against `schemas/blockout-map-bundle-v2.schema.json`. Coordinates use metres from the top-left with north up. It must describe the exact shell or rooms, continuous wall segments with explicit doorway gaps, openings, every crate/cover/stair/ramp/ladder/platform, five-player spawn anchors, A/B objectives, buy zones, elevations, material roles, and route polylines with target timings.

Competitive requirements:

- Main routes: 4–6 m wide.
- Secondary routes: 3–4 m wide.
- Doors and choke points: at least 2 m.
- At least three exits from each spawn area.
- Connected A, mid, and B routes with at least two rotations.
- Practical stairs, ramps, ladders, and landings.
- No trapped spawns, isolated playable islands, decorative walls across routes, or unreachable floors.
- Sightlines should provide deliberate long, medium, and short engagements with usable cover and counterplay.

Use `examples/map.bundle.example.json` as the structural example, but replace all example geometry and gameplay data.
