# Contributing

Blockout is a beginner-first CS 1.6 map blockout tool. Contributions should
preserve three principles:

1. A new mapper should understand the feature without knowing Hammer jargon.
2. Exported geometry must remain valid for stock Counter-Strike 1.6.
3. Local compilation must stay explicit, loopback-only, and safe.

## Development

Install Node.js 20+ and pnpm, then run:

```powershell
pnpm install
pnpm run dev
```

Static checks:

```powershell
node --check app.js
python -m py_compile blockout_companion.py
pnpm run check
```

Create a clean Windows tester ZIP:

```powershell
pnpm run package:windows
```

Do not commit `blockout.config.json`, generated maps/BSPs, compiler executables,
Steam paths, `USR_` texture imports, or mutable `asset-manifest.json`.

## Pull requests

- Keep changes focused.
- Describe the beginner-facing behavior and GoldSrc export impact.
- Test Orbit, Walkthrough, project reload, `.map` export, and preflight when
  geometry changes.
- Include a compile log for compiler/export changes.
- Use original, compatible, or clearly licensed assets only.
