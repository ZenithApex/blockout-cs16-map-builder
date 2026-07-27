import importlib.util
import struct
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("blockout_companion", ROOT / "blockout_companion.py")
COMPANION = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(COMPANION)


def miptex(name, palette_seed):
    width = height = 16
    count = width * height
    offsets = (40, 40 + count, 40 + count + count // 4, 40 + count + count // 4 + count // 16)
    pixels = bytes((index + palette_seed) % 256 for index in range(count))
    mipmaps = pixels + pixels[:count // 4] + pixels[:count // 16] + pixels[:count // 64]
    palette = b"".join(bytes(((index + palette_seed) % 256, index, 255 - index)) for index in range(256))
    header = struct.pack("<16sII4I", name.encode("latin-1")[:15].ljust(16, b"\0"), width, height, *offsets)
    return header + mipmaps + struct.pack("<H", 256) + palette


def write_wad(path, textures):
    path.parent.mkdir(parents=True, exist_ok=True)
    lumps = [miptex(name, seed) for name, seed in textures]
    positions = []
    cursor = 12
    for lump in lumps:
        positions.append(cursor)
        cursor += len(lump)
    directory_offset = cursor
    directory = b"".join(
        struct.pack(
            "<iiiBBH16s",
            position,
            len(lump),
            len(lump),
            67,
            0,
            0,
            name.encode("latin-1")[:15].ljust(16, b"\0"),
        )
        for (name, _), lump, position in zip(textures, lumps, positions)
    )
    path.write_bytes(struct.pack("<4sii", b"WAD3", len(lumps), directory_offset) + b"".join(lumps) + directory)


def main():
    with tempfile.TemporaryDirectory(prefix="blockout-official-wad-test-") as folder:
        game = Path(folder)
        write_wad(game / "cstrike" / "cstrike.wad", [("CS_WALL", 1), ("SHARED", 2)])
        write_wad(game / "cstrike" / "cs_dust.wad", [("DUST_FLOOR", 3)])
        write_wad(game / "valve" / "halflife.wad", [("HALF_METAL", 4), ("SHARED", 5)])

        catalog = COMPANION.official_texture_catalog(game)
        names = {item["name"] for item in catalog["textures"]}
        assert catalog["wadCount"] == 3, catalog
        assert names == {"CS_WALL", "SHARED", "DUST_FLOOR", "HALF_METAL"}, names
        assert next(item for item in catalog["textures"] if item["name"] == "SHARED")["wadId"] == "cstrike/cstrike.wad"
        assert "floor" in next(item for item in catalog["textures"] if item["name"] == "DUST_FLOOR")["uses"]

        png = COMPANION.official_texture_png(game, "cstrike/cs_dust.wad", "DUST_FLOOR")
        assert png.startswith(b"\x89PNG\r\n\x1a\n")
        assert struct.unpack_from(">II", png, 16) == (16, 16)

        map_text = (
            '{\n"classname" "worldspawn"\n"wad" "cstrike.wad;halflife.wad"\n'
            "{\n( 0 0 0 ) ( 64 0 0 ) ( 64 64 0 ) DUST_FLOOR 0 0 0 1 1\n}\n}"
        )
        replaced = COMPANION.replace_wad_paths(map_text, game)
        wad_line = next(line for line in replaced.splitlines() if line.startswith('"wad"'))
        assert "cs_dust.wad" in wad_line
        assert "cstrike.wad" in wad_line and "halflife.wad" in wad_line

        try:
            COMPANION.official_texture_png(game, "../custom.wad", "DUST_FLOOR")
        except COMPANION.BuildError:
            pass
        else:
            raise AssertionError("An arbitrary WAD path was accepted.")

    print("Official WAD catalog tests passed: allowlist, dedupe, PNG preview, classification, and compile paths.")


if __name__ == "__main__":
    main()
