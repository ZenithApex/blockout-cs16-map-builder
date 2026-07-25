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

- Create, resize, rotate, duplicate, and delete rectangular and polygon rooms.
- Drag a room between grid lines four squares apart and confirm its displayed width is exactly 256 units.
- Enable **Adaptive**, zoom in, and confirm the visible/active snap refines to 32 or 16 units and the placement footprint matches the created object.
- Put a thin wall inside a buy zone, then click inside and outside the wall; repeated clicks should cycle wall, zone, and room without selecting the wall from elsewhere in its old 64-unit cell.
- With **Smart links** enabled, touch two same-level rectangular rooms and confirm one centered opening is created; disable it and confirm connections remain manual.
- Add doors, windows, stairs, ramps, ladders, platforms, and crates.
- Place a stair, ramp, or ladder without a destination and confirm it receives a grouped landing or valid upper-floor opening.
- Try Orbit and Walkthrough, including collisions and interactive doors.
- Change wall, floor, ceiling, ground, and sky materials.
- Save a project, reload the page, and confirm autosave recovery.
- Export `.map`, run preflight, compile, install, and launch the BSP.
- Try Draft, Playtest, and Final build profiles, then cancel one running build.
- If a compiler error reports a coordinate, click its diagnostic to focus the top-down plan.
- If Node.js is installed, import a 256×256 texture and compile a room using it.

## Reporting a problem

Use the GitHub bug-report form and attach:

- Windows and browser versions
- The exact action that failed
- Build-panel log text
- Exported project JSON when the problem is map-specific
- A screenshot when the issue is visual

Do not upload your Steam login, private filesystem contents, copyrighted WAD
archives, or unrelated personal files.
