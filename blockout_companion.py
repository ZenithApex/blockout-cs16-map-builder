"""Local build companion for Blockout CS 1.6 Map Builder.

Serves the dependency-free editor on localhost and exposes a deliberately small
local API for configuring GoldSrc tools, compiling a map, installing its BSP,
and launching Counter-Strike 1.6 after an explicit button press.
"""

import argparse
import base64
import hashlib
import json
import os
import re
import secrets
import shutil
import struct
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
import webbrowser
import zipfile
import zlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


VERSION = "1.10.0"
HOST = "127.0.0.1"
PORT = 41716
ONLINE_ORIGINS = {
    "https://blockout-cs16-map-builder-2026.zenithapex.chatgpt.site",
}
if os.environ.get("BLOCKOUT_TEST_ORIGIN"):
    ONLINE_ORIGINS.add(os.environ["BLOCKOUT_TEST_ORIGIN"].rstrip("/"))
LOCAL_ORIGINS = {
    "http://127.0.0.1:41716",
    "http://localhost:41716",
}
PAIRING_SECRET = secrets.token_hex(4).upper()
ROOT = Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parent
CONFIG_FILE = ROOT / "blockout.config.json"
BUILD_ROOT = ROOT / "builds"
MANIFEST_FILE = ROOT / "textures" / "asset-manifest.json"
BASE_MANIFEST_FILE = ROOT / "textures" / "asset-manifest.base.json"
CUSTOM_WAD_FILE = ROOT / "sunburst.wad"
BASE_CUSTOM_WAD_FILE = ROOT / "assets" / "sunburst-base.wad"
TOOL_NAMES = ("hlcsg", "hlbsp", "hlvis", "hlrad")
SDHLT_URL = "https://github.com/seedee/SDHLT/releases/download/v1.2.0/sdhlt_v120.zip"
SDHLT_ARCHIVE_SHA256 = "F271D24C00BBD59F1E388FE71847CC078A12DAC56F8BD773BB48797B5F044D7A"
SDHLT_FILES = {
    "sdHLCSG_x64.exe": "8AFB5D2CF16CC1B248EC46D0ED566A27123A1710630D1CA764B85A15232F3537",
    "sdHLBSP_x64.exe": "3FB9B5FF493552F978E58784E660987EC1058CCB2464CE40CB8B9C5E9DFC2BAA",
    "sdHLVIS_x64.exe": "CB94BD9CC5F8EEAE6368B2B72A6723F182F87F5ECBCDF80B6F330E483F5B9477",
    "sdHLRAD_x64.exe": "769EA697B3E6C4003D4A50BE980EFA7716C7A7CC1B55E71FEE656AB349FFAFDB",
}
BUILD_PROFILES = {
    "draft": {"label": "Draft", "hlvis": ["-fast"], "hlrad": ["-fast"]},
    "playtest": {"label": "Playtest", "hlvis": [], "hlrad": []},
    "final": {"label": "Final", "hlvis": [], "hlrad": ["-extra"]},
}
SUNBURST_TEXTURE_NAMES = {
    "SUN_FELT", "SUN_KNIT", "SUN_RIBBON", "SUN_FACE", "SUN_WALL",
    "SUN_METAL", "SUN_TILE", "SUN_FLOOR", "SUN_CRATE", "SUN_SUPPLY",
}


def ensure_runtime_assets():
    """Create local mutable copies without committing user imports to source control."""
    if not MANIFEST_FILE.is_file() and BASE_MANIFEST_FILE.is_file():
        MANIFEST_FILE.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(str(BASE_MANIFEST_FILE), str(MANIFEST_FILE))
    if not CUSTOM_WAD_FILE.is_file() and BASE_CUSTOM_WAD_FILE.is_file():
        shutil.copyfile(str(BASE_CUSTOM_WAD_FILE), str(CUSTOM_WAD_FILE))


ensure_runtime_assets()


def asset_manifest_texture_names():
    try:
        source = MANIFEST_FILE if MANIFEST_FILE.is_file() else BASE_MANIFEST_FILE
        manifest = json.loads(source.read_text(encoding="utf-8"))
        return {
            str(item.get("name", "")).upper()
            for item in manifest.get("textures", [])
            if isinstance(item, dict) and item.get("name")
        }
    except (OSError, ValueError):
        return set()


CUSTOM_TEXTURE_NAMES = SUNBURST_TEXTURE_NAMES | asset_manifest_texture_names()
TEXTURE_CATEGORIES = {
    "architecture", "concrete", "brick", "stone", "ground", "nature",
    "organic", "fabric", "plaster", "floor", "metal", "wood",
}
TEXTURE_SURFACE_USES = {"wall", "floor", "tile", "ground", "ceiling", "props"}
OFFICIAL_MAPPING_WADS = (
    ("cstrike", "cstrike.wad"), ("cstrike", "ajawad.wad"), ("cstrike", "chateau.wad"),
    ("cstrike", "cs_747.wad"), ("cstrike", "cs_assault.wad"), ("cstrike", "cs_bdog.wad"),
    ("cstrike", "cs_cbble.wad"), ("cstrike", "cs_dust.wad"), ("cstrike", "cs_havana.wad"),
    ("cstrike", "cs_office.wad"), ("cstrike", "cstraining.wad"), ("cstrike", "de_airstrip.wad"),
    ("cstrike", "de_aztec.wad"), ("cstrike", "de_piranesi.wad"), ("cstrike", "de_storm.wad"),
    ("cstrike", "de_vertigo.wad"), ("cstrike", "itsitaly.wad"), ("cstrike", "n0th1ng.wad"),
    ("cstrike", "prodigy.wad"), ("cstrike", "torntextures.wad"), ("cstrike", "tswad.wad"),
    ("valve", "halflife.wad"), ("valve", "liquids.wad"), ("valve", "xeno.wad"),
)
OFFICIAL_WAD_CACHE = {}
OFFICIAL_WAD_CACHE_LOCK = threading.Lock()
TEXTURE_IMPORT_LOCK = threading.Lock()
COMPILER_SETUP_LOCK = threading.Lock()
BUILD_RUN_LOCK = threading.Lock()
BUILD_STATE_LOCK = threading.Lock()
BUILD_CANCEL_EVENT = threading.Event()
BUILD_PROCESS = None
BUILD_STATE = {
    "running": False,
    "stage": "idle",
    "stageLabel": "Idle",
    "profile": "",
    "mapName": "",
    "startedAt": 0,
    "elapsed": 0,
    "cancelRequested": False,
}


def read_config():
    try:
        value = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError):
        return {}


def write_config(config):
    CONFIG_FILE.write_text(json.dumps(config, indent=2), encoding="utf-8")


def sha256_bytes(value):
    return hashlib.sha256(value).hexdigest().upper()


def install_verified_compilers():
    """Install the pinned SDHLT release without trusting archive paths or filenames."""
    if not COMPILER_SETUP_LOCK.acquire(False):
        raise BuildError("The verified compiler installation is already running.")
    try:
        target_dir = ROOT / "tools"
        target_dir.mkdir(parents=True, exist_ok=True)
        already_valid = all(
            (target_dir / name).is_file()
            and sha256_bytes((target_dir / name).read_bytes()) == expected
            for name, expected in SDHLT_FILES.items()
        ) and (target_dir / "sdhlt.wad").is_file()
        if already_valid:
            config = read_config()
            config["compilerPath"] = str(target_dir)
            write_config(config)
            result = current_status()
            result["setupLog"] = "Verified SDHLT v1.2.0 was already installed."
            return result

        log = ["Downloading SDHLT v1.2.0 from its official GitHub release..."]
        request = urllib.request.Request(SDHLT_URL, headers={"User-Agent": "Blockout-CS16/{}".format(VERSION)})
        with urllib.request.urlopen(request, timeout=120) as response:
            archive_bytes = response.read(100_000_001)
        if len(archive_bytes) > 100_000_000:
            raise BuildError("The compiler download was unexpectedly large and was stopped.")
        archive_hash = sha256_bytes(archive_bytes)
        if archive_hash != SDHLT_ARCHIVE_SHA256:
            raise BuildError(
                "SDHLT download verification failed. Expected {} but received {}. Nothing was installed."
                .format(SDHLT_ARCHIVE_SHA256, archive_hash)
            )
        log.append("Archive signature verified.")

        staged = {}
        with tempfile.TemporaryDirectory(prefix="blockout-sdhlt-") as temporary:
            archive_path = Path(temporary) / "sdhlt.zip"
            archive_path.write_bytes(archive_bytes)
            with zipfile.ZipFile(str(archive_path)) as archive:
                members = {
                    Path(info.filename.replace("\\", "/")).name.lower(): info
                    for info in archive.infolist()
                    if not info.is_dir()
                }
                for filename, expected in SDHLT_FILES.items():
                    info = members.get(filename.lower())
                    if not info:
                        raise BuildError("The verified archive does not contain {}.".format(filename))
                    value = archive.read(info)
                    if sha256_bytes(value) != expected:
                        raise BuildError("{} failed executable verification. Nothing was installed.".format(filename))
                    staged[filename] = value
                wad_info = members.get("sdhlt.wad")
                if not wad_info:
                    raise BuildError("The verified archive does not contain sdhlt.wad.")
                staged["sdhlt.wad"] = archive.read(wad_info)

        for filename, value in staged.items():
            temporary_target = target_dir / (filename + ".installing")
            temporary_target.write_bytes(value)
            os.replace(str(temporary_target), str(target_dir / filename))
        config = read_config()
        config["compilerPath"] = str(target_dir)
        write_config(config)
        log.append("Installed and verified all four SDHLT x64 compiler tools.")
        result = current_status()
        result["setupLog"] = "\n".join(log)
        return result
    except (OSError, urllib.error.URLError, zipfile.BadZipFile) as error:
        raise BuildError("Verified compiler installation failed: {}".format(error))
    finally:
        COMPILER_SETUP_LOCK.release()


def texture_manifest():
    try:
        source = MANIFEST_FILE if MANIFEST_FILE.is_file() else BASE_MANIFEST_FILE
        value = json.loads(source.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) and isinstance(value.get("textures"), list) else {"pack": "Blockout materials", "textures": []}
    except (OSError, ValueError):
        return {"pack": "Blockout materials", "textures": []}


def official_wad_paths(game_path):
    """Return the fixed, redistributable-by-reference Steam WAD allowlist."""
    if not game_path:
        return {}
    result = {}
    for game_dir, filename in OFFICIAL_MAPPING_WADS:
        path = game_path / game_dir / filename
        if path.is_file():
            result["{}/{}".format(game_dir, filename)] = path
    return result


def classify_official_texture(name):
    text = name.lower()
    special = (
        text.startswith(("!", "*")) or "sky" in text
        or any(word in text for word in ("trigger", "clip", "origin", "hint", "skip", "null"))
    )
    if special:
        return "architecture", ["props"]
    if any(word in text for word in ("grass", "dirt", "sand", "gravel", "soil", "ground", "terrain")):
        return "ground", ["ground", "floor"]
    if any(word in text for word in ("floor", "tile", "pave", "road", "street", "cobble", "walkway")):
        return "floor", ["floor", "tile", "ground"]
    if any(word in text for word in ("ceiling", "ceil", "roof")):
        return "architecture", ["ceiling", "wall"]
    if any(word in text for word in ("brick", "block")):
        return "brick", ["wall", "floor"]
    if any(word in text for word in ("wood", "crate", "box", "door")):
        return "wood", ["props", "wall", "floor"]
    if any(word in text for word in ("metal", "steel", "rust", "pipe", "vent")):
        return "metal", ["props", "wall", "floor", "ceiling"]
    if any(word in text for word in ("rock", "stone", "marble")):
        return "stone", ["wall", "floor", "ground"]
    if any(word in text for word in ("concrete", "cement", "conc")):
        return "concrete", ["wall", "floor", "ceiling"]
    if any(word in text for word in ("plaster", "stucco")):
        return "plaster", ["wall", "ceiling"]
    if any(word in text for word in ("water", "slime", "lava", "tree", "leaf", "plant")):
        return "nature", ["ground", "props"]
    return "architecture", ["wall", "floor", "ceiling", "props"]


def parse_wad_directory(path):
    """Parse safe, uncompressed WAD3 miptex metadata without extracting assets."""
    try:
        stat = path.stat()
        signature = (str(path.resolve()), stat.st_mtime_ns, stat.st_size)
    except OSError as error:
        raise BuildError("Could not inspect {}: {}".format(path.name, error))
    with OFFICIAL_WAD_CACHE_LOCK:
        cached = OFFICIAL_WAD_CACHE.get(signature)
        if cached is not None:
            return cached
        for key in [key for key in OFFICIAL_WAD_CACHE if key[0] == signature[0] and key != signature]:
            OFFICIAL_WAD_CACHE.pop(key, None)
    entries = []
    try:
        with path.open("rb") as handle:
            header = handle.read(12)
            if len(header) != 12:
                raise BuildError("{} has an incomplete WAD header.".format(path.name))
            magic, count, directory_offset = struct.unpack("<4sii", header)
            if magic != b"WAD3" or count < 0 or count > 100_000:
                raise BuildError("{} is not a supported WAD3 texture library.".format(path.name))
            if directory_offset < 12 or directory_offset + count * 32 > stat.st_size:
                raise BuildError("{} has an invalid texture directory.".format(path.name))
            handle.seek(directory_offset)
            directory = handle.read(count * 32)
            for index in range(count):
                filepos, disksize, size, lump_type, compression, _, raw_name = struct.unpack_from(
                    "<iiiBBH16s", directory, index * 32
                )
                name = raw_name.split(b"\0", 1)[0].decode("latin-1", "ignore").strip().upper()
                if (
                    lump_type != 67 or compression != 0 or not name
                    or filepos < 0 or disksize < 40 or size < 40
                    or filepos + disksize > stat.st_size
                ):
                    continue
                handle.seek(filepos)
                mip_header = handle.read(40)
                if len(mip_header) != 40:
                    continue
                _, width, height, offset0, offset1, offset2, offset3 = struct.unpack("<16sII4I", mip_header)
                pixel_count = width * height
                if (
                    width < 1 or height < 1 or width > 2048 or height > 2048
                    or pixel_count > 4_194_304 or offset0 < 40
                    or not (offset0 < offset1 < offset2 < offset3 < disksize)
                ):
                    continue
                entries.append({
                    "name": name, "width": width, "height": height,
                    "filepos": filepos, "disksize": disksize,
                })
    except OSError as error:
        raise BuildError("Could not read {}: {}".format(path.name, error))
    with OFFICIAL_WAD_CACHE_LOCK:
        OFFICIAL_WAD_CACHE[signature] = entries
    return entries


def official_texture_catalog(game_path):
    wad_paths = official_wad_paths(game_path)
    textures = []
    wads = []
    seen = set()
    for wad_id, path in wad_paths.items():
        entries = parse_wad_directory(path)
        added = 0
        for entry in entries:
            if entry["name"] in seen:
                continue
            seen.add(entry["name"])
            category, uses = classify_official_texture(entry["name"])
            textures.append({
                "name": entry["name"],
                "label": entry["name"].replace("_", " ").title(),
                "category": category,
                "uses": uses,
                "source": "official-steam",
                "wadId": wad_id,
                "wad": path.name,
                "width": entry["width"],
                "height": entry["height"],
            })
            added += 1
        wads.append({"id": wad_id, "name": path.name, "textures": added})
    return {
        "pack": "Official Steam WADs",
        "textures": textures,
        "wads": wads,
        "wadCount": len(wads),
        "textureCount": len(textures),
        "localOnly": True,
    }


def png_chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def encode_indexed_png(width, height, pixels, palette, transparent=False):
    rgba_rows = bytearray()
    for y in range(height):
        rgba_rows.append(0)
        for value in pixels[y * width:(y + 1) * width]:
            offset = value * 3
            if offset + 2 < len(palette):
                rgba_rows.extend(palette[offset:offset + 3])
            else:
                rgba_rows.extend((255, 0, 255))
            rgba_rows.append(0 if transparent and value == 255 else 255)
    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", header)
        + png_chunk(b"IDAT", zlib.compress(bytes(rgba_rows), 6))
        + png_chunk(b"IEND", b"")
    )


def official_texture_png(game_path, wad_id, texture_name):
    path = official_wad_paths(game_path).get(wad_id)
    if not path:
        raise BuildError("That official WAD is not available in this Steam installation.")
    clean_name = str(texture_name).upper()[:15]
    entry = next((item for item in parse_wad_directory(path) if item["name"] == clean_name), None)
    if not entry:
        raise BuildError("That texture is not present in the selected official WAD.")
    try:
        with path.open("rb") as handle:
            handle.seek(entry["filepos"])
            lump = handle.read(entry["disksize"])
    except OSError as error:
        raise BuildError("Could not read the official texture: {}".format(error))
    _, width, height, offset0, _, _, _ = struct.unpack_from("<16sII4I", lump, 0)
    pixel_count = width * height
    pixels = lump[offset0:offset0 + pixel_count]
    palette_offset = offset0 + pixel_count + pixel_count // 4 + pixel_count // 16 + pixel_count // 64
    if len(pixels) != pixel_count or palette_offset + 2 > len(lump):
        raise BuildError("The official texture mip data is incomplete.")
    palette_count = struct.unpack_from("<H", lump, palette_offset)[0]
    palette_start = palette_offset + 2
    palette = lump[palette_start:palette_start + palette_count * 3]
    if palette_count < 1 or len(palette) != palette_count * 3:
        raise BuildError("The official texture palette is incomplete.")
    return encode_indexed_png(width, height, pixels, palette, clean_name.startswith("{"))


def node_runtime():
    candidates = []
    detected = shutil.which("node") or shutil.which("node.exe")
    if detected:
        candidates.append(Path(detected))
    runtime_root = Path.home() / ".cache" / "codex-runtimes"
    if runtime_root.is_dir():
        candidates.extend(runtime_root.glob("*/dependencies/node/bin/node.exe"))
    return next((path for path in candidates if path.is_file()), None)


def rebuild_texture_wad():
    node = node_runtime()
    if not node:
        raise BuildError("The texture importer needs Node.js, but no compatible local runtime was found.")
    environment = os.environ.copy()
    bundled_modules = node.parent.parent / "node_modules"
    if bundled_modules.is_dir():
        environment["NODE_PATH"] = str(bundled_modules)
    result = subprocess.run(
        [str(node), str(ROOT / "tools" / "build_sunburst_wad.js")],
        cwd=str(ROOT), stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        universal_newlines=True, errors="replace", timeout=180,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        env=environment,
    )
    if result.returncode != 0:
        raise BuildError("The GoldSrc texture pack could not be rebuilt.\n{}".format((result.stdout or "No builder output")[-4000:]))
    return result.stdout or "Texture pack rebuilt."


def normalize_texture_import(payload, family=""):
    raw_name = str(payload.get("name", "")).upper()
    clean_name = re.sub(r"[^A-Z0-9_]+", "_", raw_name).strip("_")
    if not clean_name.startswith("USR_"):
        clean_name = "USR_" + clean_name
    clean_name = clean_name[:15].rstrip("_")
    if len(clean_name) < 5:
        raise BuildError("Choose a texture code after the USR_ prefix.")
    label = re.sub(r"[\r\n\t]+", " ", str(payload.get("label", ""))).strip()[:48] or clean_name
    category = str(payload.get("category", "architecture")).lower()
    if category not in TEXTURE_CATEGORIES:
        raise BuildError("Choose a supported material category.")
    raw_uses = payload.get("uses", [])
    if not isinstance(raw_uses, list):
        raise BuildError("Texture surface uses must be a list.")
    uses = []
    for value in raw_uses:
        use = str(value).lower()
        if use not in TEXTURE_SURFACE_USES:
            raise BuildError("Choose only supported texture surface uses.")
        if use not in uses:
            uses.append(use)
    if not uses:
        raise BuildError("Choose at least one surface use for this texture.")
    image_value = str(payload.get("imageData", ""))
    if not image_value.startswith("data:image/png;base64,"):
        raise BuildError("The imported texture must be normalized to PNG first.")
    try:
        image_bytes = base64.b64decode(image_value.split(",", 1)[1], validate=True)
    except (ValueError, TypeError):
        raise BuildError("The imported PNG data is invalid.")
    if len(image_bytes) > 4_000_000 or len(image_bytes) < 24 or image_bytes[:8] != b"\x89PNG\r\n\x1a\n":
        raise BuildError("The normalized PNG is invalid or larger than 4 MB.")
    width, height = struct.unpack_from(">II", image_bytes, 16)
    if width != 256 or height != 256:
        raise BuildError("GoldSrc imports must be normalized to exactly 256 by 256 pixels.")
    variant = re.sub(r"[^a-z]+", "", str(payload.get("variant", "base")).lower())[:16] or "base"
    item = {
        "name": clean_name, "label": label, "category": category, "uses": uses,
        "file": clean_name + ".png", "author": "User import",
        "license": "User supplied", "source": "user",
        "createdAt": int(time.time()),
    }
    if family:
        item["alchemistFamily"] = family[:15]
        item["alchemistVariant"] = variant
    return clean_name, image_bytes, item


def install_texture_family(payloads, family=""):
    if not isinstance(payloads, list) or not 1 <= len(payloads) <= 4:
        raise BuildError("Texture Alchemist can install between one and four matching textures at once.")
    family_name = re.sub(r"[^A-Z0-9_]+", "_", str(family).upper()).strip("_")[:15]
    normalized = [normalize_texture_import(payload, family_name) for payload in payloads if isinstance(payload, dict)]
    if len(normalized) != len(payloads):
        raise BuildError("One of the Texture Alchemist outputs is invalid.")
    names = [entry[0] for entry in normalized]
    if len(set(names)) != len(names):
        raise BuildError("Texture family codes must be unique. Shorten the base GoldSrc code.")

    manifest_path = MANIFEST_FILE
    wad_path = CUSTOM_WAD_FILE
    with TEXTURE_IMPORT_LOCK:
        manifest = texture_manifest()
        existing = SUNBURST_TEXTURE_NAMES | {str(item.get("name", "")).upper() for item in manifest["textures"] if isinstance(item, dict)}
        for clean_name, _, _ in normalized:
            source_path = ROOT / "textures" / "sources" / (clean_name + ".png")
            if clean_name in existing or source_path.exists():
                raise BuildError("Texture code {} already exists. Choose another name.".format(clean_name))
        previous_manifest = manifest_path.read_bytes() if manifest_path.is_file() else None
        previous_wad = wad_path.read_bytes() if wad_path.is_file() else None
        source_paths = [ROOT / "textures" / "sources" / (clean_name + ".png") for clean_name in names]
        preview_paths = [ROOT / "textures" / "previews" / (clean_name + ".png") for clean_name in names]
        items = [entry[2] for entry in normalized]
        try:
            for source_path, (_, image_bytes, _) in zip(source_paths, normalized):
                source_path.write_bytes(image_bytes)
            manifest["textures"].extend(items)
            temporary_manifest = manifest_path.with_suffix(".json.tmp")
            temporary_manifest.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            os.replace(str(temporary_manifest), str(manifest_path))
            builder_log = rebuild_texture_wad()
            validate_custom_wad(wad_path)
        except Exception:
            for path in source_paths + preview_paths:
                if path.exists():
                    path.unlink()
            if previous_manifest is None:
                if manifest_path.exists():
                    manifest_path.unlink()
            else:
                manifest_path.write_bytes(previous_manifest)
            if previous_wad is None:
                if wad_path.exists():
                    wad_path.unlink()
            else:
                wad_path.write_bytes(previous_wad)
            raise
        CUSTOM_TEXTURE_NAMES.update(names)
        return {"ok": True, "textures": items, "previews": ["textures/previews/{}.png".format(name) for name in names], "log": builder_log.strip()}


def import_texture(payload):
    result = install_texture_family([payload])
    return {
        "ok": True,
        "texture": result["textures"][0],
        "preview": result["previews"][0],
        "log": result["log"],
    }


def alchemize_textures(payload):
    textures = payload.get("textures", []) if isinstance(payload, dict) else []
    return install_texture_family(textures, payload.get("family", ""))


def remove_texture(payload):
    clean_name = re.sub(r"[^A-Z0-9_]+", "_", str(payload.get("name", "")).upper()).strip("_")
    if not clean_name.startswith("USR_"):
        raise BuildError("Only user-imported USR_ textures can be deleted.")

    manifest_path = ROOT / "textures" / "asset-manifest.json"
    wad_path = ROOT / "sunburst.wad"
    with TEXTURE_IMPORT_LOCK:
        manifest = texture_manifest()
        item = next((entry for entry in manifest["textures"] if isinstance(entry, dict) and str(entry.get("name", "")).upper() == clean_name), None)
        if not item or item.get("source") != "user":
            raise BuildError("{} is not a deletable user-imported texture.".format(clean_name))

        source_path = ROOT / "textures" / "sources" / str(item.get("file") or (clean_name + ".png"))
        preview_path = ROOT / "textures" / "previews" / (clean_name + ".png")
        previous_manifest = manifest_path.read_bytes()
        previous_wad = wad_path.read_bytes() if wad_path.is_file() else None
        source_bytes = source_path.read_bytes() if source_path.is_file() else None
        preview_bytes = preview_path.read_bytes() if preview_path.is_file() else None
        try:
            manifest["textures"] = [entry for entry in manifest["textures"] if entry is not item]
            temporary_manifest = manifest_path.with_suffix(".json.tmp")
            temporary_manifest.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            os.replace(str(temporary_manifest), str(manifest_path))
            builder_log = rebuild_texture_wad()
            validate_custom_wad(wad_path)
            if source_path.exists():
                source_path.unlink()
            if preview_path.exists():
                preview_path.unlink()
        except Exception:
            manifest_path.write_bytes(previous_manifest)
            if previous_wad is None:
                if wad_path.exists():
                    wad_path.unlink()
            else:
                wad_path.write_bytes(previous_wad)
            if source_bytes is not None:
                source_path.write_bytes(source_bytes)
            if preview_bytes is not None:
                preview_path.write_bytes(preview_bytes)
            raise
        CUSTOM_TEXTURE_NAMES.discard(clean_name)
        return {"ok": True, "name": clean_name, "log": builder_log.strip()}


def steam_roots():
    roots = []
    try:
        import winreg

        for hive, key_name in (
            (winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam"),
            (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Valve\Steam"),
        ):
            try:
                with winreg.OpenKey(hive, key_name) as key:
                    roots.append(Path(winreg.QueryValueEx(key, "SteamPath")[0]))
            except OSError:
                pass
    except ImportError:
        pass

    roots.extend(
        Path(path)
        for path in (
            r"C:\Program Files (x86)\Steam",
            r"C:\Program Files\Steam",
            r"D:\Steam",
            r"E:\Steam",
            r"F:\Steam",
            r"G:\Steam",
        )
    )
    unique = []
    for root in roots:
        if root not in unique:
            unique.append(root)
    return unique


def game_is_valid(path):
    return bool(path and (path / "hl.exe").is_file() and (path / "cstrike").is_dir())


def detect_game_path(config):
    configured = Path(config.get("gamePath", "")) if config.get("gamePath") else None
    if configured and game_is_valid(configured):
        return configured
    for steam in steam_roots():
        candidate = steam / "steamapps" / "common" / "Half-Life"
        if game_is_valid(candidate):
            return candidate
    return configured


def tool_file(folder, base_name):
    if not folder or not folder.is_dir():
        return None
    try:
        files = {item.name.lower(): item for item in folder.iterdir() if item.is_file()}
    except OSError:
        return None
    sd_name = "sd" + base_name
    for name in (
        f"{base_name}.exe", f"{base_name}_x64.exe", f"{base_name}_x86.exe",
        f"{sd_name}.exe", f"{sd_name}_x64.exe", f"{sd_name}_x86.exe",
    ):
        if name in files:
            return files[name]
    return None


def compiler_tools(folder):
    return {name: tool_file(folder, name) for name in TOOL_NAMES}


def compiler_folder_is_valid(folder):
    return bool(folder and all(compiler_tools(folder).values()))


def detect_compiler_path(config, game_path):
    candidates = []
    if config.get("compilerPath"):
        candidates.append(Path(config["compilerPath"]))
    candidates.extend((ROOT / "tools", ROOT / "tools" / "vhlt", ROOT / "tools" / "zhlt"))
    if game_path:
        common = game_path.parent
        candidates.extend(
            (
                game_path,
                common / "Half-Life SDK" / "Hammer Editor" / "tools",
                common / "Half-Life SDK" / "tools",
            )
        )
    candidates.extend((Path(r"C:\Program Files\J.A.C.K\halflife"), Path(r"C:\Program Files (x86)\J.A.C.K\halflife")))
    for folder in candidates:
        if compiler_folder_is_valid(folder):
            return folder
    return Path(config["compilerPath"]) if config.get("compilerPath") else None


def current_status():
    config = read_config()
    game_path = detect_game_path(config)
    compiler_path = detect_compiler_path(config, game_path)
    tools = compiler_tools(compiler_path)
    stock_wads = {
        "cstrike": game_path / "cstrike" / "cstrike.wad" if game_path else None,
        "halflife": game_path / "valve" / "halflife.wad" if game_path else None,
    }
    maps_path = game_path / "cstrike" / "maps" if game_path else None
    install_parent = maps_path if maps_path and maps_path.is_dir() else (game_path / "cstrike" if game_path else None)
    official_wads = official_wad_paths(game_path)
    return {
        "connected": True,
        "version": VERSION,
        "gamePath": str(game_path) if game_path else "",
        "gameFound": game_is_valid(game_path),
        "compilerPath": str(compiler_path) if compiler_path else "",
        "compilersFound": all(tools.values()),
        "tools": {name: str(path) if path else "" for name, path in tools.items()},
        "missingTools": [name for name, path in tools.items() if not path],
        "wads": {name: str(path) if path and path.is_file() else "" for name, path in stock_wads.items()},
        "stockWadsFound": all(path and path.is_file() for path in stock_wads.values()),
        "missingWads": ["{}.wad".format(name) for name, path in stock_wads.items() if not path or not path.is_file()],
        "officialWadsFound": len(official_wads),
        "customWadFound": (ROOT / "sunburst.wad").is_file(),
        "textureImporterReady": node_runtime() is not None,
        "verifiedCompilerInstaller": True,
        "buildProfiles": [{"id": key, "label": value["label"]} for key, value in BUILD_PROFILES.items()],
        "mapsPath": str(maps_path) if maps_path else "",
        "mapsWritable": bool(install_parent and install_parent.is_dir() and os.access(str(install_parent), os.W_OK)),
    }


def replace_wad_paths(map_text, game_path, compiler_path=None):
    allowed = official_wad_paths(game_path)
    wad_paths = []
    for required in ("cstrike/cstrike.wad", "valve/halflife.wad"):
        if required in allowed:
            wad_paths.append(allowed[required])
    texture_to_wad = {}
    for wad_id, path in allowed.items():
        for entry in parse_wad_directory(path):
            texture_to_wad.setdefault(entry["name"], wad_id)
    face_names = {
        match.group(1).upper()[:15]
        for match in re.finditer(
            r"^\s*\([^)]*\)\s*\([^)]*\)\s*\([^)]*\)\s+([^\s]+)",
            map_text,
            flags=re.MULTILINE,
        )
    }
    requested_wads = {
        Path(value).name.lower()
        for match in re.finditer(r'^"wad"\s+"([^"]*)"$', map_text, flags=re.MULTILINE)
        for value in match.group(1).split(";")
        if value.strip()
    }
    needed_wad_ids = {texture_to_wad[name] for name in face_names if name in texture_to_wad}
    for wad_id, path in allowed.items():
        if wad_id in needed_wad_ids or path.name.lower() in requested_wads:
            wad_paths.append(path)
    if compiler_path:
        wad_paths.append(compiler_path / "sdhlt.wad")
    custom_wad = ROOT / "sunburst.wad"
    if custom_wad.is_file() and custom_texture_names_in_map(map_text):
        wad_paths.append(custom_wad)
    unique_paths = []
    seen_paths = set()
    for path in wad_paths:
        resolved = str(path.resolve()).lower() if path.is_file() else ""
        if resolved and resolved not in seen_paths:
            seen_paths.add(resolved)
            unique_paths.append(path)
    value = ";".join(str(path) for path in unique_paths)
    if not value:
        return map_text
    line = '"wad" "{}"'.format(value)
    return re.sub(r'^"wad"\s+"[^"]*"$', lambda _: line, map_text, count=1, flags=re.MULTILINE)


def custom_texture_names_in_map(map_text):
    """Return only custom miptex names actually referenced by this map source."""
    upper = map_text.upper()
    return {name for name in CUSTOM_TEXTURE_NAMES if re.search(r"\b{}\b".format(re.escape(name)), upper)}


def strip_embedded_wad_references(bsp_file, wad_names=("sunburst.wad", "sdhlt.wad")):
    """Remove compile-only WADs from a BSP's worldspawn after their textures were embedded."""
    data = bytearray(bsp_file.read_bytes())
    if len(data) < 124 or struct.unpack_from("<i", data, 0)[0] != 30:
        raise BuildError("The compiler produced an unsupported or damaged BSP file.")
    entity_offset, entity_length = struct.unpack_from("<ii", data, 4)
    if entity_offset < 0 or entity_length < 1 or entity_offset + entity_length > len(data):
        raise BuildError("The compiler produced a BSP with an invalid entity section.")

    entity_bytes = bytes(data[entity_offset:entity_offset + entity_length])
    entity_text = entity_bytes.split(b"\0", 1)[0].decode("latin-1")
    remove_names = {name.lower() for name in wad_names}

    def clean_wad_line(match):
        kept = []
        for value in match.group(1).split(";"):
            if not value.strip():
                continue
            if Path(value.strip()).name.lower() not in remove_names:
                kept.append(value)
        return '"wad" "{}"'.format(";".join(kept))

    cleaned = re.sub(r'^"wad"\s+"([^"]*)"$', clean_wad_line, entity_text, count=1, flags=re.MULTILINE)
    encoded = cleaned.encode("latin-1") + b"\0"
    if len(encoded) > entity_length:
        raise BuildError("The BSP runtime WAD cleanup exceeded its entity storage.")
    data[entity_offset:entity_offset + entity_length] = b"\0" * entity_length
    data[entity_offset:entity_offset + len(encoded)] = encoded
    struct.pack_into("<i", data, 8, len(encoded))
    bsp_file.write_bytes(data)


def validate_custom_wad(wad_file):
    """Reject malformed miptex records that compilers accept but GoldSrc cannot render."""
    data = wad_file.read_bytes()
    if len(data) < 12 or data[:4] != b"WAD3":
        raise BuildError("The custom texture pack is not a valid WAD3 file.")
    texture_count, directory_offset = struct.unpack_from("<ii", data, 4)
    if texture_count < 1 or directory_offset < 12 or directory_offset + texture_count * 32 > len(data):
        raise BuildError("The custom texture pack has an invalid directory.")

    for index in range(texture_count):
        entry = directory_offset + index * 32
        file_offset, disk_size, _, texture_type, compression, _, raw_name = struct.unpack_from("<iiiBBh16s", data, entry)
        texture_name = raw_name.split(b"\0", 1)[0].decode("ascii", "replace") or "unnamed"
        if texture_type != 0x43 or compression != 0 or file_offset % 4 or disk_size % 4:
            raise BuildError("Custom texture {} has an invalid GoldSrc miptexture layout.".format(texture_name))
        if file_offset < 12 or disk_size < 44 or file_offset + disk_size > directory_offset:
            raise BuildError("Custom texture {} points outside the WAD data section.".format(texture_name))
        width, height, mip0, mip1, mip2, mip3 = struct.unpack_from("<6I", data, file_offset + 16)
        if width < 16 or height < 16 or width & (width - 1) or height & (height - 1):
            raise BuildError("Custom texture {} must use power-of-two dimensions.".format(texture_name))
        expected_offsets = (40, 40 + width * height, 40 + width * height * 5 // 4, 40 + width * height * 21 // 16)
        if (mip0, mip1, mip2, mip3) != expected_offsets:
            raise BuildError("Custom texture {} has invalid mipmap offsets.".format(texture_name))
        palette_offset = file_offset + mip3 + width * height // 64
        if palette_offset + 772 > file_offset + disk_size or struct.unpack_from("<H", data, palette_offset)[0] != 256:
            raise BuildError("Custom texture {} has an invalid palette or missing alignment padding.".format(texture_name))


def validate_embedded_bsp_textures(bsp_file, required_names=CUSTOM_TEXTURE_NAMES):
    """Ensure custom mip pixels are inside the BSP instead of merely named in its texture lump."""
    data = bsp_file.read_bytes()
    if len(data) < 124 or struct.unpack_from("<i", data, 0)[0] != 30:
        raise BuildError("The compiler produced an unsupported or damaged BSP file.")
    texture_offset, texture_length = struct.unpack_from("<ii", data, 4 + 2 * 8)
    if texture_offset < 0 or texture_length < 8 or texture_offset + texture_length > len(data):
        raise BuildError("The compiled BSP has an invalid texture section.")
    lump = data[texture_offset:texture_offset + texture_length]
    texture_count = struct.unpack_from("<i", lump, 0)[0]
    if texture_count < 1 or 4 + texture_count * 4 > len(lump):
        raise BuildError("The compiled BSP has an invalid texture table.")

    embedded = set()
    for index in range(texture_count):
        mip_offset = struct.unpack_from("<i", lump, 4 + index * 4)[0]
        if mip_offset < 0 or mip_offset + 40 > len(lump):
            continue
        raw_name, width, height, mip0, mip1, mip2, mip3 = struct.unpack_from("<16s6I", lump, mip_offset)
        name = raw_name.split(b"\0", 1)[0].decode("ascii", "replace").upper()
        final_byte = mip_offset + mip3 + (width * height // 64) if width and height and mip3 else 0
        if mip0 and mip1 and mip2 and mip3 and final_byte <= len(lump):
            embedded.add(name)
    missing = sorted(set(required_names) - embedded)
    if missing:
        raise BuildError(
            "The build did not embed its custom texture pixels (missing: {}). "
            "Restart the Blockout companion and build again.".format(", ".join(missing))
        )


def build_status():
    with BUILD_STATE_LOCK:
        result = dict(BUILD_STATE)
    if result["running"] and result["startedAt"]:
        result["elapsed"] = max(0, round(time.time() - result["startedAt"], 1))
    return result


def set_build_state(**values):
    with BUILD_STATE_LOCK:
        BUILD_STATE.update(values)


def cancel_build():
    global BUILD_PROCESS
    if not build_status()["running"]:
        return {"ok": True, "cancelled": False, "message": "No build is running.", "build": build_status()}
    BUILD_CANCEL_EVENT.set()
    set_build_state(cancelRequested=True, stageLabel="Stopping compiler...")
    process = BUILD_PROCESS
    if process and process.poll() is None:
        try:
            process.terminate()
        except OSError:
            pass
    return {"ok": True, "cancelled": True, "message": "Build cancellation requested.", "build": build_status()}


def leak_points(base_file):
    points_file = base_file.with_suffix(".pts")
    if not points_file.is_file():
        return []
    points = []
    try:
        for line in points_file.read_text(encoding="utf-8", errors="replace").splitlines():
            values = re.findall(r"-?\d+(?:\.\d+)?", line)
            if len(values) >= 3:
                points.append({"x": float(values[0]), "y": float(values[1]), "z": float(values[2])})
                if len(points) >= 250:
                    break
    except OSError:
        return []
    return points


def compiler_diagnostics(log, stage="", base_file=None):
    lower = log.lower()
    diagnostics = []
    points = leak_points(base_file) if base_file else []
    if "leak" in lower:
        diagnostic = {
            "severity": "error", "stage": stage,
            "title": "Map leak",
            "message": "Playable space reaches the outside void. Focus the leak path, then close the gap with valid world brushes.",
        }
        if points:
            diagnostic["world"] = points[0]
            diagnostic["points"] = points
        diagnostics.append(diagnostic)
    coordinate_pattern = re.compile(
        r"(?:at|near|origin)?\s*\(?\s*(-?\d+(?:\.\d+)?)\s*[, ]+\s*(-?\d+(?:\.\d+)?)\s*[, ]+\s*(-?\d+(?:\.\d+)?)\s*\)?",
        re.IGNORECASE,
    )
    for line in log.splitlines():
        lowered = line.lower()
        if not any(word in lowered for word in ("error", "warning", "outside world", "coplanar", "degenerate")):
            continue
        match = coordinate_pattern.search(line)
        title = "Compiler error" if "error" in lowered else "Compiler warning"
        if "outside world" in lowered:
            title = "Brush outside world"
        elif "coplanar" in lowered:
            title = "Invalid coplanar brush"
        diagnostic = {
            "severity": "error" if ("error" in lowered or "outside world" in lowered or "coplanar" in lowered) else "warning",
            "stage": stage, "title": title, "message": line.strip()[:600],
        }
        if match:
            diagnostic["world"] = {"x": float(match.group(1)), "y": float(match.group(2)), "z": float(match.group(3))}
        if not any(item["title"] == diagnostic["title"] and item["message"] == diagnostic["message"] for item in diagnostics):
            diagnostics.append(diagnostic)
        if len(diagnostics) >= 12:
            break
    if not diagnostics:
        diagnostics.append({
            "severity": "error", "stage": stage, "title": "{} failed".format(stage.upper() or "Compiler"),
            "message": friendly_failure(log),
        })
    return diagnostics


def friendly_failure(log):
    lower = log.lower()
    if "leak" in lower:
        return "The map has a leak: the playable space is connected to the outside void. Check room connections and door placement."
    if "couldn't open" in lower and ".wad" in lower:
        return "A texture WAD could not be opened. Check the Counter-Strike folder and WAD paths."
    if "brush with coplanar faces" in lower or "outside world" in lower:
        return "Invalid brush geometry was detected. Resize or remove the room mentioned near the end of the log."
    if "exceeded" in lower or "max_" in lower:
        return "A GoldSrc engine limit was exceeded. Simplify the map and check the end of the compile log."
    return "A compiler stage failed. Review the final lines of the compile log."


def install_compiled_bsp(bsp_file, maps_dir, map_name):
    def is_locked(error):
        return isinstance(error, PermissionError) or getattr(error, "winerror", None) in (5, 32, 33) or getattr(error, "errno", None) in (13, 16, 32)

    installed_bsp = maps_dir / bsp_file.name
    try:
        shutil.copy2(str(bsp_file), str(installed_bsp))
        return installed_bsp, map_name, False
    except OSError as primary_error:
        if not is_locked(primary_error):
            raise
        for index in range(2, 1000):
            candidate = maps_dir / ("{}_preview_{}.bsp".format(map_name, index))
            if candidate.exists():
                continue
            try:
                shutil.copy2(str(bsp_file), str(candidate))
                return candidate, candidate.stem, True
            except OSError as fallback_error:
                if not is_locked(fallback_error):
                    raise
                raise primary_error
        raise primary_error


def _compile_map(payload):
    global BUILD_PROCESS
    status = current_status()
    if not status["gameFound"]:
        raise BuildError("Counter-Strike 1.6 was not found. Select the folder containing hl.exe.")
    if not status["compilersFound"]:
        missing = ", ".join(status["missingTools"])
        raise BuildError("GoldSrc compiler tools are missing: {}.".format(missing))

    raw_name = str(payload.get("mapName", ""))[:64].lower()
    map_name = re.sub(r"[^a-z0-9_-]+", "_", raw_name).strip("_")
    map_text = payload.get("mapText")
    if not map_name:
        raise BuildError("Choose a valid map name.")
    if not isinstance(map_text, str) or len(map_text) > 10_000_000 or '"classname" "worldspawn"' not in map_text:
        raise BuildError("The received map source is invalid or too large.")
    profile_name = str(payload.get("profile", "playtest")).lower()
    if profile_name not in BUILD_PROFILES:
        raise BuildError("Choose Draft, Playtest, or Final build quality.")
    profile = BUILD_PROFILES[profile_name]
    set_build_state(profile=profile_name, mapName=map_name)

    game_path = Path(status["gamePath"])
    custom_wad = ROOT / "sunburst.wad"
    custom_textures_used = custom_texture_names_in_map(map_text)
    if not status["stockWadsFound"]:
        raise BuildError(
            "Required stock texture WADs are missing: {}. Select the Half-Life folder that contains "
            "cstrike/cstrike.wad and valve/halflife.wad.".format(", ".join(status["missingWads"]))
        )
    if custom_textures_used and not custom_wad.is_file():
        raise BuildError(
            "This map uses custom textures ({}), but sunburst.wad is missing beside Blockout. "
            "Restore the texture pack or replace those materials before building."
            .format(", ".join(sorted(custom_textures_used)))
        )
    if custom_textures_used:
        validate_custom_wad(custom_wad)
    build_dir = BUILD_ROOT / map_name
    try:
        build_dir.mkdir(parents=True, exist_ok=True)
    except OSError as error:
        raise BuildError("The build workspace could not be created: {}".format(error))
    map_file = build_dir / (map_name + ".map")
    base_file = build_dir / map_name
    for extension in (".bsp", ".prt", ".pts", ".vis", ".lit", ".log", ".err", ".wa_", ".p0", ".p1", ".p2", ".p3"):
        stale_file = base_file.with_suffix(extension)
        if not stale_file.exists():
            continue
        try:
            stale_file.unlink()
        except OSError as error:
            raise BuildError(
                "A previous build output is locked: {}. Close the game or tool holding it, then retry."
                .format(stale_file)
            ) from error
    try:
        with map_file.open("w", encoding="utf-8", newline="\n") as stream:
            stream.write(replace_wad_paths(map_text, game_path, Path(status["compilerPath"])))
    except OSError as error:
        raise BuildError("The MAP source could not be written: {}".format(error))

    lines = [
        "BLOCKOUT BUILD",
        "Map: {}".format(map_name),
        "Game: {}".format(game_path),
        "Compilers: {}".format(status["compilerPath"]),
        "Profile: {}".format(profile["label"]),
        "",
    ]
    tools = {name: Path(path) for name, path in status["tools"].items()}
    stage_results = []
    for stage in TOOL_NAMES:
        if BUILD_CANCEL_EVENT.is_set():
            raise BuildError("Build cancelled before {}.".format(stage.upper()), "\n".join(lines))
        stage_started = time.time()
        set_build_state(stage=stage, stageLabel="Running {}...".format(stage.upper()))
        lines.append("=== {} ===".format(stage.upper()))
        command = [str(tools[stage])]
        custom_wad = ROOT / "sunburst.wad"
        if stage == "hlcsg" and custom_wad.is_file() and custom_textures_used:
            command.extend(["-wadinclude", str(custom_wad)])
        command.extend(profile.get(stage, []))
        command.append(str(base_file))
        try:
            BUILD_PROCESS = subprocess.Popen(
                command,
                cwd=str(build_dir),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                errors="replace",
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
            try:
                output, _ = BUILD_PROCESS.communicate(timeout=900)
            except subprocess.TimeoutExpired:
                BUILD_PROCESS.kill()
                BUILD_PROCESS.communicate()
                raise BuildError("{} timed out after 15 minutes.".format(stage.upper()), "\n".join(lines))
            return_code = BUILD_PROCESS.returncode
        except OSError as error:
            raise BuildError("Could not start {}: {}".format(stage, error), "\n".join(lines))
        finally:
            BUILD_PROCESS = None
        output = output or "(no output)"
        lines.append(output.rstrip())
        lines.append("")
        stage_results.append({
            "stage": stage, "label": stage.upper(), "seconds": round(time.time() - stage_started, 2),
            "ok": return_code == 0 and not BUILD_CANCEL_EVENT.is_set(),
        })
        if BUILD_CANCEL_EVENT.is_set():
            full_log = "\n".join(lines)
            raise BuildError("Build cancelled while running {}.".format(stage.upper()), full_log)
        if return_code != 0:
            full_log = "\n".join(lines)
            raise BuildError(
                "{}\n\n{}".format(friendly_failure(full_log), full_log[-7000:]),
                full_log,
                compiler_diagnostics(full_log, stage, base_file),
            )

    bsp_file = build_dir / (map_name + ".bsp")
    if not bsp_file.is_file():
        full_log = "\n".join(lines)
        raise BuildError("The compilers finished without producing a BSP file.\n\n{}".format(full_log[-5000:]), full_log)
    if custom_wad.is_file() and custom_textures_used:
        validate_embedded_bsp_textures(bsp_file, custom_textures_used)
    strip_embedded_wad_references(bsp_file)

    maps_dir = game_path / "cstrike" / "maps"
    maps_dir.mkdir(parents=True, exist_ok=True)
    try:
        installed_bsp, launch_map_name, used_fallback = install_compiled_bsp(bsp_file, maps_dir, map_name)
    except PermissionError:
        raise BuildError(
            "Compilation succeeded, but the Counter-Strike maps folder is not writable. "
            "Close CS 1.6 and restart Blockout, then try again. The compiled BSP is safe at {}."
            .format(bsp_file),
            "\n".join(lines),
        )
    except OSError as error:
        raise BuildError(
            "Compilation succeeded, but BSP installation failed: {}. The compiled BSP is safe at {}."
            .format(error, bsp_file),
            "\n".join(lines),
        )
    if used_fallback:
        lines.extend((
            "NOTE: The previous BSP is open in Counter-Strike and could not be replaced.",
            "Installed this build with the safe preview name: {}".format(launch_map_name),
        ))
    lines.extend(("BUILD COMPLETE", "Installed: {}".format(installed_bsp)))

    launched = False
    if bool(payload.get("launch")):
        subprocess.Popen(
            [str(game_path / "hl.exe"), "-game", "cstrike", "-dev", "-console", "+map", launch_map_name],
            cwd=str(game_path),
            creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
        )
        launched = True
        lines.append("Launching Counter-Strike 1.6…")

    return {
        "ok": True, "launched": launched, "mapName": launch_map_name, "bspPath": str(installed_bsp),
        "usedFallbackName": used_fallback, "profile": profile_name, "stages": stage_results,
        "diagnostics": [], "log": "\n".join(lines),
    }


def compile_map(payload):
    if not BUILD_RUN_LOCK.acquire(False):
        raise BuildError("A map build is already running. Wait for it to finish or cancel it.")
    BUILD_CANCEL_EVENT.clear()
    set_build_state(
        running=True, stage="prepare", stageLabel="Preparing map...", profile="", mapName="",
        startedAt=time.time(), elapsed=0, cancelRequested=False,
    )
    try:
        return _compile_map(payload)
    finally:
        BUILD_CANCEL_EVENT.clear()
        set_build_state(
            running=False, stage="idle", stageLabel="Idle", startedAt=0, elapsed=0,
            cancelRequested=False,
        )
        BUILD_RUN_LOCK.release()


class BuildError(Exception):
    def __init__(self, message, log="", diagnostics=None):
        super().__init__(message)
        self.log = log
        self.diagnostics = diagnostics or []


class BlockoutHandler(SimpleHTTPRequestHandler):
    server_version = "BlockoutCompanion/{}".format(VERSION)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format_string, *args):
        sys.stdout.write("[%s] %s\n" % (self.log_date_time_string(), format_string % args))

    def request_origin(self):
        return self.headers.get("Origin", "").rstrip("/")

    def is_known_origin(self):
        origin = self.request_origin()
        return not origin or origin in LOCAL_ORIGINS or origin in ONLINE_ORIGINS

    def is_online_request(self):
        return self.request_origin() in ONLINE_ORIGINS

    def request_pairing_secret(self):
        query = parse_qs(urlparse(self.path).query)
        value = self.headers.get("X-Blockout-Pairing") or query.get("pair", [""])[0]
        return str(value).replace("-", "").upper()

    def is_paired(self):
        if not self.is_online_request():
            return self.is_known_origin()
        return secrets.compare_digest(self.request_pairing_secret(), PAIRING_SECRET)

    def send_pairing_required(self):
        self.send_json(401, {
            "error": "Pairing required. Enter the code shown by Start Blockout.cmd.",
            "pairingRequired": True,
            "version": VERSION,
        })

    def end_headers(self):
        origin = self.request_origin()
        if origin in LOCAL_ORIGINS or origin in ONLINE_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Blockout-Pairing")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        if origin in ONLINE_ORIGINS and self.headers.get("Access-Control-Request-Private-Network", "").lower() == "true":
            self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, status_code, value):
        data = json.dumps(value).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def send_binary(self, status_code, data, content_type):
        self.send_response(status_code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        if not self.is_known_origin():
            self.send_response(403)
            self.end_headers()
            return
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if not self.is_known_origin():
            self.send_error(403)
            return
        if path == "/api/status":
            if not self.is_paired():
                self.send_pairing_required()
                return
            self.send_json(200, current_status())
            return
        if path == "/api/build/status":
            if not self.is_paired():
                self.send_pairing_required()
                return
            self.send_json(200, build_status())
            return
        if path == "/api/textures":
            if not self.is_paired():
                self.send_pairing_required()
                return
            self.send_json(200, {"textures": texture_manifest().get("textures", []), "importReady": node_runtime() is not None})
            return
        if path == "/api/official-textures":
            if not self.is_paired():
                self.send_pairing_required()
                return
            game_path = detect_game_path(read_config())
            if not game_is_valid(game_path):
                self.send_json(200, {"pack": "Official Steam WADs", "textures": [], "wads": [], "wadCount": 0, "textureCount": 0, "localOnly": True})
                return
            try:
                self.send_json(200, official_texture_catalog(game_path))
            except BuildError as error:
                self.send_json(400, {"error": str(error)})
            return
        if path == "/api/official-textures/preview":
            if not self.is_paired():
                self.send_pairing_required()
                return
            query = parse_qs(urlparse(self.path).query)
            wad_id = query.get("wad", [""])[0]
            texture_name = query.get("texture", [""])[0]
            game_path = detect_game_path(read_config())
            try:
                self.send_binary(200, official_texture_png(game_path, wad_id, texture_name), "image/png")
            except BuildError as error:
                self.send_json(404, {"error": str(error)})
            return
        if self.is_online_request() and path.startswith("/textures/previews/"):
            if not self.is_paired():
                self.send_pairing_required()
                return
            super().do_GET()
            return
        if self.is_online_request():
            self.send_error(404)
            return
        if path == "/builds" or path.startswith("/builds/") or path == "/blockout.config.json":
            self.send_error(404)
            return
        super().do_GET()

    def read_payload(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise BuildError("Invalid request length.")
        if length <= 0 or length > 12_000_000:
            raise BuildError("Request is empty or too large.")
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, ValueError):
            raise BuildError("Request body is not valid JSON.")

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            if not self.is_known_origin():
                self.send_json(403, {"error": "This website is not allowed to use the Blockout companion."})
                return
            payload = self.read_payload()
            if path == "/api/pair":
                if not self.is_online_request():
                    self.send_json(400, {"error": "Pairing is only used by the hosted Blockout editor."})
                    return
                supplied = str(payload.get("code", "")).replace("-", "").upper()
                if not secrets.compare_digest(supplied, PAIRING_SECRET):
                    self.send_json(403, {"error": "That pairing code is not correct. Read the current code from Start Blockout.cmd."})
                    return
                status = current_status()
                status["paired"] = True
                self.send_json(200, status)
                return
            if not self.is_paired():
                self.send_pairing_required()
                return
            if path == "/api/config":
                config = read_config()
                config["gamePath"] = str(payload.get("gamePath", "")).strip()
                config["compilerPath"] = str(payload.get("compilerPath", "")).strip()
                write_config(config)
                self.send_json(200, current_status())
                return
            if path == "/api/setup/compiler":
                self.send_json(200, install_verified_compilers())
                return
            if path == "/api/build":
                self.send_json(200, compile_map(payload))
                return
            if path == "/api/build/cancel":
                self.send_json(200, cancel_build())
                return
            if path == "/api/textures/import":
                self.send_json(200, import_texture(payload))
                return
            if path == "/api/textures/alchemize":
                self.send_json(200, alchemize_textures(payload))
                return
            if path == "/api/textures/remove":
                self.send_json(200, remove_texture(payload))
                return
            self.send_json(404, {"error": "Unknown API endpoint."})
        except BuildError as error:
            self.send_json(400, {"error": str(error), "log": error.log, "diagnostics": error.diagnostics})
        except Exception as error:
            self.send_json(500, {"error": "Unexpected companion error: {}".format(error)})


def open_editor():
    time.sleep(0.5)
    webbrowser.open("http://{}:{}/index.html".format(HOST, PORT))


def main():
    parser = argparse.ArgumentParser(description="Blockout local build companion")
    parser.add_argument("--check", action="store_true", help="Print detected configuration and exit")
    parser.add_argument("--no-browser", action="store_true", help="Do not open the editor automatically")
    args = parser.parse_args()
    if args.check:
        print(json.dumps(current_status(), indent=2))
        return 0

    try:
        server = ThreadingHTTPServer((HOST, PORT), BlockoutHandler)
    except OSError as error:
        print("Could not start Blockout on port {}: {}".format(PORT, error))
        print("If Blockout is already open, visit http://{}:{}/index.html".format(HOST, PORT))
        return 1

    print("Blockout companion {}".format(VERSION))
    print("Editor: http://{}:{}/index.html".format(HOST, PORT))
    print("Online pairing code: {}-{}".format(PAIRING_SECRET[:4], PAIRING_SECRET[4:]), flush=True)
    print("Enter this code only at {}.".format(next(iter(ONLINE_ORIGINS))))
    status = current_status()
    print("CS 1.6: {}".format(status["gamePath"] or "not found"))
    print("Compilers: {}".format(status["compilerPath"] or "not configured"))
    print("Keep this window open while building. Press Ctrl+C to stop.\n")
    if not args.no_browser:
        threading.Thread(target=open_editor, daemon=True).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Blockout companion.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
