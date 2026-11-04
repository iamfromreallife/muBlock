"""Generate self-contained muBlock PNG icons with no third-party dependencies.

The geometry matches overlay/img/mu-logo.svg. Avoids external fonts, SVG
rasterizers and runtime network requests. Does not touch Lite's filter engine.
"""
from __future__ import annotations
import math
import struct
import zlib
from pathlib import Path

SIZE = 256

def segment_distance(x, y, a, b):
    vx, vy = b[0]-a[0], b[1]-a[1]
    t = max(0, min(1, ((x-a[0])*vx+(y-a[1])*vy)/(vx*vx+vy*vy+1e-9)))
    return math.hypot(x-a[0]-t*vx, y-a[1]-t*vy)

def bezier(p0, p1, p2, p3, t):
    s = 1-t
    return (s*s*s*p0[0]+3*s*s*t*p1[0]+3*s*t*t*p2[0]+t*t*t*p3[0],
            s*s*s*p0[1]+3*s*s*t*p1[1]+3*s*t*t*p2[1]+t*t*t*p3[1])

def make_path():
    segments = []
    for p0,p1,p2,p3 in (
        ((28,56),(28,43),(35,40),(43,40)),
        ((43,40),(51,40),(58,44),(58,57)),
        ((58,57),(58,45),(65,40),(74,40)),
        ((74,40),(86,40),(95,49),(95,62)),
    ):
        last=p0
        for i in range(1,19):
            now=bezier(p0,p1,p2,p3,i/18)
            segments.append((last,now))
            last=now
    segments.extend([
        ((28,56),(28,91)),((58,57),(58,91)),((95,62),(95,91)),
    ])
    return segments

PATH = make_path()

def rgba(x, y):
    # All geometry in a 128x128 reference grid.
    dx=max(abs(x-64)-59,0)
    dy=max(abs(y-64)-59,0)
    # rounded rectangle signed distance
    ox=max(abs(x-64)-(59-23),0)
    oy=max(abs(y-64)-(59-23),0)
    if math.hypot(ox,oy)>23:
        return (0,0,0,0)
    t=max(0,min(1,(x+y)/256))
    # rich violet to deep indigo
    red=int(156*(1-t)+35*t)
    green=int(61*(1-t)+21*t)
    blue=int(250*(1-t)+128*t)
    # subtle top-left reflective highlight
    shine=max(0,1-math.hypot((x-30)/125,(y-5)/110))
    red=min(255,int(red+27*shine))
    green=min(255,int(green+15*shine))
    blue=min(255,int(blue+3*shine))
    if min(segment_distance(x,y,a,b) for a,b in PATH)<7.6:
        red,green,blue=255,255,255
    # Leaf/shield accent; oblique filled ellipse
    cx,cy=x-79,y-76
    theta=-.44
    xr=cx*math.cos(theta)+cy*math.sin(theta)
    yr=-cx*math.sin(theta)+cy*math.cos(theta)
    if (xr/21)**2+(yr/10)**2<1 and 64<x<100 and y>62:
        red,green,blue=64,233,193
    return red,green,blue,255

def png_bytes(width,height, pixels):
    raw=b''.join(b'\0'+b''.join(bytes(pixel) for pixel in row) for row in pixels)
    def chunk(name,blob):
        return struct.pack('>I',len(blob))+name+blob+struct.pack('>I',zlib.crc32(name+blob)&0xffffffff)
    return (
        b'\x89PNG\r\n\x1a\n'
        +chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,6,0,0,0))
        +chunk(b'IDAT',zlib.compress(raw,9))
        +chunk(b'IEND',b'')
    )

def generate(folder: Path):
    folder.mkdir(parents=True,exist_ok=True)
    # Render once at 256px, downsample by a box filter to all required sizes.
    pixels=[[rgba((x+0.5)*128/SIZE,(y+0.5)*128/SIZE) for x in range(SIZE)] for y in range(SIZE)]
    for size in (16,32,48,64,128):
        data=[]
        for y in range(size):
            row=[]
            for x in range(size):
                x0,x1=round(x*SIZE/size),round((x+1)*SIZE/size)
                y0,y1=round(y*SIZE/size),round((y+1)*SIZE/size)
                values=[pixels[yy][xx] for yy in range(y0,y1) for xx in range(x0,x1)]
                row.append(tuple(round(sum(v[i] for v in values)/len(values)) for i in range(4)))
            data.append(row)
        (folder/f'mu-{size}.png').write_bytes(png_bytes(size,size,data))

if __name__=="__main__":
    import sys
    generate(Path(sys.argv[1] if len(sys.argv)>1 else 'img'))
