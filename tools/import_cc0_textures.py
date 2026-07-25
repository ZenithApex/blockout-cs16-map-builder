"""Normalize downloaded CC0 artwork into the app's GoldSrc source folder."""

import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "textures" / "asset-manifest.json"
DOWNLOADS = ROOT / "textures" / "downloads"
SOURCES = ROOT / "textures" / "sources"


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    SOURCES.mkdir(parents=True, exist_ok=True)
    imported = []
    damaged = []
    for texture in manifest["textures"]:
        source = DOWNLOADS / texture["file"]
        if not source.is_file():
            damaged.append("{} (missing)".format(texture["file"]))
            continue
        try:
            with Image.open(source) as image:
                image = ImageOps.exif_transpose(image).convert("RGB")
                image.load()
                image.save(SOURCES / (texture["name"] + ".png"), optimize=True)
        except (OSError, ValueError) as error:
            damaged.append("{} ({})".format(texture["file"], error))
            continue
        imported.append(texture["name"])
    if damaged:
        raise RuntimeError("Damaged texture downloads:\n- " + "\n- ".join(damaged))
    print("Imported {} CC0 textures: {}".format(len(imported), ", ".join(imported)))


if __name__ == "__main__":
    main()
