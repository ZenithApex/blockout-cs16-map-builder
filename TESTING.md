# Testing Blockout

Thank you for trying the Blockout CS 1.6 Map Builder beta.

## Requirements

- Windows 10 or 11
- A legal Steam installation of Counter-Strike 1.6 / Half-Life
- Internet access during initial compiler setup
- Node.js 20 or newer only if you want to import custom texture images

Blockout does not include Counter-Strike, Half-Life, Valve textures, or Steam
credentials.

## First run

1. Extract the release ZIP to a normal writable folder.
2. Double-click `Blockout.exe` or `Start Blockout.cmd`.
3. In **Build & Test**, choose **Install verified SDHLT** if the compiler is missing.
4. Open `http://127.0.0.1:41716/` if the browser does not open automatically.
5. Create a small room, add one CT spawn and one T spawn, then select
   **Build & Test**.

The first-run guide downloads SDHLT v1.2.0 from its official GitHub release and verifies both
the archive and executable SHA-256 hashes before installation.

## Suggested test pass

- Open **More > Import map blueprint**, select the six `de_solstice` bundle images together, calibrate its measured width, and confirm all six role badges plus the semantic overlay appear before the current map changes.
- On a plan with legends or margins, confirm tracing stays on the main wall network. Compare Measured, Competitive, and Extra roomy scales and verify the overlay remains aligned.
- Generate a 5v5 setup and confirm all ten player starts have at least 35 units between them, clear surrounding walls/cover, and can leave both spawn rooms.
- Confirm a flat competitive import creates one playfield room rather than dozens of room shells, ignores decorative text/logo holes, keeps spawns and both sites in the largest reachable component, and exports merged boundary walls.
- Run `node scripts/compile-map-regression.mjs <generated.map>` with the companion active and confirm HLCSG, HLBSP, HLVIS, and HLRAD all succeed without launching the game.
- Toggle wall sensitivity and trace detail; confirm room/opening counts and confidence refresh. Enable color-band levels only on a plan that clearly encodes elevation.
- Create the blueprint map and verify five CT spawns, five T spawns, two buy zones, semantically anchored A/B objectives, detected cover, preserved internal wall islands, and the elevated access prop.
- With the companion connected, enable bundle materials and confirm twenty categorized `USR_` textures are installed in five batches, previewed, assigned, embedded during compilation, and retained in exported project metadata.
- Open **My prefabs** and confirm the prefab sheet created twelve editable Solstice prefabs. Export/import the project and confirm route, elevation, prefab, and visual-target references remain attached.
- Create, resize, rotate, duplicate, and delete rectangular and polygon rooms.
- Drag a room between grid lines four squares apart and confirm its displayed width is exactly 256 units.
- Enable **Adaptive**, zoom in, and confirm the visible/active snap refines to 32 or 16 units and the placement footprint matches the created object.
- Put a thin wall inside a buy zone, then click inside and outside the wall; repeated clicks should cycle wall, zone, and room without selecting the wall from elsewhere in its old 64-unit cell.
- With **Smart links** enabled, touch two same-level rectangular rooms and confirm one centered opening is created; disable it and confirm connections remain manual.
- Add doors, windows, stairs, ramps, ladders, platforms, and crates.
- Select a multi-piece structure, save it with Custom Prefab Studio, confirm its generated miniature, then place rotated and mirrored copies.
- Reload the editor and confirm **My prefabs** persists; export the personal library, delete a test prefab, then import the JSON again.
- Save and place a multi-level prefab and confirm its relative heights, groups, materials, room references, and logic targets remain independent.
- Multi-select three objects and test exact X/Y/Z and selection width/depth in the **Precision transform** panel.
- Test left/center/right and top/middle/bottom alignment, horizontal/vertical distribution, equal size, and **To origin**.
- In **Production > Outliner**, create and rename a layer, assign the selection, filter to it, then confirm hiding removes it from both plan and Orbit while locking prevents transforms.
- Open **Brush Studio** on a wall and test every convex preset, bevel, rectangular split, and directional extrusion.
- Mirror a multi-selection, then create a three-copy array and confirm every copy remains independently selectable and editable.
- Change a room shell to 32 units, export MAP, and confirm its wall/floor/roof brush thickness changes without filling the playable room.
- Apply different materials to a brush top and side face, then confirm both Orbit and exported MAP use the face-specific textures.
- Place a stair, ramp, or ladder without a destination and confirm it receives a grouped landing or valid upper-floor opening.
- Try Orbit and Walkthrough, including collisions and interactive doors.
- Change wall, floor, ceiling, ground, and sky materials.
- With the companion running, open the material library and confirm the Official Steam status reports the locally installed WAD and texture totals.
- Filter official materials by `cs_dust.wad`, `de_aztec.wad`, and `cs_office.wad`; verify their miniatures appear, apply one to a suitable surface, then compile and launch the map.
- Choose **De Inferno** under **Installed map BSPs**, apply an embedded-only texture such as `KEEP01`, compile it, and confirm the result has no missing-texture checkerboard.
- Install a community BSP such as Tuscan, restart the companion, and confirm it appears automatically under **Installed map BSPs** without copying its textures into the Blockout folder.
- Confirm the hosted/public package contains no Valve WAD or extracted official texture image; official previews must come only from the paired local companion.
- Save a project, reload the page, and confirm autosave recovery.
- Export `.map`, run preflight, compile, install, and launch the BSP.
- Import a blueprint with a title longer than 31 characters, build it, and confirm the shortened BSP launches instead of reporting `map not found`.
- Try Draft, Playtest, and Final build profiles, then cancel one running build.
- If a compiler error reports a coordinate, click its diagnostic to focus the top-down plan.
- If Node.js is installed, import a 256×256 texture and compile a room using it.
- Drop a non-square photograph into **Texture Alchemist** and verify the Source, GoldSrc output, and 3 × 3 tile previews.
- Verify Texture Alchemist requires at least one Wall/Floor/Tile/Ground/Ceiling/Props use and preserves every selected use after companion restart.
- Select a wall, floor, ceiling, ground plane, and crate; verify each material dropdown and Recommended browser view only offers suitable surface categories.
- Open **Project** and verify Save now, local versions, editable `.blockout.json` download/import, `.map` export, and portable package download.
- Import a downloaded project after making a visible edit and verify rooms, geometry, materials, entities, layers, and levels remain editable.
- Change crop, rotation, zoom, offsets, color corrections, and edge blend; every preview and the edge-mismatch score should update.
- Install Base, Dark, Light, and Weathered together and confirm all four cards appear after a single successful WAD rebuild.
- Force a duplicate family code and confirm no partial source, preview, manifest, or WAD change remains.
- Apply a generated texture to an individual brush face and confirm deletion is refused until every use is replaced.
- Switch through Start, Build, Game, Logic, and Assets; confirm unrelated groups disappear without changing the active tool.
- Toggle Beginner / All tools, search for a tool outside the current workspace, and use `Ctrl+K` to focus global tool search.
- Use several drawing tools and confirm recent-tool shortcuts appear and survive reload.
- Open **More** and confirm project, world, and review actions remain reachable.
- Switch the right column between Selection and Map guide; selecting an object should return to Selection.

## Reporting a problem

Use the GitHub bug-report form and attach:

- Windows and browser versions
- The exact action that failed
- Build-panel log text
- Exported project JSON when the problem is map-specific
- A screenshot when the issue is visual

Do not upload your Steam login, private filesystem contents, copyrighted WAD
archives, or unrelated personal files.
