"""Freeze the home logos' ASCII rock names as Afacad Flux 600 vector outlines.

Run manually with Python + fontTools after intentionally changing the snapshot/font.
No runtime font parser or network dependency is added to the frontend.
"""
import hashlib
import json
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parents[1]
font_path = ROOT / "src/assets/fonts/Afacad_Flux/AfacadFlux-VariableFont_slnt,wght.ttf"
names = json.loads((ROOT / "src/components/homeLogo/rockNames.snapshot.json").read_text(encoding="utf-8"))
font = instantiateVariableFont(TTFont(font_path), {"wght": 600, "slnt": 0}, inplace=False)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
words = {}
for name in names:
    text = name["rt_name"]
    # The fixed snapshot is plain Latin/ASCII; no complex-script shaping is needed.
    assert text.isascii(), text
    path_pen, bounds_pen = SVGPathPen(glyphs, ntos=lambda n: f"{n:.3f}".rstrip("0").rstrip(".") if n else "0"), BoundsPen(glyphs)
    advance = 0
    for character in text:
        glyph_name = cmap[ord(character)]
        glyph = glyphs[glyph_name]
        transform = (1, 0, 0, -1, advance, 0)
        glyph.draw(TransformPen(path_pen, transform))
        glyph.draw(TransformPen(bounds_pen, transform))
        advance += glyph.width
    assert bounds_pen.bounds
    words[str(name["rt_id"])] = {"name": text, "path": path_pen.getCommands(), "bounds": bounds_pen.bounds}
output = {"font_sha256": hashlib.sha256(font_path.read_bytes()).hexdigest(),
          "unitsPerEm": font["head"].unitsPerEm, "weight": 600, "words": words}
target = ROOT / "src/components/homeLogo/wordOutlines.snapshot.json"
target.write_text(json.dumps(output, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"{len(words)} vector words, {target.stat().st_size} bytes, unitsPerEm={output['unitsPerEm']}")