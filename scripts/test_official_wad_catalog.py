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


def write_bsp(path, textures):
    path.parent.mkdir(parents=True, exist_ok=True)
    lumps = []
    for name, seed in textures:
        value = bytearray(miptex(name, seed))
        while len(value) % 4:
            value.append(0)
        lumps.append(bytes(value))
    cursor = 4 + len(lumps) * 4
    offsets = []
    for lump in lumps:
        offsets.append(cursor)
        cursor += len(lump)
    texture_lump = struct.pack("<i", len(lumps)) + b"".join(struct.pack("<i", offset) for offset in offsets) + b"".join(lumps)
    header = bytearray(124)
    struct.pack_into("<i", header, 0, 30)
    struct.pack_into("<ii", header, 4 + 2 * 8, 124, len(texture_lump))
    path.write_bytes(bytes(header) + texture_lump)


def main():
    long_blueprint_name = "PixVerse_Image_Effect_prompt_Using_the_i"
    safe_blueprint_name = COMPANION.safe_map_name(long_blueprint_name)
    assert safe_blueprint_name == "pixverse_image_effect_prompt_us"
    assert len(safe_blueprint_name) <= COMPANION.GOLDSRC_MAP_NAME_MAX
    preview_name = COMPANION.preview_map_name(safe_blueprint_name, 27)
    assert preview_name.endswith("_preview_27")
    assert len(preview_name) <= COMPANION.GOLDSRC_MAP_NAME_MAX

    with tempfile.TemporaryDirectory(prefix="blockout-official-wad-test-") as folder:
        game = Path(folder)
        write_wad(game / "cstrike" / "cstrike.wad", [("CS_WALL", 1), ("SHARED", 2)])
        write_wad(game / "cstrike" / "cs_dust.wad", [("DUST_FLOOR", 3)])
        write_wad(game / "valve" / "halflife.wad", [("HALF_METAL", 4), ("SHARED", 5)])
        write_bsp(game / "cstrike" / "maps" / "de_inferno.bsp", [("INFERNO_WALL", 6), ("MAP_SHARED", 7)])
        write_bsp(game / "cstrike" / "maps" / "de_dust2.bsp", [("DUST_EMBED", 8), ("MAP_SHARED", 9)])

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

        map_catalog = COMPANION.map_texture_catalog(game)
        map_names = {item["name"] for item in map_catalog["textures"]}
        assert map_catalog["mapCount"] == 2
        assert map_names == {"INFERNO_WALL", "MAP_SHARED", "DUST_EMBED"}, map_names
        shared = next(item for item in map_catalog["textures"] if item["name"] == "MAP_SHARED")
        assert set(shared["mapIds"]) == {"de_inferno", "de_dust2"}
        map_png = COMPANION.map_texture_png(game, "de_inferno", "INFERNO_WALL")
        assert map_png.startswith(b"\x89PNG\r\n\x1a\n")

        embedded_map = map_text.replace("DUST_FLOOR", "INFERNO_WALL")
        temporary_wad = game / "generated-map-textures.wad"
        embedded_names = COMPANION.build_embedded_map_texture_wad(game, embedded_map, temporary_wad)
        assert embedded_names == {"INFERNO_WALL"}
        COMPANION.validate_custom_wad(temporary_wad, require_power_of_two=False)
        replaced_embedded = COMPANION.replace_wad_paths(
            embedded_map, game, extra_wads=[temporary_wad]
        )
        assert str(temporary_wad) in replaced_embedded
        try:
            COMPANION.map_texture_png(game, "../secret", "INFERNO_WALL")
        except COMPANION.BuildError:
            pass
        else:
            raise AssertionError("An arbitrary BSP path was accepted.")

    print("Companion tests passed: GoldSrc-safe map names, WAD/BSP allowlists, dedupe, previews, classification, and compile embedding.")


if __name__ == "__main__":
    main()
