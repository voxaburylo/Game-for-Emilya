"""Turn the connected white backdrop of legacy shop renders transparent."""
import bpy
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = [
    ROOT / "models" / "thumbs" / "build-tree.png",
    ROOT / "models" / "thumbs" / "build-swing.png",
]

for path in FILES:
    image = bpy.data.images.load(str(path), check_existing=False)
    width, height = image.size
    pixels = list(image.pixels)
    seen = bytearray(width * height)
    queue = deque()
    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))
    while queue:
        x, y = queue.popleft()
        p = y * width + x
        if seen[p]:
            continue
        seen[p] = 1
        i = p * 4
        r, g, b = pixels[i : i + 3]
        # Include light antialiasing connected to the outer backdrop while
        # preserving isolated highlights inside the rendered object.
        if min(r, g, b) < 0.86 or max(r, g, b) - min(r, g, b) > 0.09:
            continue
        alpha = max(0.0, min(1.0, (0.96 - min(r, g, b)) / 0.10))
        pixels[i + 3] = alpha
        if x:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))
    image.pixels[:] = pixels
    image.filepath_raw = str(path)
    image.file_format = "PNG"
    image.alpha_mode = "STRAIGHT"
    image.save()
    print(f"TRANSPARENT: {path.name}")
