"""Generate muBlock shield icons entirely offline using Python stdlib.

Full-color red shield with white lowercase m; disabled-toolbar icon is
desaturated and lighter, while the enabled icon retains the red identity.
"""
from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

SIZE = 384

OUTER = ((64,5),(51,12),(38,17),(26,20),(12,23),(12,63),(13,82),
         (26,105),(64,123),(102,105),(115,82),(116,63),(116,23),
         (102,19),(90,16),(77,11))
INNER = ((64,13),(52,19),(38,24),(20,29),(20,63),(24,81),(37,98),
         (64,115),(91,98),(104,81),(108,63),(108,29),(88,24),(75,18))
M_STROKE = ((36,81),(36,58),(38,49),(44,44),(50,44),
            (57,47),(63,56),(67,48),(75,44),
            (82,44),(90,48),(92,58),(92,81))

def polygon_contains(x, y, polygon):
    inside = False
    previous = polygon[-1]
    for point in polygon:
        (x1,y1),(x2,y2) = previous,point
        if (y1 > y) != (y2 > y):
            cross = (x2-x1)*(y-y1)/(y2-y1) + x1
            if x < cross:
                inside = not inside
        previous = point
    return inside

def dist_to_segment(x,y,a,b):
    vx,vy = b[0]-a[0],b[1]-a[1]
    amount = max(0,min(1,((x-a[0])*vx+(y-a[1])*vy)/(vx*vx+vy*vy+1e-12)))
    return math.hypot(x-(a[0]+vx*amount),y-(a[1]+vy*amount))

def pixel(x,y):
    if not polygon_contains(x,y,OUTER):
        return (0,0,0,0)
    color = (235,38,55,255) if polygon_contains(x,y,INNER) else (193,23,42,255)
    if any(dist_to_segment(x,y,M_STROKE[i],M_STROKE[i+1]) <= 6
           for i in range(len(M_STROKE)-1)):
        return (255,255,255,255)
    return color

def chunk(name, data):
    return (struct.pack('>I',len(data)) + name + data
            + struct.pack('>I',zlib.crc32(name+data)&0xffffffff))

def png(rows):
    height=len(rows)
    width=len(rows[0])
    packed=b''.join(b'\0'+b''.join(bytes(px) for px in row) for row in rows)
    return (b'\x89PNG\r\n\x1a\n'
        +chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,6,0,0,0))
        +chunk(b'IDAT',zlib.compress(packed,9))
        +chunk(b'IEND',b''))

def scaled(source, size):
    step=SIZE//size
    output=[]
    for y in range(size):
        row=[]
        for x in range(size):
            samples=(source[yy][xx] for yy in range(y*step,(y+1)*step)
                     for xx in range(x*step,(x+1)*step))
            vals=[0,0,0,0]
            for sample in samples:
                for i in range(4):
                    vals[i] += sample[i]
            row.append(tuple(round(v/(step*step)) for v in vals))
        output.append(row)
    return output

def muted(rows):
    result=[]
    for row in rows:
        line=[]
        for r,g,b,a in row:
            if a==0:
                line.append((0,0,0,0))
                continue
            gray=round(.299*r+.587*g+.114*b)
            base=round(min(255,gray*.95+34))
            line.append((base,base,base,a))
        result.append(line)
    return result

def generate(folder: Path):
    folder.mkdir(parents=True,exist_ok=True)
    source=[[pixel((x+.5)*128/SIZE,(y+.5)*128/SIZE)
             for x in range(SIZE)] for y in range(SIZE)]
    for size in (16,32,48,64,128):
        image=scaled(source,size)
        (folder/f'mu-{size}.png').write_bytes(png(image))
        if size!=48:
            (folder/f'mu-toolbar-{size}.png').write_bytes(png(image))
            (folder/f'mu-toolbar-off-{size}.png').write_bytes(png(muted(image)))

if __name__=='__main__':
    import sys
    generate(Path(sys.argv[1] if len(sys.argv)>1 else 'img'))
