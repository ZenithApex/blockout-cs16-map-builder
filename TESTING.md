# Testing Blockout

Thank you for trying the Blockout CS 1.6 Map Builder beta.

## Requirements

- Windows 10 or 11
- A legal Steam installation of Counter-Strike 1.6 / Half-Life
- Python 3.8 or newer
- Internet access during initial compiler setup
- Node.js 20 or newer only if you want to import custom texture images

Blockout does not include Counter-Strike, Half-Life, Valve textures, or Steam
credentials.

## First run

1. Extract the release ZIP to a normal writable folder.
2. Double-click `Setup Blockout.cmd`.
3. Double-click `Start Blockout.cmd`.
4. Open `http://127.0.0.1:41716/` if the browser does not open automatically.
5. Create a small room, add one CT spawn and one T spawn, then select
   **Build & Test**.

Setup downloads SDHLT v1.2.0 from its official GitHub release and verifies both
the archive and executable SHA-256 hashes before installation.

## Suggested test pass

- Create, resize, rotate, duplicate, and delete rectangular and polygon rooms.
- Add doors, windows, stairs, ramps, ladders, platforms, and crates.
- Try Orbit and Walkthrough, including collisions and interactive doors.
- Change wall, floor, ceiling, ground, and sky materials.
- Save a project, reload the page, and confirm autosave recovery.
- Export `.map`, run preflight, compile, install, and launch the BSP.
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
