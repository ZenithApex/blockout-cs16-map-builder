# Blockout texture sources

The downloaded material pack is deliberately limited to assets published under
CC0. The exact download URL, author, library category, and in-game texture name
for every public file are stored in `asset-manifest.base.json`. The ignored
`asset-manifest.json` is a mutable local copy that may contain user imports.

The installed pack contains 43 seamless surfaces from these OpenGameArt pages:

- [Seamless Brick/Concrete Textures](https://opengameart.org/content/seamless-brickconcrete-textures) by BMacZero — CC0.
- [Seamless Brick/Concrete Textures 2](https://opengameart.org/content/seamless-brickconcrete-textures-2) by BMacZero — CC0.
- [Seamless Brick Textures](https://opengameart.org/content/seamless-brick-textures-0) by GGBotNet — CC0.
- [Realistic Seamless Wood Texture](https://opengameart.org/content/realistic-seamless-wood-texture) by SpringySpringo — CC0.
- [Seamless Wood Textures](https://opengameart.org/content/seamless-wood-textures-0) by GGBotNet — CC0.
- [Rust (semi seamless)](https://opengameart.org/content/rust-semi-seamless) by Pyrano Studios — dual-published with CC0 available.
- [Simple Textures](https://opengameart.org/content/simple-textures) by oceancucumber — CC0.
- [Concrete Textures Seamless 1K](https://opengameart.org/content/concrete-textures-seamless-1k) by YCbCr — CC0.
- [Rock Seamless Textures](https://opengameart.org/content/rock-seamless-textures) by kavin tee — CC0.
- [Floor Tile Texture](https://opengameart.org/content/floor-tile-texture) by Ravaen — CC0.
- [Grass/Ground Texture](https://opengameart.org/content/grassground-texture) by VladimirP — CC0.

`tools/import_cc0_textures.py` converts the downloads to PNG source files.
`tools/build_sunburst_wad.js` then makes 256×256 indexed previews, mipmaps, and
the WAD3 records used by the compiler. The WAD is compile-only: selected custom
pixels are embedded in the BSP so players do not need a separate download.
