# Blockout — CS 1.6 Map Builder

A self-contained beginner-first prototype for blocking out Counter-Strike 1.6 maps.

## Public beta quick start

Download the newest Windows ZIP from GitHub Releases, extract it, then:

1. Double-click `Blockout.exe` (or `Start Blockout.cmd`).
2. Open **Build & Test**. The first-run guide detects CS 1.6 and can install the
   official SDHLT v1.2.0 compiler package after verifying its hashes.
3. Build in the editor at `http://127.0.0.1:41716/`.

The release launcher does not require Python. Node.js 20+ is optional and only
needed when importing new texture images. Counter-Strike 1.6/Half-Life must be legally installed
through Steam; no Valve game content or credentials are included. See
[`TESTING.md`](TESTING.md) for the beta checklist.

## Recommended: run with the Windows companion

Double-click `Blockout.exe` or `Start Blockout.cmd`. Keep its small console window open while using the editor.

The companion:

- Opens Blockout at `http://127.0.0.1:41716`
- Detects the Counter-Strike 1.6 installation
- Detects configured VHLT/ZHLT compilers
- Compiles through HLCSG, HLBSP, HLVIS, and HLRAD
- Offers Draft, Playtest, and Final compile profiles with live stage/timing feedback
- Cancels a running compiler process safely
- Converts supported leak/error coordinates into clickable top-down plan markers
- Copies the resulting BSP to `cstrike/maps`
- Launches CS 1.6 on the map after an explicit **Build & Test** click

The server only listens on the local computer. Build files stay under the `builds` folder.

After updating Blockout, close any older companion console and double-click `Start Blockout.cmd` again. The build panel asks for a restart when an outdated companion is still running.

## Browser-only mode

Open `index.html` in a current version of Chrome, Edge, or Firefox. No installation or build step is needed.

For browser features that restrict local `file://` pages, serve this folder locally instead:

```powershell
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Hosted edition

The production web edition contains only the browser editor, layouts, prefabs, and built-in preview images. It deliberately excludes compilers, local configuration, WAD tooling, build artifacts, and user-imported images. Editing, Orbit/Walkthrough preview, browser autosave, project JSON, packages, and `.map` export work directly online.

The hosted editor can securely pair with the Windows companion for **Build & Test**, BSP installation, Steam launching, and custom texture import/deletion. Start `Start Blockout.cmd`, open **Build & Test** online, and enter the rotating code printed in the companion console. The bridge remains bound to `127.0.0.1`, accepts only the exact production site origin, requires the current pairing code, and may trigger the browser's loopback-network permission prompt. Restarting the companion rotates the code and ends the previous session.

## Current features

- Draw grid-snapped rooms in a top-down editor
- Draw custom convex polygon rooms point-by-point; press **Enter** or click the first corner to finish
- Drag ready-made triangular and octagonal room presets
- Draw walkable polygon platforms inside rooms
- Draw rectangular or convex polygon floor slabs with independent material, absolute elevation, and thickness
- Set each room's base floor elevation; contained structures move with that level
- Filter the top-down plan by elevation, ghost other levels, and isolate the current level in Orbit
- Move selected rooms or structures up/down by one 64-unit level
- Draw convex polygon walls and place editable compile-safe octagonal columns
- Search a compact, collapsible tool sidebar instead of scrolling through one long list
- Start from 6 editable layouts: three-lane competitive, two-site skeleton, warehouse arena, open courtyard, vertical blockout, and aim-training lanes
- Browse 24 editable brush prefabs for openings, vents, stairs, tactical cover, crates, columns, catwalks, ramps, ladders, bridges, sniper nests, market stalls, and bombsite layouts
- Capture selections in Custom Prefab Studio with generated miniatures, categories, tags, pivot choice, rotation/mirroring, editing, and JSON import/export
- Browse 60 materials grouped into 13 categories, with real miniature previews, source badges, search, and locally saved favorites
- Drag in PNG, JPG, WebP, or GIF images to create new compile-ready GoldSrc materials, with local category and name suggestions
- Analyze CT/T timings to bombsites and flag direct spawn-to-objective sightlines
- Edit polygons by dragging numbered corners, with automatic GoldSrc convexity validation
- Convert rectangular rooms and solids to polygons, then drag either corner handles or whole edge handles
- Draw compile-safe cylinders, solid wedges, grouped three-brush archways, and sloped roof brushes
- Pan large plans with the **Hand / Pan** tool, middle-mouse drag, or temporary **Space + drag**
- Draw narrow corridor spaces
- Keep **Smart links** enabled to cut centered openings automatically when rectangular rooms or corridors touch
- Cut door openings where rooms and corridors meet
- Place doors and windows on straight or diagonal polygon walls, then adjust their physical opening width and height
- Turn an opening into a textured sliding door, use it with `E` in Walkthrough, and export it as `func_door`
- Add raised windows with adjustable sill/opening height; choose open, unbreakable, or breakable glass
- Live isometric preview with wheel/button zoom, Hand/Shift/middle/right-drag pan, rotation, and Fit reset
- Resize, rotate, and change height with visible transform handles in the plan and Orbit preview
- Click visible rooms, structures, markers, doors, and windows directly in the Orbit preview to select them
- First-person WASD walkthrough preview with collision
- Place solid crates and draw directional stairs or ramps
- Drag solid interior walls, cover blocks, and columns with adjustable dimensions, height, and material
- Draw elevated walkable platforms and connect them with directional ladders
- Create grouped landings or upper-floor openings automatically when placing stairs, ramps, and ladders
- Set wall height, ramp rise/steepness, and stair total rise/step count with GoldSrc-unit guidance
- Rotate or reverse structures and duplicate/copy/paste selected map elements
- Shift-click or Alt-drag to select several objects, then group, ungroup, lock, hide, transform, copy, or delete them together
- Choose 16/32/64/128-unit grid snapping, optionally snap to nearby object corners/edges/centers, and measure distance plus angle with the Ruler
- Use the adaptive grid to reveal finer sub-grid lines while zoomed in and align centered placement previews to nearby geometry
- Choose beginner-friendly wall and structure materials from real CS/Half-Life WAD textures
- Choose separate wall, floor, and ceiling materials for each room
- Assign individual north/east/south/west wall materials and adjust texture offset, rotation, and scale per surface
- Sample a material with the eyedropper and paint it onto other room or structure surfaces
- See clickable texture miniatures directly beside the wall, floor, and ceiling selectors
- Switch a room between a visible textured roof and an open-sky preview with a compiler-safe SKY seal
- Build directly on an optional map-wide flat ground plane with adjustable size, margin, and material
- Choose an installed CS 1.6 sky theme and matching outdoor sunlight from the Environment panel
- Place colored point lights and adjust their height and brightness; unlit rooms keep automatic fallback lights
- See a real CC0/original miniature before applying custom materials; stock
  game material names use original procedural placeholders
- Place CT spawns, T spawns, and bombsites
- Place hostages, rescue zones, buttons, damage triggers, teleporters, decals, ambient sounds, water volumes, and breakable brushes
- Set the facing direction of CT/T spawns and draw team-specific buy zones
- Select, move, resize, and delete map elements
- Undo and redo
- Autosave in the browser
- Beginner tutorial and map-readiness checklist
- Export editable GoldSrc `.map` source
- Guided first-run Windows setup, quality profiles, live build stage, cancellation, and compiler log
- Run a compile preflight that identifies invalid geometry, unsafe clearances, disconnected openings, overlapping solids, entity limits, and incomplete gameplay setups
- Automatic BSP installation and CS 1.6 launch through the companion
- Automatic `_preview_N` BSP names when CS 1.6 is holding the previous build open

## Polygon and shape editor

Choose **Polygon room** (`N`) and click each corner on the plan. Click the first corner again or press **Enter** to close the room; **Backspace** removes the newest draft corner and **Escape** cancels. Triangle and Octagon tools create safe presets by dragging a bounding box.

Select a polygon room, polygon platform, or polygon floor and choose **Edit corners**. Drag numbered handles to reshape it or select a handle and choose **Remove corner**. Blockout rejects duplicate, flat, concave, undersized, or overly complex polygons before they can reach the compiler. This first shape-editor pass intentionally supports convex polygons up to 16 corners because every GoldSrc world brush must be convex.

Rectangular rooms, walls, platforms, floor slabs, and cylinders can also enter corner-edit mode. Small square handles between the numbered corners move a complete edge along its normal, which makes widening a lane or shifting one wall much faster than editing two corners separately.

The Geometry section also includes **Cylinder**, **Wedge**, **Archway**, and **Sloped roof**. Cylinders use a compile-safe twelve-sided footprint. Archways are created as a grouped pair of supports plus a lintel, so the opening stays physical and editable. Wedges and sloped roofs use the same dependable stepped GoldSrc export strategy as ramps.

## Selection, snapping, and material workflow

- Click objects in either the top-down plan or Orbit preview. **Shift-click** adds or removes objects from the current selection.
- The plan selector uses the exact cursor position instead of treating a complete 64-unit cell as clicked. Repeated clicks at one position cycle through overlapping structures, zones, and rooms.
- Hold **Alt** and drag on the plan to draw a selection box. Hold Shift too when the box should add to the existing selection.
- Use **Group** or `Ctrl+G` to keep objects together; `Ctrl+Shift+G` ungroups them. Locked objects cannot be moved or painted. Hidden objects remain in the project and return with **Show all**.
- Choose a snap size above the plan. **Objects** adds magnetic alignment to nearby corners, edges, and centers; turn it off when only grid precision is wanted.
- **Adaptive** refines the preferred snap to 32 or 16 units when zoom and nearby fractional geometry require it. Its visible sub-grid and placement footprint show exactly where the object will land.
- Rectangle dimensions now measure the exact distance between their start and end grid lines; dragging from line 4 to line 8 creates four squares, not five.
- Choose **Ruler** or press `U`, then drag between two points. The pinned guide reports GoldSrc distance, X/Y change, and angle without blocking later editing.
- In the material alignment panel, choose the whole object, room floor, ceiling, or an individual wall. Use **Repeat / tile** for normal building materials or **Fit image once** to stretch one complete image across the face; offsets, rotation, and manual tile scales are shown in Orbit and written to the exported `.map` faces.
- Choose **Eyedropper**, click a room or structure, then click other surfaces to paint the sampled material.

## Floor and elevation workflow

Every room already owns a sealed floor. Select the room and change **Base floor elevation** when the entire space should sit higher or lower; its contained structures move by the same amount.

Use **Floor slab** (`B`) to drag a rectangular insert, or **Polygon floor** (`M`) to click a custom convex outline. Select the slab to set its absolute walkable **Floor elevation**, thickness, and material. A new slab starts 16 GoldSrc units above the host room and is immediately walkable. Use stairs, ramps, or ladders for larger changes in level.

Both slab types appear in the top-down plan, Orbit preview, and Walkthrough collision. They export as ordinary solid GoldSrc brushes; the polygon variant uses the same compile-safe convex validation as polygon rooms.

## Smart connections

**Smart links** is enabled by default above the top-down plan. When two rectangular rooms or corridors touch on the same elevation, Blockout cuts one centered, compile-safe opening along their shared wall. The same check runs after drawing, moving, or resizing a room. Existing doors and windows are preserved, and the switch can be disabled whenever a connection should remain fully manual.

Stairs, ramps, and ladders also receive a destination assist. Blockout creates a grouped landing when the connector would otherwise end in open space, or cuts a grouped floor opening when it reaches a rectangular upper story. Ladder exits recognize the normal 32-unit GoldSrc reach below an upper floor. Undo removes the complete placement in one step, while ungrouping keeps every generated brush independently editable.

## Layers and vertical editing

Use the elevation selector above the plan to choose **All levels** or one physical Z height. **Ghost others** leaves other rooms as faint outlines; turn it off to focus completely. The **All Z / Z ...** button above Orbit isolates that same level in the 3D preview. Selected rooms and structures expose **Z -64** and **Z +64** actions.

Rooms drawn while a level is selected inherit that elevation. Large vertical transitions should still be connected with stairs, ramps, or ladders so Walkthrough and the compiled map remain playable.

Every project also has named organization layers. Open **Production > Outliner** to add, rename, recolor, hide, lock, delete, and filter layers. Assign the current single or multi-selection from the **Layer** field in Selection. Hidden layers disappear from the plan and Orbit preview; locked layers remain visible but cannot be moved, resized, painted, or deleted. Deleting a layer safely returns its objects to **Default**.

Choose **Elevation** in the top bar for a true side-on slice through the map. Switch between west-to-east and north-to-south views, move the slice slider, and click a visible profile to select it. The selected object's physical base and top can be edited numerically while the panel reports its total height and remaining ceiling clearance.

Open **Production** and choose **Levels** to create named stories, isolate a story, or duplicate a complete level above its tallest room. Use **Floor opening** inside a rectangular upper room to cut a stairwell, ladder shaft, drop, or elevator shaft. Export cuts both the upper floor and the matching lower-room ceiling, creating a genuinely connected GoldSrc volume rather than a visual-only opening.

Preflight rejects vertically overlapping rooms, openings without a matching lower landing, sealed gaps between stories, unsupported polygon shaft ceilings, stairs/ramps/ladders without a top landing, and elevators without a destination landing. A floor opening around an elevator is recognized as a valid shaft. The Production workspace also provides a searchable outliner, light-coverage review, recorded Walkthrough routes, named local versions, project JSON import/export, and portable MAP packages.

## Transform handles

Select a room or structure in the plan to reveal four resize handles, a rotation handle, and a vertical-height handle. Drag a corner to resize, drag the circular handle to rotate, or drag the diamond handle to change the object's top height. Orbit also provides a vertical height handle for adjusting geometry while reading it in 3D. Each completed drag creates one undo step.

The **Precision transform** panel accepts exact X, Y, Z, width, depth, and height values in GoldSrc units. Multi-selection exposes edge and center alignment, horizontal or vertical distribution, equal width/depth/size, and world-origin centering. Exact width or depth scales the complete selection as one layout, while equal-size commands match the primary selected object.

## GoldSrc Brush Studio

Select a room, wall, platform, floor, crate, or compatible brush and choose **Brush Studio**. Apply rectangle, triangle, trapezoid, hexagon, octagon, or 12-sided round presets; bevel corners; split rectangular brushes; or extrude one side by an exact GoldSrc-unit distance. Every result remains normal editable geometry and creates one Undo step.

The Studio can mirror a complete selection or create up to 32 editable array copies with exact X/Y spacing. Rooms expose an 8–64 unit shell-thickness control; Blockout rooms are already hollow playable spaces, so this changes their compiled wall, floor, and roof thickness without constructing an overlapping inner solid.

Brush Studio reports convexity, corner-count, minimum-thickness, and lock problems before export. Polygon brushes remain limited to 16 plan corners. Existing corner editing adds vertex clipping, edge extrusion, inset, and outset operations for more detailed manual work.

For a selected structure, the material **Surface** menu now supports top, bottom, cardinal, or numbered polygon side faces. Face-specific textures and UV mapping appear in Orbit and are written to the corresponding MAP brush planes.

## Compile preflight

Choose **Preflight** before building. Blockout checks for invalid or non-convex polygons, low player clearance, structures crossing ceilings or leaving playable space, unsafe stairs and ramps, invalid multi-level connections, disconnected openings, overlapping solids, unmatched teleporter targets, missing ambient WAV names, excessive entity counts, large coordinates, and invalid exported numbers. Click an issue to select its object on the plan.

Blocking errors prevent **Build & Test** from launching the compiler. Warnings remain buildable but identify geometry or gameplay that should be reviewed in Walkthrough.

## Gameplay entities and triggers

The Gameplay section includes hostages and rescue zones for hostage maps, usable buttons, damage volumes, paired teleporters and destinations, decals, ambient sounds, water volumes, and breakable brushes. Select an entity after placement to edit keys such as target name, sound path, volume, damage, decal, or teleporter destination. These export to their standard GoldSrc entity classes and remain editable in the Blockout project.

## Polygon walls and prefabs

Choose **Polygon wall**, click a convex footprint, and close it with the first corner or Enter. Polygon walls and columns support numbered corner editing, collision, materials, and ordinary convex GoldSrc brush export.

Open **Prefab library** and search or filter 24 beginner-ready recipes. The set includes doorway frames, vents, stair flights, cover groups, crate formations, columns, angled combat lanes, bombsite cover, catwalks, bridges, sniper nests, market stalls, ramps, ladders, and a two-level stair tower. Hold **Ctrl** or `C` to crouch through vents in Walkthrough. Every prefab is made from normal editable brushes rather than a locked model.

### Custom Prefab Studio

Select one or more rooms, brushes, triggers, or entities and choose **Save prefab** in Selection. The Studio generates a top-down miniature and lets you name, categorize, tag, describe, and choose a center or corner placement pivot. Personal prefabs are saved locally in the browser and appear before the built-in recipes under **My prefabs**.

Before placing a personal prefab, use the Prefab Library controls to rotate it in 90-degree steps or mirror it. Every placement receives fresh object, group, room-reference, and logic-target identifiers, so the result remains editable and does not accidentally control the original. Use **Export library** and **Import JSON** to share or back up the personal collection. Doors and windows should be captured together with their connected room.

## Layout library

Choose **Layouts** in the top bar to start from one of 6 editable blockouts. Search or filter the library, then load a three-lane competitive map, two-site skeleton, warehouse arena, open courtyard, vertical blockout, or aim-training layout. Loading a layout replaces the current canvas after confirmation; every generated room, opening, spawn, bombsite, floor, and prefab remains editable.

## Texture library

Select a room or structure and choose **Browse texture library**. Search by friendly name or WAD code, browse sticky category groups for architecture, concrete, brick, stone, ground, nature, organic, fabric, plaster, floor, metal, wood, and Sunburst materials, and mark favorites with the star. Each card displays the real texture miniature plus its stock, original, or CC0 source badge. For rooms, the target menu applies the chosen texture to walls, floor, or ceiling.

The library includes 43 downloaded seamless CC0 materials, 7 procedural
placeholders for game-supplied material names, and the 10-texture original
Sunburst pack, for 60 choices total. CC0 source URLs, authors, categories, and
license are recorded in `textures/asset-manifest.base.json` and summarized in
`textures/ASSET_SOURCES.md`. Local imports are written to the ignored mutable
`asset-manifest.json`, so personal images cannot accidentally enter a commit.

### Texture Alchemist

Open **Browse texture library**, then drop a PNG, JPG, WebP, or GIF photograph into **Texture Alchemist**. The visual studio provides cover/fit/stretch cropping, 90-degree rotation, zoom and crop positioning, brightness, contrast, and saturation correction. **Blend opposite edges** turns the photograph into a continuous surface, while the live 3×3 preview makes remaining seams visible before installation. The optional palette preview simulates the fixed 256-color palette used by Blockout's GoldSrc WAD builder.

Blockout analyzes the filename, colors, and visual variation locally and suggests a display name, GoldSrc code, and category. It can create an atomic four-texture family: Base, Dark, Light, and Weathered. The paired Windows companion validates every 256×256 PNG, stores all sources, generates miniatures and mipmaps, and rebuilds `sunburst.wad` once. If any family member, WAD build, or validation step fails, the complete family, manifest, previews, and WAD are rolled back together.

Imported cards carry an **IMPORTED** badge and default to **Fit image once** when applied to a room or structure, preventing poster-like images from repeating across the face. Seamless Alchemist surfaces can instead use **Repeat / tile** for walls, floors, and terrain.

An imported card also has a red × delete control. Deletion is limited to `USR_` user materials; stock, CC0, and original built-in assets stay protected. Blockout refuses to delete an imported texture while the current map still uses it. Once those surfaces use another material, deletion removes the source and miniature, rebuilds the WAD, validates it, and rolls back automatically if anything fails.

The current classifier runs offline and does not upload the image. It is a lightweight visual suggestion system rather than a cloud vision model, so ambiguous artwork may need its category or label corrected before installation.

## Ground and sky environment

Choose **Environment** in the top bar to enable one continuous terrain plane beneath and around the layout. Set its minimum size and margin, use the material dropdown, or click its miniature / **Browse all ground textures** to choose from the complete 60-material library. Choose whether newly drawn rooms default to open sky, or convert every existing room to open sky at once. The available sky names are verified against the CS 1.6/Half-Life installation and include desert, morning, dusk, night, forest, city, storm, snow, dramatic cloud, and space themes.

The terrain is a genuine buildable surface, not decoration. Crates, walls, polygon walls, columns, stairs, ramps, floor slabs, platforms, ladders, lights, gameplay markers, buy zones, and prefabs can be placed directly on it—even before the first room exists. A ground-only outdoor map counts as a playable base in the readiness checklist and can be exported or compiled normally.

Select a room to expose **Roof / open sky** in the right-hand Selection panel. Check **Solid roof / ceiling** to build a physical textured ceiling; uncheck it to show the selected environment sky. The ceiling texture miniature only appears while the solid roof is enabled.

Orbit draws room floors at their true base elevation and shows the surrounding terrain, so layouts read as architecture built on a site instead of solid blocks floating above it. Export creates a physical ground brush plus a sealed SKY perimeter and roof, writes the selected `skyname` to `worldspawn`, and adds matching environment light. This makes the outdoor space compiler-safe while preserving the open-sky appearance in CS 1.6.

## Competitive analysis

Choose **Analyze** in the top bar. Blockout estimates shortest CT/T routes to each bombsite at 250 GoldSrc units per second using current openings, solid cover, floors, stairs, and ramps. Dashed team-colored routes appear on the plan; red lines mark direct spawn-to-site sightlines that may need cover or a route bend. These are blockout estimates, so final timings should still be tested in CS 1.6.

The companion now embeds and validates only the custom WAD textures referenced by the current map. Stock-only maps no longer fail merely because the optional Sunburst WAD is installed, while maps using one or more custom materials still receive embedded texture-pixel validation.

## Compiler setup

The public repository and tester ZIP do not redistribute compiler executables.
`Setup Blockout.cmd` downloads SDHLT v1.2.0 from its official GitHub release and
verifies the archive plus every required 64-bit executable before installation.
The exact source URL, hashes, signature status, upstream license, and readme are
preserved under `tools/`.

Blockout can also use another trusted GoldSrc VHLT/ZHLT tool package. Either:

- Put `hlcsg`, `hlbsp`, `hlvis`, and `hlrad` executables in the `tools` folder; or
- Open **Build & Test** and enter the folder that already contains those tools.

Standard filenames and `_x64`/`_x86` variants are supported. Build & Test now reports five independent readiness checks: CS 1.6, all four compilers, `cstrike.wad` plus `halflife.wad`, the writable `cstrike/maps` destination, and editor preflight. Choose whether to launch CS 1.6 after compilation or compile and install without launching it.

Companion 1.6 clears stale compiler outputs before each build so an older BSP cannot be mistaken for a successful result. It provides a verified in-app SDHLT installer, Draft/Playtest/Final profiles, live stage and elapsed-time status, safe cancellation, clickable coordinate diagnostics, origin-locked hosted pairing, guarded Texture Alchemist family import/deletion, and atomic WAD rebuilds while remaining loopback-only. Missing stock/custom WADs, locked build artifacts, invalid custom mipmaps, incomplete compiler folders, and unwritable destinations stop early with specific recovery instructions. The complete compiler log is retained in the Build panel after a failed stage. If CS 1.6 is holding the requested BSP open, Blockout automatically installs the new build as the next available `_preview_N` map instead.

## Verified real compiles

The generated one-room `blockout_compile_test` map was compiled with the included SDHLT tools on 2026-07-17. All four stages completed, producing a 16,656-byte GoldSrc BSP version 30 with visibility and lighting data. It was installed into the detected CS 1.6 `cstrike/maps` folder and launched for a manual playtest.

A second `blockout_structures_test` map containing a crate, stairs, a ramp, and several material choices was compiled through all four stages on 2026-07-17. It produced a 36,996-byte BSP with no leaks, invalid brushes, outside-world errors, or compiler warnings.

The `blockout_floor_editor_test` map containing a raised room, rectangular floor slab, and five-corner polygon floor was compiled through all four stages on 2026-07-18. It produced a lit BSP with no leaks, illegal brushes, or missing textures.

The `blockout_advanced_editor_test` map containing elevation layers, a four-corner polygon wall, an octagonal column, a wide doorway, and a safe stair prefab was compiled through all four stages on 2026-07-18. It produced a lit BSP with no leaks, illegal brushes, or missing textures.

The `blockout_asset_library_test` map uses downloaded `BO_BRICK01`, `BO_PAVEMENT`, `BO_CONCRETE`, and `BO_STUCCO` materials together with a ramp landing, half cover, and column trio. It compiled through all four stages on 2026-07-18 into a 425,344-byte BSP; all selected custom pixels were embedded, and the finished map requires no custom WAD at runtime.

The `blockout_library_expansion_test` map combines the expanded prefab library with a downloaded marble material. It compiled through all four stages on 2026-07-18 into a 614,737-byte BSP with all custom pixels embedded and no runtime WAD dependency.

The generated `blockout_three_lane_layout_test` competitive layout compiled through all four stages on 2026-07-18 into a 570,954-byte BSP. It includes editable rooms, routes, cover, objectives, spawns, and embedded materials, with no runtime WAD dependency.

The `blockout_environment_test` map uses a continuous green-ground terrain brush, open SKY shell, selectable `night` sky, and the new room-surface miniatures. It compiled through all four stages on 2026-07-18 into a 573,242-byte BSP with no leaks or runtime WAD dependency.

The `blockout_ground_only_test` map was built without any room shell: its crate, wall, prefab cover, team spawns, bombsite, and buy zone all sit directly on a map-wide floor-tile terrain plane. It compiled through all four stages on 2026-07-18 into a 252,502-byte BSP with a sealed morning SKY shell and embedded custom ground pixels.

The `production_mapping` regression map exercises diagonal polygon-wall openings, plan and Orbit transform handles, side-elevation editing, compile preflight, and the expanded gameplay entity set. On 2026-07-18 it compiled through SDHLCSG, SDHLBSP, SDHLVIS, and SDHLRAD into a 51,384-byte lit BSP with eight portal leaves, no leak, and no compiler errors.

The `blockout_multilevel_build_test` regression map contains two stacked 256-unit stories connected by a physical stairwell, ladder shaft, and elevator shaft. On 2026-07-19 it passed editor preflight with no blocking errors and compiled through all four SDHLT stages into a 107,217-byte lit BSP with 47 leaves, four models, full visibility data, and no leak or compiler errors. It was installed into the detected CS 1.6 maps folder without launching the game.

## Export notes

The prototype exports editable `.map` source geometry. Import it into a GoldSrc-compatible editor such as J.A.C.K. or Hammer 3.x, check the texture paths, and compile it with a compatible GoldSrc toolchain to produce a `.bsp`.

When map-wide ground is disabled, open-sky rooms are capped directly above the room with GoldSrc's `SKY` material. When it is enabled, Blockout also builds a sealed outer SKY perimeter and roof around the terrain. A truly missing ceiling or outer seal would leak into the void and is therefore not exported.

This is an early blockout tool. Always inspect and compile-test exported geometry before distributing a map.

## Door workflow

1. Draw two rooms, or a room and a corridor, so their edges touch.
2. Choose **Door opening** or press `D`.
3. Click near the shared edge. The opening appears as a striped lime line.
4. Select **Walk** above the preview, focus the preview, and use `WASD` plus the arrow keys.

Select a placed opening to switch it between **Open passage** and **Sliding door**. Sliding doors expose material and speed controls; approach one in Walkthrough and press `E` to open or close it.

The exporter splits both touching walls around a 64-unit-wide, 128-unit-high opening.

## Window workflow

1. Draw two spaces with a shared wall.
2. Choose **Window** or press `X`, then click a free grid section on the shared wall.
3. Choose **Select** and click the cyan window line to adjust its sill height, opening height, behavior, and breakable-glass health.
4. In Walkthrough, approach breakable glass and press `E` to break it.

Breakable glass exports as a translucent GoldSrc `func_breakable`; unbreakable glass exports as `func_wall`. Open frames keep the raised wall opening but do not create a glass entity.

## Structure workflow

1. Draw a room first.
2. Choose **Crate** and click a free grid square, or choose **Stairs**/**Ramp** and drag a rectangle.
3. For stairs and ramps, the arrow shows the uphill direction. Drag the opposite way to reverse it.
4. Choose **Select**, click the structure, then change its width, depth, height, or material in the Selection panel.

Ramps export as small 16-unit steps for reliable GoldSrc collision and compile safety. They look and play like a smooth blockout ramp at CS 1.6 scale.

## Solid wall workflow

1. Draw a room first.
2. Choose **Solid wall** or press `W` outside Walkthrough mode.
3. Drag a rectangle entirely inside the room. A full-height divider is created using that room's wall material.
4. Choose **Select** to resize, rotate, duplicate, or retexture it. Lower its height to make cover; use a 1×1 footprint to make a column.

Solid walls are physical in Orbit and Walkthrough, block the player, and export as ordinary sealed GoldSrc world brushes.

## Vertical gameplay workflow

1. Choose **Platform** or press `H`, then drag the elevated area inside a room.
2. Select it to set the platform height and material.
3. Place stairs or a ramp leading to it, or choose **Ladder**/press `G` and click the approach cell.
4. Select the ladder to match its height to the platform and choose which edge it faces.

Walkthrough simulates climbing when the player enters a ladder cell, then preserves that height on a matching platform. Exported ladders use GoldSrc `func_ladder`; platforms are ordinary solid brushes.

## Buy zones and spawn facing

- Choose **CT buy zone** or **T buy zone**, then drag the allowed purchase area inside a room.
- Select a CT or T spawn and choose North, East, South, or West under **Facing direction**.

The exporter writes team-specific `func_buyzone` brushes and saves each spawn direction in its GoldSrc `angles` key.

## Original custom material pack

The template now uses ten original 256×256 materials derived from the supplied Sunburst character sheet:

- `SUN_FELT` — warm golden felt for the central hub and bombsite platforms
- `SUN_KNIT` — deep red cable knit for the T side, Objective A, and Red Hall
- `SUN_RIBBON` — teal, purple, red, orange, and yellow fabric bands for Ribbon Hall and CT/B routes
- `SUN_FACE` — the centered knitted Sun emblem on the raised hub platform
- `SUN_WALL` — pale felt-plaster with subtle embossed suns
- `SUN_METAL` — aged teal panels with gold seams and orange fasteners
- `SUN_TILE` — warm ochre, amber, orange, and red walkable tile
- `SUN_FLOOR` — dark burgundy woven flooring for neutral areas and tunnels
- `SUN_CRATE` — a red-and-gold reinforced Sun supply crate
- `SUN_SUPPLY` — a teal-and-purple alternate crate with orange and yellow straps

Browser previews are under `textures/previews`. The repository's clean
`assets/sunburst-base.wad` contains 53 indexed original/CC0 materials; the
companion creates ignored mutable runtime copies before accepting user imports.
**Build & Test** temporarily adds this WAD during compilation, embeds selected
custom pixels, and removes its worldspawn reference from the finished BSP.
Players do not need a separate custom WAD installation. Engine-special
materials such as `SKY`, glass, triggers, and clip textures remain stock so
their GoldSrc behavior is preserved.

## License and redistribution

Blockout's original source is available under the [MIT License](LICENSE).
Third-party compiler terms, CC0 material provenance, trademark notes, and the
deliberate exclusion of Valve-authored assets are documented in
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
