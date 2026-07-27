import base64
import importlib.util
import json
import struct
import tempfile
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("blockout_companion_test", ROOT / "blockout_companion.py")
COMPANION = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(COMPANION)


def png_chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def solid_png(red, green, blue):
    width = height = 256
    rows = b"".join(b"\0" + bytes((red, green, blue)) * width for _ in range(height))
    return (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + png_chunk(b"IDAT", zlib.compress(rows))
        + png_chunk(b"IEND", b"")
    )


def encoded_png(red, green, blue):
    return "data:image/png;base64," + base64.b64encode(solid_png(red, green, blue)).decode("ascii")


with tempfile.TemporaryDirectory(prefix="blockout-alchemist-") as temporary:
    root = Path(temporary)
    (root / "textures" / "sources").mkdir(parents=True)
    (root / "textures" / "previews").mkdir(parents=True)
    manifest_path = root / "textures" / "asset-manifest.json"
    manifest_path.write_text(json.dumps({"pack": "test", "textures": []}), encoding="utf-8")
    wad_path = root / "sunburst.wad"
    wad_path.write_bytes(b"WAD-ORIGINAL")

    COMPANION.ROOT = root
    COMPANION.MANIFEST_FILE = manifest_path
    COMPANION.BASE_MANIFEST_FILE = manifest_path
    COMPANION.CUSTOM_WAD_FILE = wad_path
    COMPANION.CUSTOM_TEXTURE_NAMES = set()

    def successful_rebuild():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for item in manifest["textures"]:
            source = root / "textures" / "sources" / item["file"]
            (root / "textures" / "previews" / f"{item['name']}.png").write_bytes(source.read_bytes())
        wad_path.write_bytes(("WAD:" + ",".join(item["name"] for item in manifest["textures"])).encode("ascii"))
        return "Synthetic WAD rebuilt"

    COMPANION.rebuild_texture_wad = successful_rebuild
    COMPANION.validate_custom_wad = lambda path: path.read_bytes()

    payload = {
        "family": "USR_STONE",
        "textures": [
            {"name": "USR_STONE", "label": "Stone", "category": "stone", "uses": ["wall", "floor", "tile"], "variant": "base", "imageData": encoded_png(120, 110, 100)},
            {"name": "USR_STONE_D", "label": "Stone Dark", "category": "stone", "uses": ["wall", "floor", "tile"], "variant": "dark", "imageData": encoded_png(75, 68, 62)},
            {"name": "USR_STONE_L", "label": "Stone Light", "category": "stone", "uses": ["wall", "floor", "tile"], "variant": "light", "imageData": encoded_png(170, 160, 150)},
            {"name": "USR_STONE_W", "label": "Stone Weathered", "category": "stone", "uses": ["wall", "floor", "tile"], "variant": "weathered", "imageData": encoded_png(105, 95, 82)},
        ],
    }
    result = COMPANION.alchemize_textures(payload)
    assert len(result["textures"]) == 4
    assert all(item["alchemistFamily"] == "USR_STONE" for item in result["textures"])
    assert all(item["uses"] == ["wall", "floor", "tile"] for item in result["textures"])
    assert all((root / "textures" / "sources" / f"{item['name']}.png").is_file() for item in result["textures"])
    assert all((root / "textures" / "previews" / f"{item['name']}.png").is_file() for item in result["textures"])

    stable_manifest = manifest_path.read_bytes()
    stable_wad = wad_path.read_bytes()
    try:
        COMPANION.alchemize_textures(payload)
        raise AssertionError("Duplicate family installation unexpectedly succeeded")
    except COMPANION.BuildError:
        pass
    assert manifest_path.read_bytes() == stable_manifest
    assert wad_path.read_bytes() == stable_wad

    COMPANION.rebuild_texture_wad = lambda: (_ for _ in ()).throw(COMPANION.BuildError("Synthetic failure"))
    failing = {
        "family": "USR_FAIL",
        "textures": [{"name": "USR_FAIL", "label": "Failure", "category": "metal", "uses": ["props"], "variant": "base", "imageData": encoded_png(90, 95, 100)}],
    }
    try:
        COMPANION.alchemize_textures(failing)
        raise AssertionError("Failed WAD build unexpectedly succeeded")
    except COMPANION.BuildError:
        pass
    assert manifest_path.read_bytes() == stable_manifest
    assert wad_path.read_bytes() == stable_wad
    assert not (root / "textures" / "sources" / "USR_FAIL.png").exists()
    assert not (root / "textures" / "previews" / "USR_FAIL.png").exists()

print("Texture Alchemist companion regression passed: atomic family install and rollback verified")
