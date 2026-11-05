"""Generate sharp muBlock icons at 16–512 px from the definitive SVG.

CairoSVG and Pillow are build-only dependencies. The extension itself ships
only self-contained PNG and SVG assets, with no external fonts or network code.
Original Lite legacy filenames are overwritten too, preventing any code path
from presenting the old toolbar artwork.
"""
from __future__ import annotations
from pathlib import Path
from io import BytesIO
import re

import cairosvg
from PIL import Image

SIZES=(16,32,48,64,128,256,512)
TOOLBAR_SIZES=(16,32,64,128)

def muted_svg(svg: str) -> str:
    return (svg.replace('#96051e','#858b97')
        .replace('#ff5264','#d4d8df')
        .replace('#e5203b','#bbc1cb')
        .replace('#a90026','#9da4b0')
        .replace('stroke="#fff"','stroke="#fcfdff"')
        .replace('stop-opacity=".28"','stop-opacity=".14"'))

def small_svg(svg: str) -> str:
    # Clear counters and a thicker white m at the actual 16px icon size.
    svg=re.sub(r'<path d="M64 14 .*?/>','',svg)
    return svg.replace('stroke-width="12.4"','stroke-width="13.7"')

def raster(svg: str,size:int)->bytes:
    scale=4 if size<=128 else 2
    raw=cairosvg.svg2png(bytestring=svg.encode('utf-8'),
       output_width=size*scale,output_height=size*scale)
    image=Image.open(BytesIO(raw)).convert('RGBA')
    image=image.resize((size,size),Image.Resampling.LANCZOS)
    out=BytesIO()
    image.save(out,format='PNG',optimize=True)
    return out.getvalue()

def generate(folder:Path)->None:
    folder.mkdir(parents=True,exist_ok=True)
    svg=(Path(__file__).resolve().parents[1] / 'overlay/img/mu-logo.svg').read_text('utf-8')
    for size in SIZES:
        graphic=small_svg(svg) if size==16 else svg
        png=raster(graphic,size)
        (folder/f'mu-{size}.png').write_bytes(png)
        if size in (16,32,64,128,512):
            (folder/f'icon_{size}.png').write_bytes(png)
        if size in TOOLBAR_SIZES:
            (folder/f'mu-toolbar-{size}.png').write_bytes(png)
            disabled=raster(muted_svg(graphic),size)
            (folder/f'mu-toolbar-off-{size}.png').write_bytes(disabled)
            (folder/f'icon_{size}_off.png').write_bytes(disabled)

if __name__=='__main__':
    import sys
    generate(Path(sys.argv[1] if len(sys.argv)>1 else 'img'))
