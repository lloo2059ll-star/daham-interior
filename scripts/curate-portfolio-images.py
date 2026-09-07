import os
import sys
from pathlib import Path

from PIL import Image, ImageOps


SOURCE_ROOT = Path(os.environ["TEMP"]) / "daham-portfolio-review-20260908"
OUTPUT_ROOT = Path(__file__).resolve().parents[1] / "portfolio-assets" / "projects"

SELECTIONS = {
    "prugio-castle-a-32": {"cover": 22, "living-overview": 22, "living-kitchen": 26, "living-wall": 23, "kitchen-overview": 31, "kitchen-island": 35, "kitchen-cabinet": 39, "bathroom-main": 3, "bathroom-secondary": 45, "bedroom": 8, "dressing-room": 9, "hallway": 11, "stone-detail": 30},
    "geochang-prugio-34": {"cover": 5, "living-main": 5, "living-wide": 13, "kitchen-overview": 6, "kitchen-cabinet": 7, "bathroom-main": 12, "bathroom-tub": 14, "entry": 16, "bedroom": 3, "hallway": 10, "lighting-detail": 1},
    "bonggok-hyunjin-36": {"cover": 5, "living-main": 5, "living-kitchen": 1, "kitchen": 10, "bathroom-main": 2, "bathroom-secondary": 12, "entry": 14, "bedroom": 7, "room-storage": 8, "hallway": 6, "bathroom-detail": 3},
    "imeun-kolon-35": {"cover": 8, "living-storage": 8, "living-main": 6, "kitchen": 13, "bathroom-main": 1, "bathroom-secondary": 12, "entry-storage": 3, "bedroom": 4, "vanity": 11, "balcony": 9, "storage": 7},
    "songjeong-house-23": {"cover": 2, "living-kitchen": 2, "living-tv": 3, "kitchen": 11, "bathroom-main": 5, "bathroom-secondary": 8, "entry": 1, "storage": 10, "living-alt": 9},
    "okgye-epyeon-35": {"cover": 6, "whole-space": 6, "living": 2, "dining": 3, "kitchen-dining": 4, "kitchen": 5, "bedroom": 1, "vanity": 8},
    "songjeong-dongyang-42": {"cover": 3, "living": 3, "living-window": 2, "living-kitchen": 9, "kitchen": 6, "kitchen-close": 7, "hallway": 1, "storage-detail": 11},
    "daegu-sangin-hwasung": {"cover": 2, "living-main": 2, "living-alt": 7, "kitchen": 3, "kitchen-detail": 4, "kitchen-hall": 5, "bedroom-storage": 6, "bathroom": 8, "hallway": 1},
}


def convert_project(slug: str) -> None:
    sources = sorted((SOURCE_ROOT / slug).iterdir())
    output = OUTPUT_ROOT / slug
    for name, source_index in SELECTIONS[slug].items():
        image = ImageOps.exif_transpose(Image.open(sources[source_index - 1])).convert("RGB")
        image.thumbnail((2200, 2200), Image.Resampling.LANCZOS)
        image.save(output / f"{name}.webp", "WEBP", quality=86, method=3)
    print(f"{slug}: {len(SELECTIONS[slug]) - 1} photos")


if __name__ == "__main__":
    requested = sys.argv[1:] or list(SELECTIONS)
    for project_slug in requested:
        convert_project(project_slug)
